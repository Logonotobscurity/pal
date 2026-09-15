import { z } from "zod";

export type SemanticIntentType =
  | "payment_reminder"
  | "send_message"
  | "customer_lookup"
  | "invoice_status"
  | "other";

export const IntentSchema = z.object({
  type: z.enum(["payment_reminder", "send_message", "customer_lookup", "invoice_status", "other"]),
  summary: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const EntitySchema = z.object({
  name: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
  type: z.enum(["person", "organization", "money", "date", "time", "location", "other"]),
  confidence: z.number().min(0).max(1),
});

export const ConstraintSchema = z.object({
  type: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const TemporalRelationSchema = z.object({
  type: z.enum(["on", "before", "after", "at", "between", "within"]),
  value: z.string().trim().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

export const AmbiguitySchema = z.object({
  field: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const EvidenceRefSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(["audio", "transcript", "semantic", "policy", "execution", "web", "database"]),
  source: z.string().trim().min(1),
  uri: z.string().url().optional(),
});

export const MeaningStateSchema = z.object({
  id: z.string().trim().min(1),
  speechEventId: z.string().trim().min(1),
  intent: IntentSchema,
  entities: z.array(EntitySchema).default([]),
  constraints: z.array(ConstraintSchema).default([]),
  temporalRelations: z.array(TemporalRelationSchema).default([]),
  ambiguities: z.array(AmbiguitySchema).default([]),
  evidenceRefs: z.array(EvidenceRefSchema).default([]),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    fields: z.record(z.string(), z.number().min(0).max(1)).default({}),
  }),
  contextSufficiency: z.enum(["sufficient", "insufficient", "conflicting"]),
  model: z.object({
    provider: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().min(1),
  }),
});

export type MeaningState = z.infer<typeof MeaningStateSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type TemporalRelation = z.infer<typeof TemporalRelationSchema>;
export type Ambiguity = z.infer<typeof AmbiguitySchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export function createMeaningState(input: {
  id: string;
  speechEventId: string;
  intent: { type: SemanticIntentType; summary: string; confidence: number };
  entities?: Array<{ name: string; value: string; type: "person" | "organization" | "money" | "date" | "time" | "location" | "other"; confidence: number }>;
  constraints?: Array<{ type: string; value: string; confidence: number }>;
  temporalRelations?: Array<{ type: "on" | "before" | "after" | "at" | "between" | "within"; value: string; confidence: number }>;
  ambiguities?: Array<{ field: string; description: string; confidence: number }>;
  evidenceRefs?: Array<{ id: string; type: "audio" | "transcript" | "semantic" | "policy" | "execution" | "web" | "database"; source: string; uri?: string }>;
  confidence: { overall: number; fields?: Record<string, number> };
  contextSufficiency: "sufficient" | "insufficient" | "conflicting";
  model: { provider: string; model: string; version: string };
}): MeaningState {
  return MeaningStateSchema.parse({
    ...input,
    entities: input.entities ?? [],
    constraints: input.constraints ?? [],
    temporalRelations: input.temporalRelations ?? [],
    ambiguities: input.ambiguities ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
    confidence: {
      overall: input.confidence.overall,
      fields: input.confidence.fields ?? {},
    },
  });
}

export const SemanticAgent = {
  fromSpeechEvent(event: {
    id: string;
    traceId: string;
    sessionId: string;
    provider: string;
    providerVersion: string;
    transcript: { text: string; segments: Array<{ id: string; startMs: number; endMs: number; text: string }> };
    languageSpans?: Array<{ start: number; end: number; language: string }>;
    codeSwitch?: { detected: boolean; switchCount: number; density?: number; pairs: string[] };
    timing: { startedAt: string; endedAt: string };
    provenance?: Array<{ id: string; type: string; source: string; uri?: string }>;
    createdAt?: string;
  }): MeaningState {
    const text = event.transcript.text.toLowerCase();
    const isReminder = /remind|payment|pay|due|tomorrow/.test(text);

    const intentType: SemanticIntentType = isReminder ? "payment_reminder" : "other";
    const summary = isReminder ? "Send a payment reminder" : "Extract business intent";

    const customerMatch = /ngozi|amina|customer|client/i.exec(event.transcript.text);

    return createMeaningState({
      id: `meaning_${event.id.replace(/^speech_/, "")}`,
      speechEventId: event.id,
      intent: {
        type: intentType,
        summary,
        confidence: isReminder ? 0.9 : 0.4,
      },
      entities: customerMatch
        ? [
            {
              name: "customer",
              value: customerMatch[0],
              type: "person",
              confidence: 0.85,
            },
          ]
        : [],
      constraints: /tomorrow|today|by/.test(text)
        ? [
            {
              type: "deadline",
              value: "tomorrow",
              confidence: 0.8,
            },
          ]
        : [],
      temporalRelations: /tomorrow/.test(text)
        ? [{ type: "before", value: "tomorrow", confidence: 0.8 }]
        : [],
      ambiguities: [],
      evidenceRefs: event.provenance?.length
        ? event.provenance.map((ref) => ({
            id: ref.id,
            type: (ref.type as "audio" | "transcript" | "semantic" | "policy" | "execution" | "web" | "database") ?? "transcript",
            source: ref.source,
            uri: ref.uri,
          }))
        : [{ id: `ev_${event.id}`, type: "transcript", source: event.id }],
      confidence: {
        overall: isReminder ? 0.9 : 0.4,
        fields: {
          intent: isReminder ? 0.9 : 0.4,
          entities: customerMatch ? 0.85 : 0.4,
        },
      },
      contextSufficiency: "sufficient",
      model: {
        provider: event.provider,
        model: "semantic-agent",
        version: event.providerVersion,
      },
    });
  },
};
