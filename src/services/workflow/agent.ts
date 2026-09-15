/**
 * Workflow Agent Service — MeaningState → ActionPlan transformation
 * 
 * Implements PAL_ARCHITECTURE.md §20: Convert meaning into validated workflow.
 * 
 * Responsibilities:
 * - Determine what task the user is requesting
 * - Identify required steps (read, draft, write operations)
 * - Identify approval requirements
 * - Identify fallback/clarification requirements
 * - Generate constrained WorkflowIR
 * - Validate complete workflow before returning
 * 
 * Constraints (§20):
 * - Cannot execute actions
 * - Only generates validated plans
 * - Must enforce approval for consequential actions
 */

import "server-only";
import type { MeaningState } from "@/core/schemas/meaning-state";
import { createActionPlan, type ActionPlan } from "@/core/schemas/action-plan";
import type { OpenAIWorkflowGenerator, WorkflowGenerationInput } from "@/providers/openai-workflow";
import { validateWorkflowIR, validateConnectivity } from "@/core/workflow/validator";
import { listCapabilities } from "@/core/capabilities/registry";
import { createId } from "@/lib/utils/ids";

export type WorkflowAgentConfig = {
  generator: OpenAIWorkflowGenerator;
  businessContext?: string;
};

export type WorkflowAgentLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

/**
 * Workflow Agent — Converts MeaningState into validated ActionPlan
 */
export class WorkflowAgent {
  private readonly generator: OpenAIWorkflowGenerator;
  private readonly businessContext?: string;
  private readonly logger: WorkflowAgentLogger;

  constructor(config: WorkflowAgentConfig, logger?: WorkflowAgentLogger) {
    this.generator = config.generator;
    this.businessContext = config.businessContext;
    this.logger = logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  /**
   * Generate ActionPlan from MeaningState
   * 
   * PAL_ARCHITECTURE.md §20-21:
   * - Use constrained WorkflowIR (only allowed node types)
   * - Validate complete graph before persistence
   * - Reject unknown capabilities
   * - Reject malformed edges
   * - Reject cycles
   * - Reject missing approval for consequential actions
   * - Never execute actions
   */
  async generatePlan(meaningState: MeaningState): Promise<ActionPlan> {
    this.logger.info("workflow.agent.generating", {
      meaningStateId: meaningState.id,
      intentType: meaningState.intent.type,
      intentConfidence: meaningState.intent.confidence,
      contextSufficiency: meaningState.contextSufficiency,
    });

    // Check if context is sufficient to generate a plan
    if (meaningState.contextSufficiency === "insufficient") {
      this.logger.warn("workflow.agent.insufficient_context", {
        meaningStateId: meaningState.id,
        ambiguities: meaningState.ambiguities,
      });
    }

    if (meaningState.contextSufficiency === "conflicting") {
      this.logger.warn("workflow.agent.conflicting_context", {
        meaningStateId: meaningState.id,
        ambiguities: meaningState.ambiguities,
      });
    }

    // Get available capabilities
    const availableCapabilities = listCapabilities();

    // Generate workflow using LLM
    const generationInput: WorkflowGenerationInput = {
      meaningState,
      businessContext: this.businessContext,
      availableCapabilities,
    };

    const generation = await this.generator.generateWorkflow(generationInput);

    this.logger.info("workflow.agent.workflow_generated", {
      meaningStateId: meaningState.id,
      nodeCount: generation.workflowIR.nodes.length,
      edgeCount: generation.workflowIR.edges.length,
      stepCount: generation.steps.length,
      sideEffectClass: generation.sideEffectClass,
      requiresApproval: generation.requiresApproval,
    });

    // Validate workflow IR
    const validationResult = validateWorkflowIR(generation.workflowIR);

    if (!validationResult.valid) {
      this.logger.error("workflow.agent.validation_failed", {
        meaningStateId: meaningState.id,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });

      const errorMessages = validationResult.errors.map((e) => `${e.code}: ${e.message}`).join("; ");
      throw new Error(`Workflow validation failed: ${errorMessages}`);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      this.logger.warn("workflow.agent.validation_warnings", {
        meaningStateId: meaningState.id,
        warnings: validationResult.warnings,
      });
    }

    // Validate connectivity (warn only, don't fail)
    const connectivityResult = validateConnectivity(generation.workflowIR.nodes, generation.workflowIR.edges);
    if (connectivityResult.warnings.length > 0) {
      this.logger.warn("workflow.agent.connectivity_warnings", {
        meaningStateId: meaningState.id,
        warnings: connectivityResult.warnings,
      });
    }

    // Create ActionPlan with validated WorkflowIR
    const actionPlan = createActionPlan({
      id: createId("plan"),
      meaningStateId: meaningState.id,
      workflowIR: generation.workflowIR,
      steps: generation.steps,
      sideEffectClass: generation.sideEffectClass,
      requiresApproval: generation.requiresApproval,
      evidenceRefs: [
        // Meaning state as primary evidence
        {
          id: `ev_${meaningState.id}`,
          type: "semantic",
          source: meaningState.id,
        },
        // Inherit provenance from meaning state
        ...meaningState.evidenceRefs.map((ref) => ({
          id: ref.id,
          type: ref.type,
          source: ref.source,
          uri: ref.uri,
        })),
      ],
      rationaleSummary: generation.rationaleSummary,
      generatedBy: {
        agent: "workflow-agent",
        model: "gpt-4o-mini", // This should come from config in production
        version: "1.0.0",
      },
    });

    this.logger.info("workflow.agent.action_plan_created", {
      actionPlanId: actionPlan.id,
      meaningStateId: meaningState.id,
      stepCount: actionPlan.steps.length,
      requiresApproval: actionPlan.requiresApproval,
      sideEffectClass: actionPlan.sideEffectClass,
      evidenceRefCount: actionPlan.evidenceRefs.length,
    });

    return actionPlan;
  }
}

/**
 * Create a workflow agent with the given configuration
 */
export function createWorkflowAgent(
  config: WorkflowAgentConfig,
  logger?: WorkflowAgentLogger,
): WorkflowAgent {
  return new WorkflowAgent(config, logger);
}
