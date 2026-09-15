-- Migration: Verification Results (Verification Agent output)
-- Implements PAL_ARCHITECTURE.md §25
-- Phase 3, Task 3.5: Verification Agent

-- Verification Results table: stores verification outcomes for execution attempts
CREATE TABLE IF NOT EXISTS verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Domain identifiers
  verification_id TEXT NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL,
  
  -- Verification outcome
  verified BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('verified', 'failed', 'unverified')
  ),
  
  -- Verification details
  external_reference TEXT,
  expected_outcome TEXT,
  actual_outcome TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT verification_id_format CHECK (verification_id ~ '^verify_[a-zA-Z0-9_-]+$'),
  CONSTRAINT execution_id_format CHECK (execution_id ~ '^exec_[a-zA-Z0-9_-]+$')
);

-- Indexes for verification_results
CREATE INDEX idx_verification_results_workspace ON verification_results(workspace_id);
CREATE INDEX idx_verification_results_execution ON verification_results(execution_id);
CREATE INDEX idx_verification_results_status ON verification_results(status);
CREATE INDEX idx_verification_results_verified ON verification_results(verified);
CREATE INDEX idx_verification_results_created ON verification_results(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_verification_results_workspace_execution ON verification_results(workspace_id, execution_id);
CREATE INDEX idx_verification_results_workspace_status ON verification_results(workspace_id, status);

-- RLS: Enable row-level security
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: workspace members can read verification results
CREATE POLICY "workspace_members_read_verifications"
ON verification_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = verification_results.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- RLS Policy: workspace members can insert verification results
CREATE POLICY "workspace_members_insert_verifications"
ON verification_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = verification_results.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Comments
COMMENT ON TABLE verification_results IS 'Verification outcomes for executed actions';
COMMENT ON COLUMN verification_results.verification_id IS 'Stable domain identifier for the verification';
COMMENT ON COLUMN verification_results.execution_id IS 'Parent execution attempt';
COMMENT ON COLUMN verification_results.verified IS 'Whether external effect matches expectations';
COMMENT ON COLUMN verification_results.status IS 'Verification lifecycle: verified | failed | unverified';
COMMENT ON COLUMN verification_results.external_reference IS 'Provider-returned identifier for external tracking';
COMMENT ON COLUMN verification_results.expected_outcome IS 'What the action was expected to do';
COMMENT ON COLUMN verification_results.actual_outcome IS 'What actually happened according to provider';
COMMENT ON COLUMN verification_results.notes IS 'Human-readable verification details';
COMMENT ON COLUMN verification_results.checked_at IS 'When verification was performed';

