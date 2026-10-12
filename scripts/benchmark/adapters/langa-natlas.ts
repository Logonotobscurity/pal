import { z } from "zod";

export const NAtlasLanguageSchema = z.enum(["yo", "ha", "ig", "en"]);
export type NAtlasLanguage = z.infer<typeof NAtlasLanguageSchema>;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const DEFAULT_BASE_URL = "https://langa.julimer.com/v1";

const TranscriptionResponseSchema = z.object({
  text: z.string().trim().min(1),
});

export type NAtlasTranscription = {
  text: string;
  language: NAtlasLanguage;
  provider: "langa-n-atlas";
  model: "n-atlas";
};

export class NAtlasProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NAtlasProviderError";
  }
}

/**
 * Benchmark-only adapter for the Langa-hosted N-ATLaS ASR endpoint.
 *
 * Language must be supplied explicitly; this adapter intentionally does not
 * guess language from the audio. The API key is read only from the server
 * environment and is never returned in an error or result.
 */
export async function transcribeWithNAtlas(
  audio: Blob,
  filename: string,
  language: NAtlasLanguage,
): Promise<NAtlasTranscription> {
  const apiKey = process.env.LANGA_NATLAS_API_KEY?.trim();
  if (!apiKey) {
    throw new NAtlasProviderError("LANGA_NATLAS_API_KEY is not configured.");
  }
  if (audio.size === 0) {
    throw new NAtlasProviderError("Audio input is empty.");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    throw new NAtlasProviderError("Audio input exceeds the 25 MB provider limit.");
  }

  const baseUrl = (process.env.LANGA_NATLAS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const form = new FormData();
  form.append("file", audio, filename || "benchmark-audio.wav");
  form.append("language", language);
  form.append("response_format", "json");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new NAtlasProviderError("Could not reach the Langa N-ATLaS transcription endpoint.");
  }

  if (!response.ok) {
    throw new NAtlasProviderError(
      "Langa N-ATLaS transcription request failed.",
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new NAtlasProviderError("Langa N-ATLaS returned invalid JSON.");
  }

  const parsed = TranscriptionResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new NAtlasProviderError("Langa N-ATLaS response did not contain a usable transcript.");
  }

  return {
    text: parsed.data.text,
    language,
    provider: "langa-n-atlas",
    model: "n-atlas",
  };
}
