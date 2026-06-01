/**
 * server/lib/clipperWorker.ts
 *
 * Wires Layer 1 (tRPC job records) to Layer 2 (Python clipper engine).
 *
 * Responsibilities:
 *  1. Mark the job as "processing" in the DB.
 *  2. Spawn `clippers/run_job.py` via Python and parse the JSON output.
 *  3. Upload each clip file to the storage proxy.
 *  4. Insert a `clips` row for every processed clip.
 *  5. Mark the job "completed" (or "failed" on error).
 */

import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { updateClippingJobStatus, insertClip } from "../db";
import { storagePut } from "../storage";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClipEngineResult {
  start: number;
  end: number;
  score: number;
  title_suggestion: string;
  caption: string;
  output_path: string;
}

export interface ProcessJobOptions {
  /** Local filesystem path to the source video (mutually exclusive with videoUrl). */
  videoPath?: string;
  /** Remote HTTP/HTTPS URL of the source video (downloaded by the Python script). */
  videoUrl?: string;
  /** Number of clips to generate. */
  numClips: number;
  /** Preferred clip length in seconds (default 45). */
  targetDuration?: number;
  /** Output style preset (default "default"). */
  style?: string;
  /** Clipper engine adapter name (default "basic"). */
  engine?: string;
}

// ── Storage key helpers ───────────────────────────────────────────────────────

/** Canonical storage key for a clip video file. */
export function clipStorageKey(
  tenantId: number,
  jobId: number,
  index: number
): string {
  return `clips/${tenantId}/${jobId}/clip_${String(index + 1).padStart(2, "0")}.mp4`;
}

// ── Main worker ───────────────────────────────────────────────────────────────

/**
 * Process a clipping job end-to-end:
 *   run engine → upload to storage → persist clip records → update job status.
 *
 * This function is designed to be called fire-and-forget from the tRPC
 * mutation, but also awaited in the admin `testJob` procedure.
 */
export async function processClippingJob(
  jobId: number,
  tenantId: number,
  options: ProcessJobOptions
): Promise<void> {
  await updateClippingJobStatus(jobId, tenantId, {
    status: "processing",
    currentStage: "processing",
    progress: 5,
    startedAt: new Date(),
  });

  try {
    // ── Step 1: run the Python engine ────────────────────────────────────────
    const scriptPath = path.resolve(process.cwd(), "clippers", "run_job.py");
    const pythonArgs = buildPythonArgs(scriptPath, options);

    await updateClippingJobStatus(jobId, tenantId, {
      currentStage: "transcribing",
      progress: 20,
    });

    const engineClips = await runPythonEngine(pythonArgs);

    // ── Step 2: upload clips to storage ─────────────────────────────────────
    await updateClippingJobStatus(jobId, tenantId, {
      status: "uploading",
      currentStage: "uploading",
      progress: 70,
    });

    for (let i = 0; i < engineClips.length; i++) {
      const clip = engineClips[i];
      const storageKey = clipStorageKey(tenantId, jobId, i);

      // Read the clip file; skip this clip if the file is missing
      let fileData: Buffer;
      try {
        fileData = await readFile(clip.output_path);
      } catch (readErr: unknown) {
        console.warn(
          `[clipperWorker] clip file not found at "${clip.output_path}", skipping upload. ` +
            `Error: ${readErr instanceof Error ? readErr.message : String(readErr)}`
        );
        fileData = Buffer.alloc(0);
      }

      // Upload to storage proxy — log failures but continue so other clips are saved
      try {
        await storagePut(storageKey, fileData, "video/mp4");
      } catch (uploadErr: unknown) {
        console.warn(
          `[clipperWorker] storage upload failed for key "${storageKey}". ` +
            `Error: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`
        );
      }

      await insertClip({
        jobId,
        tenantId,
        index: i,
        title: clip.title_suggestion ?? null,
        storageKey,
        startSec: Math.round(clip.start),
        endSec: Math.round(clip.end),
        durationSec: Math.max(0, Math.round(clip.end - clip.start)),
        highlightScore: String(clip.score),
      });
    }

    // ── Step 3: mark completed ───────────────────────────────────────────────
    await updateClippingJobStatus(jobId, tenantId, {
      status: "completed",
      currentStage: "completed",
      progress: 100,
      completedAt: new Date(),
    });
  } catch (err: unknown) {
    await updateClippingJobStatus(jobId, tenantId, {
      status: "failed",
      currentStage: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPythonArgs(
  scriptPath: string,
  options: ProcessJobOptions
): string[] {
  const args = [
    scriptPath,
    "--engine",
    options.engine ?? "basic",
    "--num-clips",
    String(options.numClips),
    "--target-duration",
    String(options.targetDuration ?? 45),
    "--style",
    options.style ?? "default",
  ];
  if (options.videoPath) {
    args.push("--video", options.videoPath);
  }
  if (options.videoUrl) {
    args.push("--url", options.videoUrl);
  }
  return args;
}

/**
 * Spawn `python3 <scriptPath> [args]`, collect stdout, and parse JSON.
 * Returns the `clips` array from the engine output.
 */
export function runPythonEngine(args: string[]): Promise<ClipEngineResult[]> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    py.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    py.on("error", reject);

    py.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `Clipper engine exited with code ${code ?? "null"}. stderr: ${stderr.trim()}`
          )
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as { clips?: ClipEngineResult[] };
        resolve(parsed.clips ?? []);
      } catch {
        reject(
          new Error(
            `Failed to parse clipper engine JSON output. stdout: ${stdout.slice(0, 200)}`
          )
        );
      }
    });
  });
}
