import { z } from "zod";

export const TranscriptSegmentSchema = z.object({
  id: z.string().trim().min(1, { message: "Segment id is required" }),
  startMs: z.number().int().nonnegative({ message: "Segment start must be a non-negative integer" }),
  endMs: z.number().int().nonnegative({ message: "Segment end must be a non-negative integer" }),
  text: z
    .string()
    .trim()
    .min(1, { message: "Transcript segment text is required" })
    .max(2000, { message: "Transcript segment text must be at most 2000 characters" }),
});

export const LanguageSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  language: z.string().trim().min(2).max(12),
});

export const EvidenceRefSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(["audio", "transcript", "semantic", "policy", "execution"]),
  source: z.string().trim().min(1),
  uri: z.string().url().optional(),
});

export const SpeechEventCodeSwitchSchema = z.object({
  detected: z.boolean(),
  switchCount: z.number().int().nonnegative(),
  density: z.number().min(0).max(1).optional(),
  pairs: z.array(z.string().trim().min(1)).default([]),
});

export const SpeechEventSchema = z.object({
  id: z.string().trim().min(1, { message: "Speech event id is required" }),
  traceId: z.string().trim().min(1, { message: "Trace id is required" }),
  sessionId: z.string().trim().min(1, { message: "Session id is required" }),
  provider: z.enum(["sahara", "assemblyai", "whisper", "other"]),
  providerVersion: z.string().trim().min(1),
  transcript: z.object({
    text: z.string().trim().min(1).max(20000),
    segments: z.array(TranscriptSegmentSchema).min(1),
  }),
  languageSpans: z.array(LanguageSpanSchema).default([]),
  codeSwitch: SpeechEventCodeSwitchSchema,
  timing: z.object({
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
  }),
  provenance: z.array(EvidenceRefSchema).default([]),
  createdAt: z.string().datetime().optional(),
});

export type SpeechEvent = z.infer<typeof SpeechEventSchema>;
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type LanguageSpan = z.infer<typeof LanguageSpanSchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export function createSpeechEvent(input: {
  id: string;
  traceId: string;
  sessionId: string;
  provider: "sahara" | "assemblyai" | "whisper" | "other";
  providerVersion: string;
  transcript: { text: string; segments: Array<{ id: string; startMs: number; endMs: number; text: string }> };
  languageSpans?: Array<{ start: number; end: number; language: string }> | undefined;
  codeSwitch: {
    detected: boolean;
    switchCount: number;
    density?: number | undefined;
    pairs: string[];
  };
  timing: { startedAt: string; endedAt: string };
  provenance?: Array<{ id: string; type: "audio" | "transcript" | "semantic" | "policy" | "execution"; source: string; uri?: string | undefined }> | undefined;
  createdAt?: string | undefined;
}): SpeechEvent {
  return SpeechEventSchema.parse({
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
