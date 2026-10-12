import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NAtlasProviderError,
  transcribeWithNAtlas,
} from "../../scripts/benchmark/adapters/langa-natlas";

describe("transcribeWithNAtlas", () => {
  const originalKey = process.env.LANGA_NATLAS_API_KEY;
  const originalBaseUrl = process.env.LANGA_NATLAS_BASE_URL;
  const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" });

  beforeEach(() => {
    process.env.LANGA_NATLAS_API_KEY = "test-key";
    delete process.env.LANGA_NATLAS_BASE_URL;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.LANGA_NATLAS_API_KEY;
    else process.env.LANGA_NATLAS_API_KEY = originalKey;

    if (originalBaseUrl === undefined) delete process.env.LANGA_NATLAS_BASE_URL;
    else process.env.LANGA_NATLAS_BASE_URL = originalBaseUrl;

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends explicit language and server-side bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "Ẹ káàárọ̀" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeWithNAtlas(audio, "sample.wav", "yo");

    expect(result).toEqual({
      text: "Ẹ káàárọ̀",
      language: "yo",
      provider: "langa-n-atlas",
      model: "n-atlas",
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://langa.julimer.com/v1/audio/transcriptions");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-key");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("language")).toBe("yo");
  });

  it("fails closed when the API key is missing", async () => {
    delete process.env.LANGA_NATLAS_API_KEY;
    await expect(transcribeWithNAtlas(audio, "sample.wav", "en")).rejects.toThrow(
      "LANGA_NATLAS_API_KEY is not configured.",
    );
  });

  it("rejects empty audio before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      transcribeWithNAtlas(new Blob([]), "empty.wav", "en"),
    ).rejects.toThrow("Audio input is empty.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces provider status without exposing response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("sensitive provider body", { status: 429 })),
    );

    try {
      await transcribeWithNAtlas(audio, "sample.wav", "ha");
      throw new Error("Expected provider error.");
    } catch (error) {
      expect(error).toBeInstanceOf(NAtlasProviderError);
      expect((error as NAtlasProviderError).status).toBe(429);
      expect((error as Error).message).not.toContain("sensitive provider body");
    }
  });

  it("rejects a successful response without transcript text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ text: "" }), { status: 200 }),
      ),
    );

    await expect(transcribeWithNAtlas(audio, "sample.wav", "ig")).rejects.toThrow(
      "did not contain a usable transcript",
    );
  });
});
