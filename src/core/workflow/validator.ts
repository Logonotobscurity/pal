/**
 * WorkflowIR Validator — Validate workflow graphs before execution
 * 
 * Implements PAL_ARCHITECTURE.md §21: Constrained WorkflowIR validation
 * 
 * Validates:
 * - All capabilities exist in registry
 * - No malformed edges
 * - No cycles (where unsupported)
 * - Approval nodes exist for consequential actions
 * - All node IDs are unique
 * - All edge references point to valid nodes
 */

import type { WorkflowIR, WorkflowNode, WorkflowEdge } from "@/core/schemas/workflow-ir";
import { getCapability, hasCapability } from "@/core/capabilities/registry";

export type ValidationError = {
  code: string;
  message: string;
  nodeId?: string;
  edgeIndex?: number;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

/**
 * Validate a complete WorkflowIR
 */
export function validateWorkflowIR(workflow: WorkflowIR): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate nodes
  const nodeValidation = validateNodes(workflow.nodes);
  errors.push(...nodeValidation.errors);
  warnings.push(...nodeValidation.warnings);

  // Validate edges
  const edgeValidation = validateEdges(workflow.nodes, workflow.edges);
  errors.push(...edgeValidation.errors);
  warnings.push(...edgeValidation.warnings);

  // Validate approval requirements
  const approvalValidation = validateApprovalRequirements(workflow.nodes, workflow.edges);
  errors.push(...approvalValidation.errors);
  warnings.push(...approvalValidation.warnings);

  // Validate for cycles (currently not allowed)
  const cycleValidation = validateNoCycles(workflow.nodes, workflow.edges);
  errors.push(...cycleValidation.errors);
  warnings.push(...cycleValidation.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all nodes in the workflow
 */
function validateNodes(nodes: WorkflowNode[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    // Check for duplicate node IDs
    if (nodeIds.has(node.id)) {
      errors.push({
        code: "DUPLICATE_NODE_ID",
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);

    // Validate node-specific requirements
    if ((node.type === "agent" || node.type === "action") && node.capability) {
      // Check if capability exists
      if (!hasCapability(node.capability)) {
        errors.push({
          code: "UNKNOWN_CAPABILITY",
          message: `Unknown capability: ${node.capability}`,
          nodeId: node.id,
        });
      }
    }

    // Validate agent nodes have capabilities
    if (node.type === "agent" && !node.capability) {
      errors.push({
        code: "MISSING_CAPABILITY",
        message: `Agent node ${node.id} must have a capability`,
        nodeId: node.id,
      });
    }

    // Validate action nodes have capabilities
    if (node.type === "action" && !node.capability) {
      errors.push({
        code: "MISSING_CAPABILITY",
        message: `Action node ${node.id} must have a capability`,
        nodeId: node.id,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate all edges in the workflow
 */
function validateEdges(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!edge) continue;

    // Check if 'from' node exists
    if (!nodeIds.has(edge.from)) {
      errors.push({
        code: "INVALID_EDGE_FROM",
        message: `Edge references non-existent 'from' node: ${edge.from}`,
        edgeIndex: i,
      });
    }

    // Check if 'to' node exists
    if (!nodeIds.has(edge.to)) {
      errors.push({
        code: "INVALID_EDGE_TO",
        message: `Edge references non-existent 'to' node: ${edge.to}`,
        edgeIndex: i,
      });
    }

    // Check for self-loops
    if (edge.from === edge.to) {
      errors.push({
        code: "SELF_LOOP",
        message: `Edge creates a self-loop on node: ${edge.from}`,
        edgeIndex: i,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate that consequential actions have approval nodes
 */
function validateApprovalRequirements(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Find all action nodes that require approval
  const actionNodesThatRequireApproval = nodes.filter((node) => {
    if (node.type !== "action" || !node.capability) {
      return false;
    }

    const capability = getCapability(node.capability);
    return capability?.requiresApproval ?? false;
  });

  // Check if each action node has an approval node before it
  for (const actionNode of actionNodesThatRequireApproval) {
    const hasApprovalBefore = hasApprovalNodeBefore(actionNode.id, nodes, edges);
    
    if (!hasApprovalBefore) {
      errors.push({
        code: "MISSING_APPROVAL",
        message: `Action node ${actionNode.id} requires approval but has no approval node before it`,
        nodeId: actionNode.id,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a node has an approval node somewhere before it in the graph
 */
function hasApprovalNodeBefore(nodeId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const visited = new Set<string>();
  const queue: string[] = [nodeId];

  // Traverse backwards through the graph
  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const currentNode = nodes.find((n) => n.id === currentId);
    if (currentNode?.type === "approval") {
      return true;
    }

    // Find all nodes that point to the current node
    const incomingEdges = edges.filter((e) => e.to === currentId);
    for (const edge of incomingEdges) {
      queue.push(edge.from);
    }
  }

  return false;
}

/**
 * Validate that the workflow has no cycles
 */
function validateNoCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    // Find all outgoing edges
    const outgoingEdges = edges.filter((e) => e.from === nodeId);
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.to)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check each node for cycles
  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      errors.push({
        code: "CYCLE_DETECTED",
        message: `Cycle detected in workflow starting from node: ${node.id}`,
        nodeId: node.id,
      });
      break; // Report first cycle only
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate workflow connectivity (all nodes should be reachable)
 */
export function validateConnectivity(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Find nodes with no incoming edges (potential start nodes)
  const nodesWithIncoming = new Set(edges.map((e) => e.to));
  const startNodes = nodes.filter((n) => !nodesWithIncoming.has(n.id));

  if (startNodes.length === 0 && nodes.length > 0) {
    warnings.push({
      code: "NO_START_NODE",
      message: "Workflow has no clear start node (all nodes have incoming edges)",
    });
  }

  // Find nodes with no outgoing edges (potential end nodes)
  const nodesWithOutgoing = new Set(edges.map((e) => e.from));
  const endNodes = nodes.filter((n) => !nodesWithOutgoing.has(n.id));

  if (endNodes.length === 0 && nodes.length > 0) {
    warnings.push({
      code: "NO_END_NODE",
      message: "Workflow has no clear end node (all nodes have outgoing edges)",
    });
  }

  // Find unreachable nodes
  const reachable = new Set<string>();
  
  function markReachable(nodeId: string): void {
    if (reachable.has(nodeId)) {
      return;
    }
    reachable.add(nodeId);
    
    const outgoingEdges = edges.filter((e) => e.from === nodeId);
    for (const edge of outgoingEdges) {
      markReachable(edge.to);
    }
  }

  for (const startNode of startNodes) {
    markReachable(startNode.id);
  }

  for (const node of nodes) {
    if (!reachable.has(node.id) && startNodes.length > 0) {
      warnings.push({
        code: "UNREACHABLE_NODE",
        message: `Node ${node.id} is not reachable from any start node`,
        nodeId: node.id,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
