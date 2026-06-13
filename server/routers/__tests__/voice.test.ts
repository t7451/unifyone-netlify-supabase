import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("../../creditMeter", () => ({
  meterCredits: vi.fn().mockResolvedValue({
    success: true,
    balanceAfter: 100,
    overageCredits: 0,
    eventId: "evt1",
  }),
}));

import { voiceRouter } from "../voice";
import { transcribeAudio } from "../../_core/voiceTranscription";
import { meterCredits } from "../../creditMeter";

const buildCtx = (tenantId: number | null = 1) => ({
  user: {
    id: 1,
    email: "u@example.com",
    openId: "x",
    role: "user",
    tenantId,
  },
  req: { ip: "127.0.0.1", headers: {} },
  res: {} as any,
});

const okResponse = {
  task: "transcribe" as const,
  language: "en",
  duration: 3.2,
  text: "hello world",
  segments: [],
};

describe("voice.transcribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("meters credits and returns the transcription", async () => {
    (transcribeAudio as any).mockResolvedValue(okResponse);
    const caller = voiceRouter.createCaller(buildCtx() as any);

    const res = await caller.transcribe({
      audioUrl: "https://cdn.example.com/audio.mp3",
      language: "en",
    });

    expect(meterCredits).toHaveBeenCalledTimes(1);
    expect((meterCredits as any).mock.calls[0][0]).toMatchObject({
      source: "ai_completion",
      action: "voice.transcribe",
      amount: 1,
    });
    expect(transcribeAudio).toHaveBeenCalledWith({
      audioUrl: "https://cdn.example.com/audio.mp3",
      language: "en",
    });
    expect(res).toEqual(okResponse);
  });

  it("rejects with FORBIDDEN when out of credits and never transcribes", async () => {
    (meterCredits as any).mockResolvedValueOnce({
      success: false,
      balanceAfter: 0,
      overageCredits: 0,
      eventId: null,
    });
    const caller = voiceRouter.createCaller(buildCtx() as any);

    await expect(
      caller.transcribe({ audioUrl: "https://cdn.example.com/audio.mp3" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("maps client-side service errors to BAD_REQUEST", async () => {
    (transcribeAudio as any).mockResolvedValue({
      error: "Audio file exceeds maximum size limit",
      code: "FILE_TOO_LARGE",
    });
    const caller = voiceRouter.createCaller(buildCtx() as any);

    await expect(
      caller.transcribe({ audioUrl: "https://cdn.example.com/big.mp3" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps server-side service errors to INTERNAL_SERVER_ERROR", async () => {
    (transcribeAudio as any).mockResolvedValue({
      error: "Voice transcription service is not configured",
      code: "SERVICE_ERROR",
    });
    const caller = voiceRouter.createCaller(buildCtx() as any);

    await expect(
      caller.transcribe({ audioUrl: "https://cdn.example.com/audio.mp3" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejects invalid (non-URL) audioUrl via input validation", async () => {
    const caller = voiceRouter.createCaller(buildCtx() as any);
    await expect(
      caller.transcribe({ audioUrl: "not-a-url" })
    ).rejects.toThrow();
    expect(transcribeAudio).not.toHaveBeenCalled();
  });
});
