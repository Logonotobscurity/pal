/**
 * OpenAI LLM Provider — Semantic extraction and structured output
 * 
 * Implements PAL_ARCHITECTURE.md §19: Semantic Agent with LLM-based meaning extraction.
 * Uses OpenAI's structured outputs (JSON mode) for type-safe semantic analysis.
 */

import "server-only";
import OpenAI from "openai";
import type { SemanticIntentType } from "@/core/schemas/meaning-state";

export type LLMProvider = "openai" | "anthropic" | "other";

export type LLMConfig = {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export type SemanticExtractionInput = {
  transcript: string;
  segments: Array<{ id: string; startMs: number; endMs: number; text: string }>;
  languageSpans?: Array<{ start: number; end: number; language: string }>;
  codeSwitch?: { detected: boolean; switchCount: number; density?: number; pairs: string[] };
  conversationMemory?: string[];
  businessContext?: string;
};

export type SemanticExtractionOutput = {
  intent: {
    type: SemanticIntentType;
    summary: string;
    confidence: number;
  };
  entities: Array<{
    name: string;
    value: string;
    type: "person" | "organization" | "money" | "date" | "time" | "location" | "other";
    confidence: number;
  }>;
  constraints: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  temporalRelations: Array<{
    type: "on" | "before" | "after" | "at" | "between" | "within";
    value: string;
    confidence: number;
  }>;
  ambiguities: Array<{
    field: string;
    description: string;
    confidence: number;
  }>;
  contextSufficiency: "sufficient" | "insufficient" | "conflicting";
  overallConfidence: number;
  fieldConfidence: Record<string, number>;
};

/**
 * OpenAI-based semantic extractor
 * Uses GPT-4 with structured outputs for reliable meaning extraction
 */
export class OpenAISemanticExtractor {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.temperature = config.temperature ?? 0.1; // Low temperature for structured extraction
    this.maxTokens = config.maxTokens ?? 2000;
  }

  async extractSemanticMeaning(input: SemanticExtractionInput): Promise<SemanticExtractionOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    try {
      const parsed = JSON.parse(content) as SemanticExtractionOutput;
      return this.validateAndNormalizeOutput(parsed);
    } catch (err) {
      throw new Error(`Failed to parse OpenAI response: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private buildSystemPrompt(): string {
    return `You are PAL Semantic Agent.

Your task is to convert conversational speech evidence into a structured semantic representation.

RULES:
1. Do not invent facts. Extract only what is explicitly stated or strongly implied.
2. Do not infer a business action unless supported by evidence.
3. Preserve: names, amounts, currencies, dates, times, negations, constraints, uncertainty, code-switching meaning.
4. Every material field must have a confidence score (0.0 to 1.0).
5. If evidence is insufficient, set contextSufficiency to "insufficient".
6. If evidence conflicts, set contextSufficiency to "conflicting".
7. Do not execute anything. Return only structured JSON.

OUTPUT FORMAT (JSON):
{
  "intent": {
    "type": "payment_reminder" | "send_message" | "customer_lookup" | "invoice_status" | "other",
    "summary": "Brief intent description (max 500 chars)",
    "confidence": 0.0 to 1.0
  },
  "entities": [
    {
      "name": "customer" | "recipient" | "amount" | "date" | etc.,
      "value": "Extracted value",
      "type": "person" | "organization" | "money" | "date" | "time" | "location" | "other",
      "confidence": 0.0 to 1.0
    }
  ],
  "constraints": [
    {
      "type": "deadline" | "condition" | "requirement",
      "value": "Constraint description",
      "confidence": 0.0 to 1.0
    }
  ],
  "temporalRelations": [
    {
      "type": "on" | "before" | "after" | "at" | "between" | "within",
      "value": "Temporal description",
      "confidence": 0.0 to 1.0
    }
  ],
  "ambiguities": [
    {
      "field": "Field name with ambiguity",
      "description": "Description of the ambiguity",
      "confidence": 0.0 to 1.0
    }
  ],
  "contextSufficiency": "sufficient" | "insufficient" | "conflicting",
  "overallConfidence": 0.0 to 1.0,
  "fieldConfidence": {
    "intent": 0.0 to 1.0,
    "entities": 0.0 to 1.0,
    "constraints": 0.0 to 1.0,
    "temporalRelations": 0.0 to 1.0
  }
}

INTENT TYPES:
- payment_reminder: User wants to send a payment reminder
- send_message: User wants to send a general message
- customer_lookup: User wants to find customer information
- invoice_status: User wants to check invoice status
- other: Any other intent

ENTITY TYPES:
- person: Individual person's name
- organization: Company or organization name
- money: Currency amount (e.g., "₦85,000", "$100")
- date: Date reference (e.g., "tomorrow", "Monday", "2026-09-15")
- time: Time reference (e.g., "9:00 AM", "morning")
- location: Place or location
- other: Any other entity

CODE-SWITCHING:
If the transcript contains code-switching (mixing languages), extract entities and intent from the complete context, not just one language.

EXAMPLES:

Input: "Remind Ngozi to pay ₦85,000 by tomorrow"
Output: {
  "intent": { "type": "payment_reminder", "summary": "Send payment reminder to Ngozi for ₦85,000 due tomorrow", "confidence": 0.95 },
  "entities": [
    { "name": "customer", "value": "Ngozi", "type": "person", "confidence": 0.98 },
    { "name": "amount", "value": "₦85,000", "type": "money", "confidence": 0.99 }
  ],
  "constraints": [
    { "type": "deadline", "value": "by tomorrow", "confidence": 0.95 }
  ],
  "temporalRelations": [
    { "type": "before", "value": "tomorrow", "confidence": 0.95 }
  ],
  "ambiguities": [],
  "contextSufficiency": "sufficient",
  "overallConfidence": 0.95,
  "fieldConfidence": { "intent": 0.95, "entities": 0.98, "constraints": 0.95, "temporalRelations": 0.95 }
}

Input: "Habari yako Amina? Umelipa invoice?"
Output: {
  "intent": { "type": "invoice_status", "summary": "Check if Amina has paid invoice", "confidence": 0.90 },
  "entities": [
    { "name": "customer", "value": "Amina", "type": "person", "confidence": 0.95 }
  ],
  "constraints": [],
  "temporalRelations": [],
  "ambiguities": [
    { "field": "invoice_id", "description": "Specific invoice not identified", "confidence": 0.80 }
  ],
  "contextSufficiency": "insufficient",
  "overallConfidence": 0.75,
  "fieldConfidence": { "intent": 0.90, "entities": 0.95, "constraints": 1.0, "temporalRelations": 1.0 }
}`;
  }

  private buildUserPrompt(input: SemanticExtractionInput): string {
    let prompt = `TRANSCRIPT:\n${input.transcript}\n\n`;

    if (input.segments && input.segments.length > 0) {
      prompt += `SEGMENTS:\n`;
      for (const seg of input.segments) {
        prompt += `[${seg.startMs}ms - ${seg.endMs}ms] ${seg.text}\n`;
      }
      prompt += `\n`;
    }

    if (input.codeSwitch?.detected) {
      prompt += `CODE-SWITCHING DETECTED:\n`;
      prompt += `- Switch count: ${input.codeSwitch.switchCount}\n`;
      prompt += `- Language pairs: ${input.codeSwitch.pairs.join(", ")}\n`;
      if (input.codeSwitch.density !== undefined) {
        prompt += `- Density: ${(input.codeSwitch.density * 100).toFixed(0)}%\n`;
      }
      prompt += `\n`;
    }

    if (input.languageSpans && input.languageSpans.length > 0) {
      prompt += `LANGUAGE SPANS:\n`;
      for (const span of input.languageSpans) {
        const text = input.transcript.substring(span.start, span.end);
        prompt += `- ${span.language}: "${text}"\n`;
      }
      prompt += `\n`;
    }

    if (input.conversationMemory && input.conversationMemory.length > 0) {
      prompt += `CONVERSATION HISTORY:\n`;
      for (const msg of input.conversationMemory) {
        prompt += `- ${msg}\n`;
      }
      prompt += `\n`;
    }

    if (input.businessContext) {
      prompt += `BUSINESS CONTEXT:\n${input.businessContext}\n\n`;
    }

    prompt += `Extract the structured semantic meaning from this speech. Return JSON only.`;

    return prompt;
  }

  private validateAndNormalizeOutput(output: unknown): SemanticExtractionOutput {
    const data = output as SemanticExtractionOutput;

    // Ensure all required fields exist with defaults
    return {
      intent: data.intent ?? { type: "other", summary: "Unknown intent", confidence: 0.3 },
      entities: data.entities ?? [],
      constraints: data.constraints ?? [],
      temporalRelations: data.temporalRelations ?? [],
      ambiguities: data.ambiguities ?? [],
      contextSufficiency: data.contextSufficiency ?? "insufficient",
      overallConfidence: Math.max(0, Math.min(1, data.overallConfidence ?? 0.5)),
      fieldConfidence: data.fieldConfidence ?? {},
    };
  }
}

/**
 * Create a semantic extractor with the given configuration
 */
export function createSemanticExtractor(config: LLMConfig): OpenAISemanticExtractor {
  return new OpenAISemanticExtractor(config);
}
