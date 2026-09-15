/**
 * OpenAI Workflow LLM Provider — MeaningState → ActionPlan transformation
 * 
 * Implements PAL_ARCHITECTURE.md §20-21: Workflow Agent with constrained WorkflowIR generation.
 * Uses OpenAI's structured outputs for type-safe workflow planning.
 */

import "server-only";
import OpenAI from "openai";
import type { MeaningState } from "@/core/schemas/meaning-state";
import type { ActionStep } from "@/core/schemas/action-plan";
import type { WorkflowIR } from "@/core/schemas/workflow-ir";
import type { Capability } from "@/core/capabilities/registry";

export type WorkflowLLMConfig = {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export type WorkflowGenerationInput = {
  meaningState: MeaningState;
  businessContext?: string;
  availableCapabilities: Capability[];
};

export type WorkflowGenerationOutput = {
  workflowIR: WorkflowIR;
  steps: ActionStep[];
  sideEffectClass: "none" | "draft" | "external_write" | "financial" | "destructive";
  requiresApproval: boolean;
  rationaleSummary: string;
};

/**
 * OpenAI-based workflow generator
 * Uses GPT-4 with structured outputs for reliable workflow planning
 */
export class OpenAIWorkflowGenerator {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: WorkflowLLMConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.temperature = config.temperature ?? 0.2; // Low temperature for structured planning
    this.maxTokens = config.maxTokens ?? 3000;
  }

  async generateWorkflow(input: WorkflowGenerationInput): Promise<WorkflowGenerationOutput> {
    const systemPrompt = this.buildSystemPrompt(input.availableCapabilities);
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
      const parsed = JSON.parse(content) as WorkflowGenerationOutput;
      return this.validateAndNormalizeOutput(parsed);
    } catch (err) {
      throw new Error(`Failed to parse OpenAI workflow response: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private buildSystemPrompt(capabilities: Capability[]): string {
    const capabilityList = capabilities
      .map((cap) => {
        const approval = cap.requiresApproval ? " [REQUIRES APPROVAL]" : "";
        return `- ${cap.name}: ${cap.description} (${cap.operation})${approval}`;
      })
      .join("\n");

    return `You are PAL Workflow Agent.

Your task is to convert a structured semantic meaning into an executable workflow plan.

RULES:
1. You MUST NOT execute any actions. You only generate a plan.
2. Use ONLY capabilities from the available registry below.
3. Every action that requires approval MUST have an approval node before it in the workflow.
4. Build a constrained WorkflowIR using ONLY these node types:
   - trigger: Initial event or condition
   - agent: Internal capability execution (read/draft operations)
   - condition: Decision point based on data
   - action: External capability execution (write/financial/destructive operations)
   - approval: Human approval gate
   - fallback: Error handling or clarification

5. Workflow must be acyclic (no cycles allowed).
6. All node IDs must be unique.
7. Edge references must point to valid nodes.
8. Classify side effects accurately:
   - "none": No external effects
   - "draft": Internal draft only (no sends)
   - "external_write": Sends messages or modifies external systems
   - "financial": Involves money
   - "destructive": Deletes or irreversibly modifies data

AVAILABLE CAPABILITIES:
${capabilityList}

OUTPUT FORMAT (JSON):
{
  "workflowIR": {
    "version": "1.0",
    "nodes": [
      {
        "id": "unique_node_id",
        "type": "trigger" | "agent" | "condition" | "action" | "approval" | "fallback",
        "capability": "capability.name (required for agent/action nodes)"
      }
    ],
    "edges": [
      {
        "from": "node_id",
        "to": "node_id",
        "label": "optional edge label"
      }
    ]
  },
  "steps": [
    {
      "id": "step_1",
      "type": "read" | "draft" | "write" | "approval" | "clarification",
      "capability": "capability.name",
      "description": "Human-readable step description",
      "parameters": {},
      "requiresApproval": false,
      "dependsOn": []
    }
  ],
  "sideEffectClass": "none" | "draft" | "external_write" | "financial" | "destructive",
  "requiresApproval": true/false,
  "rationaleSummary": "Brief explanation of the workflow plan (max 1000 chars)"
}

EXAMPLES:

Input: User wants to send payment reminder to Ngozi for ₦85,000 due tomorrow
Output: {
  "workflowIR": {
    "version": "1.0",
    "nodes": [
      { "id": "trigger", "type": "trigger" },
      { "id": "lookup", "type": "agent", "capability": "customer.lookup" },
      { "id": "check_invoice", "type": "agent", "capability": "invoice.status" },
      { "id": "draft", "type": "agent", "capability": "message.draft" },
      { "id": "approval", "type": "approval" },
      { "id": "send", "type": "action", "capability": "message.send" }
    ],
    "edges": [
      { "from": "trigger", "to": "lookup" },
      { "from": "lookup", "to": "check_invoice" },
      { "from": "check_invoice", "to": "draft" },
      { "from": "draft", "to": "approval" },
      { "from": "approval", "to": "send" }
    ]
  },
  "steps": [
    {
      "id": "step_1",
      "type": "read",
      "capability": "customer.lookup",
      "description": "Look up customer Ngozi",
      "parameters": { "query": "Ngozi" },
      "requiresApproval": false,
      "dependsOn": []
    },
    {
      "id": "step_2",
      "type": "read",
      "capability": "invoice.status",
      "description": "Check invoice status for customer",
      "parameters": {},
      "requiresApproval": false,
      "dependsOn": ["step_1"]
    },
    {
      "id": "step_3",
      "type": "draft",
      "capability": "message.draft",
      "description": "Draft payment reminder message",
      "parameters": { "templateType": "payment_reminder" },
      "requiresApproval": false,
      "dependsOn": ["step_2"]
    },
    {
      "id": "step_4",
      "type": "approval",
      "capability": "message.send",
      "description": "Request approval to send message",
      "parameters": {},
      "requiresApproval": true,
      "dependsOn": ["step_3"]
    },
    {
      "id": "step_5",
      "type": "write",
      "capability": "message.send",
      "description": "Send payment reminder to Ngozi",
      "parameters": { "message": "<draft content>" },
      "requiresApproval": true,
      "dependsOn": ["step_4"]
    }
  ],
  "sideEffectClass": "external_write",
  "requiresApproval": true,
  "rationaleSummary": "Workflow to send payment reminder: lookup customer, check invoice status, draft message, get approval, and send."
}

CRITICAL RULES:
- If intent is ambiguous or missing critical information, add a fallback node with clarification
- Never invent capabilities not in the registry
- All write/financial/destructive actions MUST have an approval node before them
- Approval nodes do not need capabilities (they are gates)
- Trigger nodes do not need capabilities (they are starting points)`;
  }

  private buildUserPrompt(input: WorkflowGenerationInput): string {
    const ms = input.meaningState;

    let prompt = `MEANING STATE:\n\n`;
    prompt += `Intent: ${ms.intent.type} (${ms.intent.summary})\n`;
    prompt += `Confidence: ${ms.intent.confidence.toFixed(2)}\n\n`;

    if (ms.entities.length > 0) {
      prompt += `Entities:\n`;
      for (const entity of ms.entities) {
        prompt += `- ${entity.name}: ${entity.value} (${entity.type}, confidence: ${entity.confidence.toFixed(2)})\n`;
      }
      prompt += `\n`;
    }

    if (ms.constraints.length > 0) {
      prompt += `Constraints:\n`;
      for (const constraint of ms.constraints) {
        prompt += `- ${constraint.type}: ${constraint.value} (confidence: ${constraint.confidence.toFixed(2)})\n`;
      }
      prompt += `\n`;
    }

    if (ms.temporalRelations.length > 0) {
      prompt += `Temporal Relations:\n`;
      for (const tr of ms.temporalRelations) {
        prompt += `- ${tr.type}: ${tr.value} (confidence: ${tr.confidence.toFixed(2)})\n`;
      }
      prompt += `\n`;
    }

    if (ms.ambiguities.length > 0) {
      prompt += `Ambiguities (MUST ADDRESS WITH CLARIFICATION):\n`;
      for (const amb of ms.ambiguities) {
        prompt += `- ${amb.field}: ${amb.description}\n`;
      }
      prompt += `\n`;
    }

    prompt += `Context Sufficiency: ${ms.contextSufficiency}\n\n`;

    if (input.businessContext) {
      prompt += `BUSINESS CONTEXT:\n${input.businessContext}\n\n`;
    }

    prompt += `Generate a complete workflow plan to fulfill this intent. Return JSON only.`;

    return prompt;
  }

  private validateAndNormalizeOutput(output: unknown): WorkflowGenerationOutput {
    const data = output as WorkflowGenerationOutput;

    // Ensure required fields exist
    if (!data.workflowIR || !data.steps || !data.sideEffectClass) {
      throw new Error("Missing required workflow fields");
    }

    // Validate workflow IR structure
    if (!data.workflowIR.version || !data.workflowIR.nodes || !Array.isArray(data.workflowIR.nodes)) {
      throw new Error("Invalid workflow IR structure");
    }

    // Ensure edges array exists
    if (!data.workflowIR.edges) {
      data.workflowIR.edges = [];
    }

    // Ensure all steps have required fields
    for (const step of data.steps) {
      if (!step.id || !step.type || !step.capability || !step.description) {
        throw new Error(`Invalid step structure: ${JSON.stringify(step)}`);
      }
      if (!step.parameters) step.parameters = {};
      if (!step.dependsOn) step.dependsOn = [];
      if (step.requiresApproval === undefined) step.requiresApproval = false;
    }

    // Default requiresApproval to false if not specified
    if (data.requiresApproval === undefined) {
      data.requiresApproval = false;
    }

    // Ensure rationaleSummary exists
    if (!data.rationaleSummary) {
      data.rationaleSummary = "Workflow plan generated from meaning state";
    }

    return data;
  }
}

/**
 * Create a workflow generator with the given configuration
 */
export function createWorkflowGenerator(config: WorkflowLLMConfig): OpenAIWorkflowGenerator {
  return new OpenAIWorkflowGenerator(config);
}
