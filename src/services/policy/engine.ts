/**
 * Policy Engine Service — Deterministic policy evaluation
 * 
 * Implements PAL_ARCHITECTURE.md §26-28: Deterministic policy engine with
 * critical field blocking and risk-based approval requirements.
 * 
 * The Policy Engine is NOT an LLM. It evaluates:
 * - ActionPlan
 * - Workspace permissions
 * - Risk class
 * - Field confidence
 * - Critical field uncertainty
 * 
 * Returns deterministic PolicyDecision.
 */

import "server-only";
import type { ActionPlan } from "@/core/schemas/action-plan";
import type { MeaningState } from "@/core/schemas/meaning-state";
import { createActionProposal, type ActionProposal } from "@/core/schemas/action-proposal";
import type { PolicyDecision } from "@/core/schemas/policy-engine";
import { createId } from "@/lib/utils/ids";

export type PolicyEngineConfig = {
  workspaceId: string;
  criticalFieldConfidenceThreshold?: number; // Default: 0.85
};

export type PolicyEngineLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

/**
 * Critical fields that receive special treatment (§28)
 * If any critical field is uncertain, execution is blocked
 */
export const CRITICAL_FIELDS = [
  "recipient",
  "amount",
  "currency",
  "date",
  "time",
  "negation",
  "payment_status",
  "destination",
  "customer",
  "invoice",
] as const;

export type CriticalField = (typeof CRITICAL_FIELDS)[number];

/**
 * Policy Matrix (§27)
 */
export const POLICY_MATRIX = {
  none: {
    automatic: true,
    requiresApproval: false,
  },
  read: {
    automatic: true,
    requiresApproval: false,
  },
  draft: {
    automatic: true,
    requiresApproval: false,
  },
  external_write: {
    automatic: false,
    requiresApproval: true,
  },
  financial: {
    automatic: false,
    requiresApproval: true,
  },
  destructive: {
    automatic: false,
    requiresApproval: true, // Explicit confirmation required
  },
} as const;

/**
 * Critical field analysis result
 */
export type CriticalFieldAnalysis = {
  hasCriticalFields: boolean;
  uncertainFields: Array<{
    field: string;
    confidence: number;
    value: string;
  }>;
  allCriticalFieldsConfident: boolean;
  lowestConfidence: number;
};

/**
 * Policy evaluation input
 */
export type PolicyEvaluationInput = {
  actionPlan: ActionPlan;
  meaningState: MeaningState;
  workspaceId: string;
};

/**
 * Policy Engine — Deterministic policy evaluation
 */
export class PolicyEngine {
  private readonly workspaceId: string;
  private readonly criticalFieldThreshold: number;
  private readonly logger: PolicyEngineLogger;

