/**
 * Tests for deployNotifier.ts. We construct fake Deps so we can assert on:
 *
 *   - shared-secret token verification (constant-time compare, length check)
 *   - state: ready (no prior failure) → noop
 *   - state: error → alert email + state-tracking blob written
 *   - state: ready after prior failure → recovery email + blob cleared
 *   - persistence is idempotent on deploy_id (duplicate → action: "duplicate")
 *   - subject + body include the commit ref / site name / error message
 */
import { describe, expect, it, vi } from "vitest";
import {
  handleDeployEvent,
  verifyToken,
  type Deps,
  type DeployEventPayload,
  type ReceiverConfig,
} from "./deployNotifier";

function makeDeps(overrides: Partial<Deps> = {}): {
  deps: Deps;
  state: {
    inserted: Map<string, unknown>;
    emails: Array<{ to: string; subject: string; html: string; text: string }>;
    blobs: Map<string, unknown>;
  };
} {
  const inserted = new Map<string, unknown>();
  const emails: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
  }> = [];
  const blobs = new Map<string, unknown>();

  const baseDeps: Deps = {
    insertEvent: async row => {
      if (inserted.has(row.deployId)) return { inserted: false };
      inserted.set(row.deployId, row);
      return { inserted: true };
    },
    sendEmail: async msg => {
      emails.push(msg);
      return { ok: true };
    },
    blobStore: {
      get: async key => blobs.get(key) ?? null,
      setJSON: async (key, value) => {
        blobs.set(key, value);
      },
      delete: async key => {
        blobs.delete(key);
      },
    },
    now: () => new Date("2026-05-03T12:00:00Z"),
    ...overrides,
  };

  return { deps: baseDeps, state: { inserted, emails, blobs } };
}

const cfg: ReceiverConfig = {
  expectedToken: "shhh",
  alertEmail: "keith@1commerce.online",
  defaultSiteName: "unify0ne",
};

const baseEvt = (
  overrides: Partial<DeployEventPayload> = {}
): DeployEventPayload => ({
  id: "dpl_abc123",
  site_id: "site_001",
  name: "unify0ne",
  state: "ready",
  branch: "main",
  commit_ref: "deadbeef0011",
  error_message: null,
  deploy_url: "https://1commerce.online",
  log_url: "https://app.netlify.com/sites/unify0ne/deploys/dpl_abc123",
  admin_url: "https://app.netlify.com/sites/unify0ne",
  deploy_time: 32,
  ...overrides,
});

describe("verifyToken", () => {
  it("rejects missing or empty headers", () => {
    expect(verifyToken(null, "secret")).toBe(false);
    expect(verifyToken("", "secret")).toBe(false);
  });
  it("rejects mismatched length", () => {
    expect(verifyToken("secre", "secret")).toBe(false);
    expect(verifyToken("secrets!", "secret")).toBe(false);
  });
  it("accepts the expected token", () => {
    expect(verifyToken("hunter2hunter2", "hunter2hunter2")).toBe(true);
  });
  it("rejects close-but-wrong tokens of equal length", () => {
    expect(verifyToken("hunter2hunter3", "hunter2hunter2")).toBe(false);
  });
  it("rejects when expected is empty", () => {
    expect(verifyToken("anything", "")).toBe(false);
  });
});

describe("handleDeployEvent — ready, no prior failure", () => {
  it("noops, persists the event, sends no email", async () => {
    const { deps, state } = makeDeps();
    const r = await handleDeployEvent(baseEvt({ state: "ready" }), cfg, deps);
    expect(r.action).toBe("noop");
    expect(r.status).toBe(200);
    expect(state.emails).toHaveLength(0);
    expect(state.inserted.has("dpl_abc123")).toBe(true);
    expect(state.blobs.size).toBe(0);
  });
});

