/**
 * Mock Capability Executors
 * 
 * For testing and MVP demonstration.
 * Real executors would call actual external APIs (WhatsApp, SMS, email, etc.)
 */

import "server-only";
import type { Capability } from "@/core/capabilities/registry";

export type ExecutorResponse = {
  success: boolean;
  externalReference?: string;
  outputPayload: unknown;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Mock executor for customer.lookup capability
 */
export async function executeCustomerLookup(
  capability: Capability,
  input: { query: string },
): Promise<ExecutorResponse> {
  // Validate input
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  // Mock customer lookup
  return {
    success: true,
    externalReference: `customer_${Date.now()}`,
    outputPayload: {
      customerId: `cust_${input.query.toLowerCase().replace(/\s+/g, "_")}`,
      name: input.query,
      email: `${input.query.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: "+234-XXX-XXXX",
    },
  };
}

/**
 * Mock executor for invoice.status capability
 */
export async function executeInvoiceStatus(
  capability: Capability,
  input: { customerId: string; invoiceId?: string },
): Promise<ExecutorResponse> {
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  return {
    success: true,
    externalReference: `invoice_${Date.now()}`,
    outputPayload: {
      invoiceId: input.invoiceId ?? `inv_${Date.now()}`,
      status: "overdue",
      amount: 85000,
      currency: "NGN",
      dueDate: "2026-09-01",
    },
  };
}

/**
 * Mock executor for message.draft capability
 */
export async function executeMessageDraft(
  capability: Capability,
  input: { recipientId: string; templateType: string; context?: Record<string, unknown> },
): Promise<ExecutorResponse> {
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  return {
    success: true,
    externalReference: `draft_${Date.now()}`,
    outputPayload: {
      draftId: `draft_${Date.now()}`,
      content: `[DRAFT] Payment reminder for ${input.recipientId}`,
      recipientId: input.recipientId,
    },
  };
}

/**
 * Mock executor for message.send capability
 */
export async function executeMessageSend(
  capability: Capability,
  input: { recipientId: string; message: string; channel?: string },
): Promise<ExecutorResponse> {
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  // Mock external API call
  return {
    success: true,
    externalReference: `msg_${Date.now()}`,
    outputPayload: {
      messageId: `msg_${Date.now()}`,
      status: "sent",
      sentAt: new Date().toISOString(),
    },
  };
}

/**
 * Mock executor for payment.record capability
 */
export async function executePaymentRecord(
  capability: Capability,
  input: {
    invoiceId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    receivedAt: string;
  },
): Promise<ExecutorResponse> {
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  return {
    success: true,
    externalReference: `pay_${Date.now()}`,
    outputPayload: {
      paymentId: `pay_${Date.now()}`,
      status: "recorded",
    },
  };
}

/**
 * Mock executor for task.create capability
 */
export async function executeTaskCreate(
  capability: Capability,
  input: { title: string; description?: string; assignee?: string; dueDate?: string },
): Promise<ExecutorResponse> {
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  return {
    success: true,
    externalReference: `task_${Date.now()}`,
    outputPayload: {
      taskId: `task_${Date.now()}`,
      status: "created",
    },
  };
}

/**
 * Route capability to appropriate executor
 */
export async function executeMockCapability(
  capability: Capability,
  input: unknown,
): Promise<ExecutorResponse> {
  switch (capability.name) {
    case "customer.lookup":
      return executeCustomerLookup(capability, input as { query: string });
    case "invoice.status":
      return executeInvoiceStatus(
        capability,
        input as { customerId: string; invoiceId?: string },
      );
    case "message.draft":
      return executeMessageDraft(
        capability,
        input as { recipientId: string; templateType: string; context?: Record<string, unknown> },
      );
    case "message.send":
      return executeMessageSend(
        capability,
        input as { recipientId: string; message: string; channel?: string },
      );
    case "payment.record":
      return executePaymentRecord(
        capability,
        input as {
          invoiceId: string;
          amount: number;
          currency: string;
          paymentMethod: string;
          receivedAt: string;
        },
      );
    case "task.create":
      return executeTaskCreate(
        capability,
        input as { title: string; description?: string; assignee?: string; dueDate?: string },
      );
    default:
      return {
        success: false,
        outputPayload: {},
        errorCode: "UNKNOWN_CAPABILITY",
        errorMessage: `No mock executor for capability: ${capability.name}`,
      };
  }
}