  constructor(config: PolicyEngineConfig, logger?: PolicyEngineLogger) {
    this.workspaceId = config.workspaceId;
    this.criticalFieldThreshold = config.criticalFieldConfidenceThreshold ?? 0.85;
    this.logger = logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  /**
   * Evaluate ActionPlan and generate ActionProposal with PolicyDecision
   * 
   * PAL_ARCHITECTURE.md §26-28:
   * - Deterministic evaluation (no LLM)
   * - Risk-based approval requirements
   * - Critical field blocking
   * - Policy matrix enforcement
   */
  evaluate(input: PolicyEvaluationInput): ActionProposal {
    this.logger.info("policy.engine.evaluating", {
      actionPlanId: input.actionPlan.id,
      meaningStateId: input.meaningState.id,
      sideEffectClass: input.actionPlan.sideEffectClass,
      requiresApproval: input.actionPlan.requiresApproval,
    });

    // Analyze critical fields from meaning state
    const criticalFieldAnalysis = this.analyzeCriticalFields(input.meaningState);

    this.logger.info("policy.engine.critical_field_analysis", {
      hasCriticalFields: criticalFieldAnalysis.hasCriticalFields,
      uncertainFieldCount: criticalFieldAnalysis.uncertainFields.length,
      allConfident: criticalFieldAnalysis.allCriticalFieldsConfident,
      lowestConfidence: criticalFieldAnalysis.lowestConfidence,
    });

    // Check for critical field blocking (§28)
    // Only block write/financial operations with uncertain critical fields
    // Read operations can proceed even with low confidence critical fields
    const isWriteOrFinancial = ["external_write", "financial", "destructive"].includes(
      input.actionPlan.sideEffectClass,
    );
    
    if (
      isWriteOrFinancial &&
      criticalFieldAnalysis.hasCriticalFields &&
      !criticalFieldAnalysis.allCriticalFieldsConfident
    ) {
      this.logger.warn("policy.engine.critical_field_blocked", {
        uncertainFields: criticalFieldAnalysis.uncertainFields,
      });

      return this.createBlockedProposal(
        input,
        "CRITICAL_FIELD_UNCERTAINTY",
        `Critical fields have insufficient confidence: ${criticalFieldAnalysis.uncertainFields.map((f) => `${f.field} (${(f.confidence * 100).toFixed(0)}%)`).join(", ")}. Clarification required.`,
        criticalFieldAnalysis,
      );
    }

    // Check context sufficiency
    if (input.meaningState.contextSufficiency !== "sufficient") {
      this.logger.warn("policy.engine.insufficient_context", {
        contextSufficiency: input.meaningState.contextSufficiency,
        ambiguities: input.meaningState.ambiguities,
      });

      return this.createBlockedProposal(
        input,
        "INSUFFICIENT_CONTEXT",
        `Context is ${input.meaningState.contextSufficiency}. ${input.meaningState.ambiguities.length > 0 ? `Ambiguities: ${input.meaningState.ambiguities.map((a) => a.field).join(", ")}` : ""}`,
        criticalFieldAnalysis,
      );
    }

    // Apply policy matrix (§27)
    const policyRule = POLICY_MATRIX[input.actionPlan.sideEffectClass as keyof typeof POLICY_MATRIX];

    // Evaluate based on risk class
    const policyDecision = this.evaluateByRiskClass(
      input.actionPlan,
      policyRule,
    );

    this.logger.info("policy.engine.decision", {
      allowed: policyDecision.allowed,
      status: policyDecision.status,
      requiresApproval: policyDecision.requiresApproval,
      reason: policyDecision.reason,
    });

    // Create action proposal
    const proposal = this.createProposal(input, policyDecision);

    this.logger.info("policy.engine.proposal_created", {
      proposalId: proposal.id,
      status: proposal.status,
      riskClass: proposal.riskClass,
    });

    return proposal;
  }

  /**
   * Analyze critical fields from meaning state
   */
  private analyzeCriticalFields(meaningState: MeaningState): CriticalFieldAnalysis {
    const criticalEntities = meaningState.entities.filter((entity) =>
      CRITICAL_FIELDS.includes(entity.name as CriticalField),
    );

    if (criticalEntities.length === 0) {
      return {
        hasCriticalFields: false,
        uncertainFields: [],
        allCriticalFieldsConfident: true,
        lowestConfidence: 1.0,
      };
    }

    const uncertainFields = criticalEntities
      .filter((entity) => entity.confidence < this.criticalFieldThreshold)
      .map((entity) => ({
        field: entity.name,
        confidence: entity.confidence,
        value: entity.value,
      }));

    const lowestConfidence = Math.min(...criticalEntities.map((e) => e.confidence));

    return {
      hasCriticalFields: true,
      uncertainFields,
      allCriticalFieldsConfident: uncertainFields.length === 0,
      lowestConfidence,
    };
  }

  /**
   * Evaluate by risk class using policy matrix
   */
  private evaluateByRiskClass(
    actionPlan: ActionPlan,
    policyRule: { automatic: boolean; requiresApproval: boolean } | undefined,
  ): PolicyDecision {
    const sideEffectClass = actionPlan.sideEffectClass;
    // Map sideEffectClass to riskClass for PolicyDecision
    // "none" maps to "read"
    const riskClass: PolicyDecision["riskClass"] =
      sideEffectClass === "none" ? "read" : sideEffectClass;

    // Destructive actions are blocked in MVP (§27)
    if (sideEffectClass === "destructive") {
      return {
        allowed: false,
        status: "rejected",
        reason:
          "Destructive actions are blocked in MVP and require explicit confirmation. This action cannot be automated.",
        riskClass: "destructive",
        actionType: actionPlan.steps[0]?.capability ?? "unknown",
        workspaceId: this.workspaceId,
        requiresApproval: true,
        evidenceRefs: actionPlan.evidenceRefs.map((ref) => ({
          id: ref.id,
          type: ref.type,
          source: ref.source,
        })),
      };
    }

    // Read and draft can execute automatically
    if (policyRule && policyRule.automatic && !policyRule.requiresApproval) {
      return {
        allowed: true,
        status: "approved",
        reason: `Low-risk ${sideEffectClass} action may execute automatically without approval.`,
        riskClass,
        actionType: actionPlan.steps[0]?.capability ?? "unknown",
        workspaceId: this.workspaceId,
        requiresApproval: false,
        evidenceRefs: actionPlan.evidenceRefs.map((ref) => ({
          id: ref.id,
          type: ref.type,
          source: ref.source,
        })),
      };
    }

    // External write and financial require approval
    if (policyRule && !policyRule.automatic && policyRule.requiresApproval) {
      return {
        allowed: false,
        status: "pending",
        reason: `${sideEffectClass === "financial" ? "Financial" : "External write"} action requires owner approval before execution.`,
        riskClass,
        actionType: actionPlan.steps[0]?.capability ?? "unknown",
        workspaceId: this.workspaceId,
        requiresApproval: true,
        evidenceRefs: actionPlan.evidenceRefs.map((ref) => ({
          id: ref.id,
          type: ref.type,
          source: ref.source,
        })),
      };
    }

    // Fallback: require approval
    return {
      allowed: false,
      status: "pending",
      reason: "Action requires approval based on workspace policy.",
      riskClass,
      actionType: actionPlan.steps[0]?.capability ?? "unknown",
      workspaceId: this.workspaceId,
      requiresApproval: true,
      evidenceRefs: actionPlan.evidenceRefs.map((ref) => ({
        id: ref.id,
        type: ref.type,
        source: ref.source,
      })),
    };
  }

  /**
   * Create blocked proposal (critical field or context issues)
   */
  private createBlockedProposal(
    input: PolicyEvaluationInput,
    blockReason: string,
    detailedReason: string,
    _criticalFieldAnalysis: CriticalFieldAnalysis,
  ): ActionProposal {
    // Map sideEffectClass to riskClass
    // "none" maps to "read" for proposals
    const proposalRiskClass: ActionProposal["riskClass"] =
      input.actionPlan.sideEffectClass === "none"
        ? "read"
        : input.actionPlan.sideEffectClass;

    const policyRiskClass: PolicyDecision["riskClass"] =
      input.actionPlan.sideEffectClass === "none"
        ? "read"
        : input.actionPlan.sideEffectClass;

    const policyDecision: PolicyDecision = {
      allowed: false,
      status: "rejected",
      reason: detailedReason,
      riskClass: policyRiskClass,
      actionType: input.actionPlan.steps[0]?.capability ?? "unknown",
      workspaceId: this.workspaceId,
      requiresApproval: true,
      evidenceRefs: input.actionPlan.evidenceRefs.map((ref) => ({
        id: ref.id,
        type: ref.type,
        source: ref.source,
      })),
    };

    return createActionProposal({
      id: createId("proposal"),
      workspaceId: this.workspaceId,
      actionPlanId: input.actionPlan.id,
      actionType: input.actionPlan.steps[0]?.capability ?? "unknown",
      exactPayload: {
        blockReason,
        criticalFieldAnalysis: _criticalFieldAnalysis,
        actionPlan: input.actionPlan,
      },
      riskClass: proposalRiskClass,
      evidenceRefs: input.actionPlan.evidenceRefs.map((ref) => ({
        id: ref.id,
        type: ref.type,
        source: ref.source,
        ...(ref.uri === undefined ? {} : { uri: ref.uri }),
      })),
      status: "rejected",
      policyDecision,
    });
  }

  /**
   * Create action proposal from policy decision
   */
  private createProposal(
    input: PolicyEvaluationInput,
    policyDecision: PolicyDecision,
  ): ActionProposal {
    // Determine status from policy decision
    const status: ActionProposal["status"] = policyDecision.allowed
      ? "approved"
      : policyDecision.status === "pending"
        ? "pending"
        : "rejected";

    // Map sideEffectClass to riskClass
    // "none" maps to "read" for proposals
    const riskClass: ActionProposal["riskClass"] =
      input.actionPlan.sideEffectClass === "none"
        ? "read"
        : input.actionPlan.sideEffectClass;

    // Extract recipient/destination from entities
    const recipient = input.meaningState.entities.find(
      (e) => e.name === "recipient" || e.name === "customer",
    )?.value;

    const destination = input.meaningState.entities.find((e) => e.name === "destination")?.value;

    // Extract scheduled time from temporal relations
    const scheduledFor = input.meaningState.temporalRelations.find((tr) =>
      ["on", "at", "before"].includes(tr.type),
    )?.value;

    // Build exact payload from action plan steps
    const exactPayload = {
      steps: input.actionPlan.steps.map((step) => ({
        capability: step.capability,
        parameters: step.parameters,
        description: step.description,
      })),
      workflowIR: input.actionPlan.workflowIR,
      rationaleSummary: input.actionPlan.rationaleSummary,
    };

    return createActionProposal({
      id: createId("proposal"),
      workspaceId: this.workspaceId,
      actionPlanId: input.actionPlan.id,
      actionType: input.actionPlan.steps[0]?.capability ?? "unknown",
      exactPayload,
      recipient,
      destination,
      scheduledFor,
      riskClass,
      evidenceRefs: input.actionPlan.evidenceRefs.map((ref) => ({
        id: ref.id,
        type: ref.type,
        source: ref.source,
        ...(ref.uri === undefined ? {} : { uri: ref.uri }),
      })),
      status,
      policyDecision,
      expiresAt: status === "pending" ? this.calculateExpiryTime() : undefined,
    });
  }

  /**
   * Calculate proposal expiry time (24 hours from now)
   */
  private calculateExpiryTime(): string {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    return expiryDate.toISOString();
  }
}

/**
 * Create a policy engine with the given configuration
 */
export function createPolicyEngine(
  config: PolicyEngineConfig,
  logger?: PolicyEngineLogger,
): PolicyEngine {
  return new PolicyEngine(config, logger);
}
