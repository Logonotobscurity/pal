/**
 * Semantic Agent Service — SpeechEvent → MeaningState transformation
 * 
 * Implements PAL_ARCHITECTURE.md §19: Convert speech into structured meaning.
 * 
 * Responsibilities:
 * - Extract intent from transcript
 * - Identify entities (names, amounts, dates, times)
 * - Detect constraints and temporal relations
 * - Flag ambiguities requiring clarification
 * - Generate confidence scores
 * - Preserve provenance chain
 * 
 * Constraints (§19):
 * - Cannot send messages
 * - Cannot make payments
 * - Cannot modify customer records
 * - Cannot trigger integrations
 * - Cannot approve actions
 */

import "server-only";
import type { SpeechEvent } from "@/core/schemas/speech-event";
import { createMeaningState, type MeaningState } from "@/core/schemas/meaning-state";
import type { OpenAISemanticExtractor, SemanticExtractionInput } from "@/providers/openai-llm";
import { createId } from "@/lib/utils/ids";

export type SemanticAgentConfig = {
  extractor: OpenAISemanticExtractor;
  conversationMemory?: string[];
  businessContext?: string;
};

export type SemanticAgentLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

/**
 * Semantic Agent — Converts SpeechEvent into MeaningState
 */
export class SemanticAgent {
  private readonly extractor: OpenAISemanticExtractor;
  private readonly conversationMemory: string[];
  private readonly businessContext?: string;
  private readonly logger: SemanticAgentLogger;

  constructor(config: SemanticAgentConfig, logger?: SemanticAgentLogger) {
    this.extractor = config.extractor;
    this.conversationMemory = config.conversationMemory ?? [];
    this.businessContext = config.businessContext;
    this.logger = logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  /**
   * Convert SpeechEvent into structured MeaningState
   * 
   * PAL_ARCHITECTURE.md §19:
   * - Do not invent facts
   * - Do not infer business action unless supported by evidence
   * - Preserve provenance
   * - Flag insufficient or conflicting evidence
   */
  async extractMeaning(speechEvent: SpeechEvent): Promise<MeaningState> {
    this.logger.info("semantic.agent.extracting", {
      speechEventId: speechEvent.id,
      transcriptLength: speechEvent.transcript.text.length,
      segmentCount: speechEvent.transcript.segments.length,
      codeSwitchDetected: speechEvent.codeSwitch.detected,
    });

    // Prepare input for LLM semantic extractor
    const extractionInput: SemanticExtractionInput = {
      transcript: speechEvent.transcript.text,
      segments: speechEvent.transcript.segments,
      languageSpans: speechEvent.languageSpans,
      codeSwitch: speechEvent.codeSwitch,
      conversationMemory: this.conversationMemory,
      businessContext: this.businessContext,
    };

    // Extract semantic meaning using LLM
    const extraction = await this.extractor.extractSemanticMeaning(extractionInput);

    this.logger.info("semantic.agent.extracted", {
      speechEventId: speechEvent.id,
      intentType: extraction.intent.type,
      intentConfidence: extraction.intent.confidence,
      entityCount: extraction.entities.length,
      constraintCount: extraction.constraints.length,
      ambiguityCount: extraction.ambiguities.length,
      contextSufficiency: extraction.contextSufficiency,
      overallConfidence: extraction.overallConfidence,
    });

    // Log warnings for insufficient or conflicting context
    if (extraction.contextSufficiency === "insufficient") {
      this.logger.warn("semantic.agent.insufficient_context", {
        speechEventId: speechEvent.id,
        ambiguities: extraction.ambiguities,
      });
    }

    if (extraction.contextSufficiency === "conflicting") {
      this.logger.warn("semantic.agent.conflicting_context", {
        speechEventId: speechEvent.id,
        ambiguities: extraction.ambiguities,
      });
    }

    // Create MeaningState with full provenance
    const meaningState = createMeaningState({
      id: createId("meaning"),
      speechEventId: speechEvent.id,
      intent: extraction.intent,
      entities: extraction.entities,
      constraints: extraction.constraints,
      temporalRelations: extraction.temporalRelations,
      ambiguities: extraction.ambiguities,
      evidenceRefs: [
        // Speech event as primary evidence
        {
          id: `ev_${speechEvent.id}`,
          type: "transcript",
          source: speechEvent.id,
        },
        // Inherit provenance from speech event
        ...speechEvent.provenance.map((ref) => ({
          id: ref.id,
          type: ref.type as "audio" | "transcript" | "semantic" | "policy" | "execution" | "web" | "database",
          source: ref.source,
          uri: ref.uri,
        })),
      ],
      confidence: {
        overall: extraction.overallConfidence,
        fields: extraction.fieldConfidence,
      },
      contextSufficiency: extraction.contextSufficiency,
      model: {
        provider: "openai",
        model: "gpt-4o-mini", // This should come from config in production
        version: "2024-07-18",
      },
    });

    this.logger.info("semantic.agent.meaning_state_created", {
      meaningStateId: meaningState.id,
      speechEventId: speechEvent.id,
      evidenceRefCount: meaningState.evidenceRefs.length,
    });

    return meaningState;
  }

  /**
   * Add conversation message to memory for context-aware extraction
   */
  addToMemory(message: string): void {
    this.conversationMemory.push(message);

    // Keep only last 10 messages to avoid token limits
    if (this.conversationMemory.length > 10) {
      this.conversationMemory.shift();
    }
  }

  /**
   * Clear conversation memory
   */
  clearMemory(): void {
    this.conversationMemory.length = 0;
  }
}

/**
 * Create a semantic agent with the given configuration
 */
export function createSemanticAgent(
  config: SemanticAgentConfig,
  logger?: SemanticAgentLogger,
): SemanticAgent {
  return new SemanticAgent(config, logger);
}
