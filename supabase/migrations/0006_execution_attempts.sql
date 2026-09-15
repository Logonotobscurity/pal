-- Migration: Execution Attempts (Execution Service output)
-- Implements PAL_ARCHITECTURE.md §30, §33-34
-- Phase 3, Task 3.4: Execution Service

-- Execution Attempts table: stores all execution attempts for approved proposals
CREATE TABLE IF NOT EXISTS execution_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Domain identifiers
  execution_id TEXT NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL,
  
  -- Idempotency
  idempotency_key TEXT NOT NULL UNIQUE,  -- SHA256(workspaceId + proposalId + version) from §33
  
  -- Execution details
  capability TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  output_payload JSONB,
  
  -- Lifecycle
  status TEXT NOT NULL CHECK (
    status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  
  -- External reference
  external_reference TEXT,  -- Provider-returned identifier
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT execution_id_format CHECK (execution_id ~ '^exec_[a-zA-Z0-9_-]+$'),
  CONSTRAINT proposal_id_format CHECK (proposal_id ~ '^proposal_[a-zA-Z0-9_-]+$'),
  CONSTRAINT idempotency_key_format CHECK (idempotency_key ~ '^[a-f0-9]{64}$')
);

-- Indexes for execution_attempts
CREATE INDEX idx_execution_attempts_workspace ON execution_attempts(workspace_id);
CREATE INDEX idx_execution_attempts_proposal ON execution_attempts(proposal_id);
CREATE INDEX idx_execution_attempts_status ON execution_attempts(status);
CREATE INDEX idx_execution_attempts_idempotency ON execution_attempts(idempotency_key);
CREATE INDEX idx_execution_attempts_created ON execution_attempts(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_execution_attempts_workspace_status ON execution_attempts(workspace_id, status);
CREATE INDEX idx_execution_attempts_workspace_proposal ON execution_attempts(workspace_id, proposal_id);

-- RLS: Enable row-level security
ALTER TABLE execution_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: workspace members can read execution attempts
CREATE POLICY "workspace_members_read_executions"
ON execution_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = execution_attempts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- RLS Policy: workspace members can insert execution attempts
CREATE POLICY "workspace_members_insert_executions"
ON execution_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = execution_attempts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- RLS Policy: workspace members can update execution attempts (for status changes)
CREATE POLICY "workspace_members_update_executions"
ON execution_attempts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = execution_attempts.workspace_id
      AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = execution_attempts.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Comments
COMMENT ON TABLE execution_attempts IS 'Execution attempts for approved action proposals';
COMMENT ON COLUMN execution_attempts.execution_id IS 'Stable domain identifier for the execution';
COMMENT ON COLUMN execution_attempts.proposal_id IS 'Parent approved proposal';
COMMENT ON COLUMN execution_attempts.idempotency_key IS 'SHA256 deterministic key prevents duplicate external execution (§33)';
COMMENT ON COLUMN execution_attempts.capability IS 'Capability being executed (e.g., message.send)';
COMMENT ON COLUMN execution_attempts.provider IS 'External provider handling execution';
COMMENT ON COLUMN execution_attempts.input_payload IS 'Validated input parameters sent to provider';
COMMENT ON COLUMN execution_attempts.output_payload IS 'Provider response payload';
COMMENT ON COLUMN execution_attempts.status IS 'Execution lifecycle status';
COMMENT ON COLUMN execution_attempts.external_reference IS 'Provider-returned identifier for external tracking';
COMMENT ON COLUMN execution_attempts.error_code IS 'Error code if execution failed';
COMMENT ON COLUMN execution_attempts.error_message IS 'Error detail if execution failed';

