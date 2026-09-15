/**
 * Capability Registry — Available actions the system can perform
 * 
 * Implements PAL_ARCHITECTURE.md §31: Capability Registry
 * 
 * Agents should not discover arbitrary functions. Define capabilities explicitly.
 */

import { z } from "zod";

export type CapabilityOperation = "read" | "draft" | "write" | "financial" | "destructive";

export type Capability = {
  name: string;
  operation: CapabilityOperation;
  requiresApproval: boolean;
  description: string;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  provider: string;
};

/**
 * Registry of all available capabilities in the system
 */
export const CAPABILITY_REGISTRY: Record<string, Capability> = {
  // Read operations (no approval required)
  "customer.lookup": {
    name: "customer.lookup",
    operation: "read",
    requiresApproval: false,
    description: "Look up customer information by name or ID",
    inputSchema: z.object({
      query: z.string().min(1),
    }),
    outputSchema: z.object({
      customerId: z.string(),
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }),
    provider: "database",
  },

  "invoice.status": {
    name: "invoice.status",
    operation: "read",
    requiresApproval: false,
    description: "Check invoice payment status",
    inputSchema: z.object({
      customerId: z.string(),
      invoiceId: z.string().optional(),
    }),
    outputSchema: z.object({
      invoiceId: z.string(),
      status: z.enum(["paid", "pending", "overdue"]),
      amount: z.number(),
      currency: z.string(),
      dueDate: z.string(),
    }),
    provider: "database",
  },

  "invoice.list": {
    name: "invoice.list",
    operation: "read",
    requiresApproval: false,
    description: "List invoices for a customer",
    inputSchema: z.object({
      customerId: z.string(),
      status: z.enum(["paid", "pending", "overdue"]).optional(),
    }),
    outputSchema: z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.string(),
          status: z.enum(["paid", "pending", "overdue"]),
          amount: z.number(),
          currency: z.string(),
          dueDate: z.string(),
        }),
      ),
    }),
    provider: "database",
  },

  // Draft operations (no external side effects, no approval required)
  "message.draft": {
    name: "message.draft",
    operation: "draft",
    requiresApproval: false,
    description: "Draft a message without sending",
    inputSchema: z.object({
      recipientId: z.string(),
      templateType: z.enum(["payment_reminder", "general", "invoice"]),
      context: z.record(z.string(), z.unknown()).optional(),
    }),
    outputSchema: z.object({
      draftId: z.string(),
      content: z.string(),
      recipientId: z.string(),
    }),
    provider: "messaging",
  },

  // External write operations (require approval)
  "message.send": {
    name: "message.send",
    operation: "write",
    requiresApproval: true,
    description: "Send a message to a customer",
    inputSchema: z.object({
      recipientId: z.string(),
      message: z.string().min(1),
      channel: z.enum(["sms", "email", "whatsapp"]).optional(),
    }),
    outputSchema: z.object({
      messageId: z.string(),
      status: z.enum(["sent", "failed"]),
      sentAt: z.string(),
    }),
    provider: "messaging",
  },

  "payment.record": {
    name: "payment.record",
    operation: "financial",
    requiresApproval: true,
    description: "Record a payment received",
    inputSchema: z.object({
      invoiceId: z.string(),
      amount: z.number().positive(),
      currency: z.string(),
      paymentMethod: z.string(),
      receivedAt: z.string(),
    }),
    outputSchema: z.object({
      paymentId: z.string(),
      status: z.enum(["recorded", "failed"]),
    }),
    provider: "payments",
  },

  "task.create": {
    name: "task.create",
    operation: "draft",
    requiresApproval: false,
    description: "Create an internal task or reminder",
    inputSchema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
    }),
    outputSchema: z.object({
      taskId: z.string(),
      status: z.enum(["created", "failed"]),
    }),
    provider: "tasks",
  },
};

/**
 * Get capability by name
 */
export function getCapability(name: string): Capability | undefined {
  return CAPABILITY_REGISTRY[name];
}

/**
 * List all capabilities
 */
export function listCapabilities(): Capability[] {
  return Object.values(CAPABILITY_REGISTRY);
}

/**
 * List capabilities by operation type
 */
export function listCapabilitiesByOperation(operation: CapabilityOperation): Capability[] {
  return Object.values(CAPABILITY_REGISTRY).filter((cap) => cap.operation === operation);
}

/**
 * Check if a capability exists
 */
export function hasCapability(name: string): boolean {
  return name in CAPABILITY_REGISTRY;
}

/**
 * Validate capability input
 */
export function validateCapabilityInput(name: string, input: unknown): boolean {
  const capability = getCapability(name);
  if (!capability) {
    return false;
  }

  const result = capability.inputSchema.safeParse(input);
  return result.success;
}