describe("handleDeployEvent — error", () => {
  it("sends a failure email with the right subject/body and writes the state blob", async () => {
    const { deps, state } = makeDeps();
    const evt = baseEvt({
      state: "error",
      error_message: "Build failed: chromium plugin",
      commit_ref: "abc12345def6",
    });
    const r = await handleDeployEvent(evt, cfg, deps);
    expect(r.action).toBe("alerted");
    expect(state.emails).toHaveLength(1);
    const email = state.emails[0];
    expect(email.to).toBe("keith@1commerce.online");
    expect(email.subject).toMatch(/FAILED/);
    expect(email.subject).toMatch(/abc12345def6/);
    expect(email.subject).toMatch(/unify0ne/);
    expect(email.html).toMatch(/Build failed: chromium plugin/);
    expect(email.text).toMatch(/Build failed: chromium plugin/);
    // failure-state blob written
    expect(state.blobs.has("last-failed-deploy:site_001")).toBe(true);
    const blob = state.blobs.get("last-failed-deploy:site_001") as {
      deployId: string;
    };
    expect(blob.deployId).toBe("dpl_abc123");
  });

  it("treats 'failed', 'timeout', 'broken', 'rejected' the same as 'error'", async () => {
    for (const state of ["failed", "timeout", "broken", "rejected"]) {
      const { deps, state: s } = makeDeps();
      const r = await handleDeployEvent(
        baseEvt({ id: `dpl_${state}`, state }),
        cfg,
        deps
      );
      expect(r.action, `state=${state}`).toBe("alerted");
      expect(s.emails).toHaveLength(1);
    }
  });
});

describe("handleDeployEvent — ready after prior failure", () => {
  it("sends a recovery email and clears the failure blob", async () => {
    const { deps, state } = makeDeps();

    // First, a failure
    await handleDeployEvent(
      baseEvt({ id: "dpl_fail", state: "error", error_message: "x" }),
      cfg,
      deps
    );
    expect(state.blobs.has("last-failed-deploy:site_001")).toBe(true);
    expect(state.emails).toHaveLength(1);

    // Then, a successful deploy
    const r = await handleDeployEvent(
      baseEvt({ id: "dpl_recovered", state: "ready" }),
      cfg,
      deps
    );
    expect(r.action).toBe("recovered");
    expect(state.emails).toHaveLength(2);
    const recoveryEmail = state.emails[1];
    expect(recoveryEmail.subject).toMatch(/RECOVERED/);
    expect(recoveryEmail.html).toMatch(/RECOVERED/);
    expect(state.blobs.has("last-failed-deploy:site_001")).toBe(false);
  });
});

describe("handleDeployEvent — persistence", () => {
  it("persists every event to deploy_events", async () => {
    const { deps, state } = makeDeps();
    await handleDeployEvent(baseEvt({ id: "a", state: "building" }), cfg, deps);
    await handleDeployEvent(baseEvt({ id: "b", state: "ready" }), cfg, deps);
    await handleDeployEvent(baseEvt({ id: "c", state: "error" }), cfg, deps);
    expect(state.inserted.size).toBe(3);
    expect(state.inserted.has("a")).toBe(true);
    expect(state.inserted.has("b")).toBe(true);
    expect(state.inserted.has("c")).toBe(true);
  });

  it("idempotent: same deploy_id POSTed twice does not double-send", async () => {
    const { deps, state } = makeDeps();
    const evt = baseEvt({ state: "error" });
    const r1 = await handleDeployEvent(evt, cfg, deps);
    const r2 = await handleDeployEvent(evt, cfg, deps);
    expect(r1.action).toBe("alerted");
    expect(r2.action).toBe("duplicate");
    expect(state.emails).toHaveLength(1);
  });
});

describe("handleDeployEvent — email send failure surfaces in result", () => {
  it("returns ok=false when Resend rejects but still persists + sets blob", async () => {
    const { deps, state } = makeDeps({
      sendEmail: async () => ({ ok: false, error: "Resend HTTP 500" }),
    });
    const r = await handleDeployEvent(baseEvt({ state: "error" }), cfg, deps);
    expect(r.ok).toBe(false);
    expect(r.action).toBe("alerted");
    expect((r.body as { emailError?: string }).emailError).toMatch(
      /Resend HTTP 500/
    );
    expect(state.inserted.has("dpl_abc123")).toBe(true);
    expect(state.blobs.has("last-failed-deploy:site_001")).toBe(true);
  });
});

describe("handleDeployEvent — escapes HTML in email body", () => {
  it("does not let a malicious error_message inject HTML", async () => {
    const { deps, state } = makeDeps();
    const evt = baseEvt({
      state: "error",
      error_message: "<script>alert('x')</script>",
    });
    await handleDeployEvent(evt, cfg, deps);
    const email = state.emails[0];
    expect(email.html).not.toMatch(/<script>/);
    expect(email.html).toMatch(/&lt;script&gt;/);
  });
});
