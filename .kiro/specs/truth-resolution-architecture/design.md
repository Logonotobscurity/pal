# Truth Resolution & Evidence Architecture - Technical Design

**Feature**: Truth Resolution & Evidence Architecture  
**Type**: Architectural Enhancement  
**Status**: Design Phase  
**Priority**: High  
**Version**: 1.0

---

## Overview

This design document specifies PAL's comprehensive Truth Resolution & Evidence Architecture, elevating data provenance from an implementation detail to a core product capability. The architecture ensures PAL never confuses "data it received" with "facts it is allowed to believe."

### Core Principle

> **PAL should never confuse "data it received" with "facts it is allowed to believe."**

All material information flows through a rigorous evidence → claim → validation → canonical state pipeline, with explicit provenance tracking at every stage.

---

## High-Level Architecture

### System Flow

```
SOURCES (Voice, Web, Database, APIs, User Input)
          ↓
     INGESTION
          ↓
   EVIDENCE STORE
          ↓
  CLAIM EXTRACTION
          ↓
 TRUTH RESOLVER
   ↓    ↓    ↓
accepted conflict stale
   ↓
CANONICAL STATE
          ↓
   SEMANTIC CORE
          ↓
    ACTION PLAN
          ↓
   POLICY ENGINE
          ↓
 ACTION PROPOSAL
          ↓
  HUMAN APPROVAL
          ↓
     EXECUTION
          ↓
   VERIFICATION
          ↓
AUDIT + EVALUATION
```

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PERCEPTION LAYER                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Sahara  │  │  Search  │  │   APIs   │  │  User  │ │
│  │  Voice   │  │  Engine  │  │          │  │  Input │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     EVIDENCE LAYER                      │
│  • Source records with metadata                         │
│  • Content hashing and verification                     │
│  • Provider attribution                                 │
│  • Timestamp tracking (captured/retrieved)              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                      CLAIM LAYER                        │
│  • Extracted assertions from evidence                   │
│  • Subject-predicate-value triples                      │
│  • Evidence references                                  │
│  • Validation status                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   TRUTH RESOLVER                        │
│  • Source Authority Policy enforcement                  │
│  • Conflict detection and resolution                    │
│  • Freshness evaluation                                 │
│  • Corroboration analysis                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   CANONICAL STATE                       │
│  • Versioned domain model                               │
│  • Provenance-backed fields                             │
│  • Event-sourced transitions                            │
│  • Workspace-scoped                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    REASONING LAYER                      │
│  • Agents consume canonical state only                  │
│  • No direct source access                              │
│  • Provenance-aware decision making                     │
└─────────────────────────────────────────────────────────┘
```

---

## Source Authority Hierarchy

### Priority Matrix

| Priority | Source Type | Example | Use Cases |
|----------|-------------|---------|-----------|
| 1 | Explicit user instruction | "Chinedu pays Thursday" | User intent, corrections |
| 2 | Authoritative transactional system | Payment/CRM record | Financial data, customer status |
| 3 | Verified first-party source | Official company/gov page | Business hours, contact info |
| 4 | Trusted structured provider | Financial/API provider | Market data, real-time feeds |
| 5 | Verified internal document | Company policy | Business rules, procedures |
| 6 | Corroborated secondary sources | Reputable reporting | General information |
| 7 | Search results/snippets | Discovery only | Query expansion, leads |
| 8 | Model inference | Never canonical by itself | Hypothesis generation only |

### Field-Specific Authority

Authority is **context-dependent**:

```typescript
type FieldAuthority = {
  field: string
  preferredSources: SourceType[]
  minimumPriority: number
  requiresCorroboration: boolean
}

// Examples:
const authorityRules: FieldAuthority[] = [
  {
    field: "customerPaymentStatus",
    preferredSources: ["payment_provider", "accounting_system"],
    minimumPriority: 2,
    requiresCorroboration: false
  },
  {
    field: "companyOpeningHours",
    preferredSources: ["first_party_website", "google_business"],
    minimumPriority: 3,
    requiresCorroboration: true
  },
  {
    field: "userIntention",
    preferredSources: ["user_voice", "user_correction"],
    minimumPriority: 1,
    requiresCorroboration: false
  }
]
```

---

## Domain Model Enhancements

### 1. EvidenceRef (Enhanced)


```typescript
export type EvidenceRef = {
  // Identity
  id: string
  sourceId: string
  
  // Classification
  sourceType: "voice" | "web" | "document" | "database" | "api" | "user"
  
  // Location
  locator?: string  // e.g., line number, DOM path, API endpoint
  url?: string
  
  // Temporal
  capturedAt: string  // When source created content
  retrievedAt: string // When PAL ingested it
  
  // Provenance
  provider?: string         // e.g., "sahara", "openai", "stripe"
  providerVersion?: string  // e.g., "v2.1", "gpt-4o-mini"
  
  // Integrity
  contentHash?: string  // SHA256 of source content
  
  // Quality
  confidence?: number  // Provider-assigned confidence (0-1)
  
  // Metadata
  excerpt?: string  // Relevant portion of source
  metadata?: Record<string, unknown>
}
```

### 2. ResearchSource

```typescript
export type ResearchSource = {
  id: string
  runId: string  // Links to research_runs
  
  // Source identification
  url: string
  title?: string
  publisher?: string
  domain?: string
  
  // Temporal
  publishedAt?: string
  retrievedAt: string
  
  // Content
  contentHash: string
  fullContent?: string  // Stored for audit/replay
  
  // Quality
  authorityScore: number  // Computed from domain + type
  freshnessScore: number  // Computed from publishedAt
  
  // Classification
  sourceClass: "primary" | "secondary" | "tertiary"
  contentType: "article" | "documentation" | "blog" | "forum" | "snippet"
  
  createdAt: string
}
```

### 3. Claim

```typescript
export type ClaimStatus = 
  | "pending"      // Not yet evaluated
  | "supported"    // Evidence supports claim
  | "uncertain"    // Insufficient or weak evidence
  | "contradicted" // Conflicting evidence exists
  | "stale"        // Evidence outdated

export type Claim = {
  id: string
  workspaceId: string
  
  // Claim structure (subject-predicate-value)
  subject: string      // e.g., "customer:cust_123"
  predicate: string    // e.g., "outstandingBalance"
  value: unknown       // The claimed value
  valueType: string    // TypeScript type hint
  
  // Provenance
  evidence: EvidenceRef[]
  
  // Validation
  status: ClaimStatus
  confidence: number  // Aggregate confidence (0-1)
  
  // Resolution
  acceptedAt?: string
  rejectedAt?: string
  supersededBy?: string  // Claim ID that replaced this
  
  // Conflict tracking
  conflictsWith?: string[]  // Claim IDs
  
  // Metadata
  extractedBy: {
    agent: string
    model?: string
    version: string
  }
  
  createdAt: string
  updatedAt: string
}
```

### 4. CanonicalState (Generic)

```typescript
export type CanonicalState<T> = {
  workspaceId: string
  entityId: string
  entityType: string
  
  // Current state
  data: T
  version: number
  
  // Provenance for each field
  provenance: Record<keyof T, {
    claims: string[]      // Claim IDs supporting this field
    acceptedAt: string
    authority: number     // Source priority
  }>
  
  // Change tracking
  previousVersion?: string
  changedFields?: Array<keyof T>
  
  // Metadata
  updatedAt: string
  updatedBy: string  // User or agent that triggered update
}
```

### 5. CustomerState (Example Domain State)

```typescript
export type CustomerState = CanonicalState<{
  customerId: string
  name: string
  
  outstandingBalance?: {
    amount: number
    currency: string
  }
  
  paymentCommitment?: {
    date: string
    method?: string
  }
  
  lastContact?: {
    date: string
    channel: string
  }
  
  preferences?: {
    language: string
    timezone: string
  }
}>
```

### 6. ConflictResolution

```typescript
export type ConflictResolution = {
  id: string
  workspaceId: string
  
  // Conflict description
  field: string
  entityId: string
  entityType: string
  
  // Competing claims
  claims: string[]  // Claim IDs in conflict
  
  // Resolution strategy
  strategy: 
    | "authority_priority"      // Highest authority wins
    | "freshness"               // Most recent wins
    | "user_confirmation"       // Requires explicit user choice
    | "corroboration"           // Most corroborated wins
    | "explicit_instruction"    // User correction takes precedence
  
  // Resolution outcome
  selectedClaim?: string
  reason: string
  
  // Audit
  resolvedBy: "system" | "user"
  resolvedAt: string
  
  createdAt: string
}
```

---

## Truth Resolver Logic

### Resolution Flow

```
1. New Claim Arrives
         ↓
2. Check for Existing Claims (same subject + predicate)
         ↓
   ┌─────┴─────┐
   │ No        │ Yes
   ↓           ↓
Accept    3. Detect Conflict
   ↓           ↓
   │     4. Evaluate Sources
   │           ↓
   │     5. Apply Resolution Strategy
   │           ↓
   │     ┌─────┴─────┐
   │     │           │
   │  Auto-resolve  Require User
   │     │           │
   │     ↓           ↓
   └──→ 6. Update Canonical State
         ↓
   7. Emit State Change Event
```

### Resolution Algorithm

```typescript
class TruthResolver {
  async resolveClaim(
    claim: Claim,
    existingClaims: Claim[]
  ): Promise<ResolutionDecision> {
    // 1. No conflict - accept immediately
    if (existingClaims.length === 0) {
      return { action: "accept", claim }
    }
    
    // 2. Check if claim is identical to existing (duplicate)
    const identical = existingClaims.find(c => 
      deepEqual(c.value, claim.value) &&
      c.status === "supported"
    )
    if (identical) {
      return { action: "merge", existingClaim: identical }
    }
    
    // 3. Detect conflict
    const conflicts = existingClaims.filter(c => 
      !deepEqual(c.value, claim.value) &&
      c.status !== "superseded"
    )
    
    if (conflicts.length === 0) {
      return { action: "accept", claim }
    }
    
    // 4. Get field-specific authority rules
    const rules = await this.getAuthorityRules(
      claim.subject,
      claim.predicate
    )
    
    // 5. Compute authority scores
    const scores = await Promise.all([
      this.computeAuthorityScore(claim, rules),
      ...conflicts.map(c => this.computeAuthorityScore(c, rules))
    ])
    
    // 6. Apply resolution strategy
    const strategy = this.selectStrategy(claim, conflicts, rules)
    
    switch (strategy) {
      case "authority_priority":
        return this.resolveByAuthority(claim, conflicts, scores)
      
      case "freshness":
        return this.resolveByFreshness(claim, conflicts)
      
      case "explicit_instruction":
        // User corrections always win
        if (claim.evidence.some(e => e.sourceType === "user")) {
          return {
            action: "supersede",
            claim,
            superseded: conflicts.map(c => c.id),
            requiresConfirmation: this.isFinancialField(claim.predicate)
          }
        }
        break
      
      case "user_confirmation":
        return {
          action: "require_confirmation",
          claim,
          conflicts,
          reason: "Multiple high-authority sources disagree"
        }
    }
    
    // Default: require user confirmation for unresolved conflicts
    return {
      action: "require_confirmation",
      claim,
      conflicts,
      reason: "Cannot auto-resolve conflict"
    }
  }
  
  private async computeAuthorityScore(
    claim: Claim,
    rules: FieldAuthority
  ): Promise<number> {
    let score = 0
    
    for (const evidenceRef of claim.evidence) {
      // Get source record
      const source = await this.getSource(evidenceRef.sourceId)
      
      // Map source type to priority
      const priority = this.getSourcePriority(source.type)
      
      // Check if source is in preferred list
      const isPreferred = rules.preferredSources.includes(source.type)
      
      // Compute freshness factor
      const freshness = this.computeFreshness(evidenceRef.retrievedAt)
      
      // Combine factors
      const sourceScore = (
        priority * 10 +
        (isPreferred ? 5 : 0) +
        freshness * 2 +
        (evidenceRef.confidence ?? 0.5) * 3
      )
      
      score = Math.max(score, sourceScore)
    }
    
    return score
  }
  
  private selectStrategy(
    claim: Claim,
    conflicts: Claim[],
    rules: FieldAuthority
  ): ResolutionStrategy {
    // User corrections always use explicit_instruction strategy
    if (claim.evidence.some(e => e.sourceType === "user")) {
      return "explicit_instruction"
    }
    
    // Financial fields require confirmation unless from authoritative system
    if (this.isFinancialField(claim.predicate)) {
      const hasAuthoritativeSource = claim.evidence.some(e => 
        this.getSourcePriority(e.sourceType) <= 2
      )
      if (!hasAuthoritativeSource) {
        return "user_confirmation"
      }
    }
    
    // If field requires corroboration, check count
    if (rules.requiresCorroboration) {
      const corroborationCount = this.countCorroboration(claim, conflicts)
      if (corroborationCount < 2) {
        return "user_confirmation"
      }
    }
    
    // Default to authority-based resolution
    return "authority_priority"
  }
}
```

---

## Database Schema

### New Tables

#### 1. sources

```sql
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Classification
  source_type TEXT NOT NULL CHECK (source_type IN (
    'voice', 'web', 'document', 'database', 'api', 'user'
  )),
  
  -- Location
  url TEXT,
  locator TEXT,
  
  -- Content
  content_hash TEXT NOT NULL,
  full_content TEXT,  -- May be large, consider separate storage
  excerpt TEXT,
  
  -- Provenance
  provider TEXT,
  provider_version TEXT,
  
  -- Temporal
  captured_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_workspace ON public.sources(workspace_id);
CREATE INDEX idx_sources_type ON public.sources(source_type);
CREATE INDEX idx_sources_hash ON public.sources(content_hash);
CREATE INDEX idx_sources_retrieved ON public.sources(retrieved_at);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read sources"
  ON public.sources FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can insert sources"
  ON public.sources FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
```

#### 2. evidence_refs

```sql
CREATE TABLE public.evidence_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  
  -- Reference details
  excerpt TEXT,
  confidence DECIMAL(3, 2) CHECK (confidence BETWEEN 0 AND 1),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_workspace ON public.evidence_refs(workspace_id);
CREATE INDEX idx_evidence_source ON public.evidence_refs(source_id);

ALTER TABLE public.evidence_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read evidence"
  ON public.evidence_refs FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
```

#### 3. claims

```sql
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Claim structure
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  value JSONB NOT NULL,
  value_type TEXT NOT NULL,
  
  -- Validation
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'supported', 'uncertain', 'contradicted', 'stale', 'superseded'
  )) DEFAULT 'pending',
  confidence DECIMAL(3, 2) CHECK (confidence BETWEEN 0 AND 1),
  
  -- Resolution
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES public.claims(id),
  
  -- Extraction metadata
  extracted_by_agent TEXT NOT NULL,
  extracted_by_model TEXT,
  extracted_by_version TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_workspace ON public.claims(workspace_id);
CREATE INDEX idx_claims_subject ON public.claims(subject);
CREATE INDEX idx_claims_predicate ON public.claims(predicate);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_subject_predicate ON public.claims(subject, predicate);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read claims"
  ON public.claims FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can insert claims"
  ON public.claims FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can update claims"
  ON public.claims FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
```

#### 4. claim_evidence (join table)

```sql
CREATE TABLE public.claim_evidence (
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  evidence_ref_id UUID NOT NULL REFERENCES public.evidence_refs(id) ON DELETE CASCADE,
  
  -- Join metadata
  relevance_score DECIMAL(3, 2) CHECK (relevance_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (claim_id, evidence_ref_id)
);

CREATE INDEX idx_claim_evidence_claim ON public.claim_evidence(claim_id);
CREATE INDEX idx_claim_evidence_evidence ON public.claim_evidence(evidence_ref_id);

-- RLS inherits from claims and evidence_refs via foreign keys
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read claim evidence"
  ON public.claim_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_evidence.claim_id
        AND public.is_workspace_member(c.workspace_id)
    )
  );
```

#### 5. claim_conflicts

```sql
CREATE TABLE public.claim_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Conflict identification
  field TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  
  -- Competing claims
  claim_ids UUID[] NOT NULL,
  
  -- Resolution
  strategy TEXT NOT NULL CHECK (strategy IN (
    'authority_priority',
    'freshness',
    'user_confirmation',
    'corroboration',
    'explicit_instruction'
  )),
  selected_claim_id UUID REFERENCES public.claims(id),
  reason TEXT NOT NULL,
  
  -- Audit
  resolved_by TEXT CHECK (resolved_by IN ('system', 'user')),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conflicts_workspace ON public.claim_conflicts(workspace_id);
CREATE INDEX idx_conflicts_entity ON public.claim_conflicts(entity_id, entity_type);
CREATE INDEX idx_conflicts_resolved ON public.claim_conflicts(resolved_at);

ALTER TABLE public.claim_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read conflicts"
  ON public.claim_conflicts FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
```

#### 6. canonical_states

```sql
CREATE TABLE public.canonical_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Entity identification
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  
  -- State data
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Provenance (field → claims mapping)
  provenance JSONB NOT NULL DEFAULT '{}',
  
  -- Change tracking
  previous_version_id UUID REFERENCES public.canonical_states(id),
  changed_fields TEXT[],
  
  -- Metadata
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(workspace_id, entity_id, entity_type, version)
);

CREATE INDEX idx_canonical_workspace ON public.canonical_states(workspace_id);
CREATE INDEX idx_canonical_entity ON public.canonical_states(entity_id, entity_type);
CREATE INDEX idx_canonical_version ON public.canonical_states(version);
CREATE INDEX idx_canonical_latest ON public.canonical_states(workspace_id, entity_id, entity_type, version DESC);

ALTER TABLE public.canonical_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read canonical states"
  ON public.canonical_states FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can insert canonical states"
  ON public.canonical_states FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
```

#### 7. research_runs

```sql
CREATE TABLE public.research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Query
  query TEXT NOT NULL,
  query_type TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Results summary
  source_count INTEGER DEFAULT 0,
  claim_count INTEGER DEFAULT 0,
  
  -- Metadata
  triggered_by TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_workspace ON public.research_runs(workspace_id);
CREATE INDEX idx_research_started ON public.research_runs(started_at);

ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read research runs"
  ON public.research_runs FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
```

#### 8. research_sources

```sql
CREATE TABLE public.research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Source identification
  url TEXT NOT NULL,
  title TEXT,
  publisher TEXT,
  domain TEXT,
  
  -- Temporal
  published_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Content
  content_hash TEXT NOT NULL,
  full_content TEXT,
  
  -- Quality scores
  authority_score DECIMAL(3, 2) CHECK (authority_score BETWEEN 0 AND 1),
  freshness_score DECIMAL(3, 2) CHECK (freshness_score BETWEEN 0 AND 1),
  
  -- Classification
  source_class TEXT CHECK (source_class IN ('primary', 'secondary', 'tertiary')),
  content_type TEXT CHECK (content_type IN ('article', 'documentation', 'blog', 'forum', 'snippet')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_sources_run ON public.research_sources(run_id);
CREATE INDEX idx_research_sources_workspace ON public.research_sources(workspace_id);
CREATE INDEX idx_research_sources_url ON public.research_sources(url);
CREATE INDEX idx_research_sources_domain ON public.research_sources(domain);

ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read research sources"
  ON public.research_sources FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));
```

---

## Service Architecture

### Directory Structure

```
src/
├── core/
│   ├── domain/
│   │   ├── Evidence.ts
│   │   ├── Claim.ts
│   │   ├── CanonicalState.ts
│   │   ├── CustomerState.ts (example)
│   │   └── ConflictResolution.ts
│   │
│   ├── schemas/
│   │   ├── evidence.ts
│   │   ├── claim.ts
│   │   ├── canonical-state.ts
│   │   └── research.ts
│   │
│   └── policies/
│       ├── source-authority.ts
│       └── field-authority.ts
│
├── services/
│   ├── evidence/
│   │   ├── ingestion.ts
│   │   ├── extraction.ts
│   │   └── db.ts
│   │
│   ├── claims/
│   │   ├── extractor.ts
│   │   ├── validator.ts
│   │   └── db.ts
│   │
│   ├── truth-resolver/
│   │   ├── resolver.ts
│   │   ├── conflict-detector.ts
│   │   ├── authority-scorer.ts
│   │   └── resolution-strategies.ts
│   │
│   ├── canonical-state/
│   │   ├── state-manager.ts
│   │   ├── versioning.ts
│   │   └── db.ts
│   │
│   └── research/
│       ├── source-fetcher.ts
│       ├── source-evaluator.ts
│       ├── claim-extractor.ts
│       └── evidence-graph.ts
│
└── app/
    └── api/
        ├── evidence/
        │   ├── ingest/route.ts
        │   └── [id]/route.ts
        │
        ├── claims/
        │   ├── extract/route.ts
        │   ├── validate/route.ts
        │   └── [id]/route.ts
        │
        ├── truth/
        │   ├── resolve/route.ts
        │   └── conflicts/route.ts
        │
        ├── state/
        │   ├── [entityType]/[entityId]/route.ts
        │   └── [entityType]/[entityId]/history/route.ts
        │
        └── research/
            ├── runs/route.ts
            ├── sources/route.ts
            └── claims/route.ts
```

---

## Integration with Existing PAL Pipeline

### Modified Flow

**BEFORE (Phase 3):**
```
Voice → Speech → Meaning → Plan → Policy → Proposal → Execution → Verification
```

**AFTER (With Truth Resolution):**
```
Voice → Speech 
        ↓
    Evidence Store
        ↓
    Claim Extraction
        ↓
    Truth Resolver
        ↓
    Canonical State
        ↓
    Meaning (reads from canonical state)
        ↓
    Plan → Policy → Proposal → Execution → Verification
```

### Backward Compatibility

Existing Phase 3 components continue to work:
- **Semantic Agent**: Enhanced to write claims instead of directly creating MeaningState
- **Workflow Agent**: Reads from canonical state instead of raw MeaningState
- **Policy Engine**: Unchanged
- **Execution/Verification**: Unchanged

---

## Field-Level Confidence Tracking

### Enhanced MeaningState

```typescript
export type EnhancedMeaningState = {
  id: string
  speechEventId: string
  
  intent: Intent
  entities: Entity[]
  constraints: Constraint[]
  
  // NEW: Field-level confidence from canonical state
  fieldConfidence: Record<string, {
    value: number
    sources: EvidenceRef[]
    lastUpdated: string
  }>
  
  // NEW: Critical fields that failed confidence threshold
  blockedFields: string[]
  
  contextSufficiency: "sufficient" | "insufficient" | "conflicting"
  
  // Links to canonical state
  canonicalStateIds: string[]
  
  createdAt: string
}
```

### Critical Field Blocking (Enhanced)

```typescript
const CRITICAL_FIELDS = [
  "recipient",
  "amount",
  "currency",
  "date",
  "time",
  "negation",
  "paymentStatus",
  "destination",
  "customer",
  "invoice"
]

function checkCriticalFields(
  meaningState: EnhancedMeaningState,
  threshold: number = 0.85
): {
  canProceed: boolean
  blockedFields: string[]
  reason: string
} {
  const blocked: string[] = []
  
  for (const field of CRITICAL_FIELDS) {
    const confidence = meaningState.fieldConfidence[field]
    
    if (!confidence) continue
    
    if (confidence.value < threshold) {
      blocked.push(field)
    }
  }
  
  if (blocked.length > 0) {
    return {
      canProceed: false,
      blockedFields: blocked,
      reason: `Critical fields below confidence threshold: ${blocked.join(", ")}`
    }
  }
  
  return {
    canProceed: true,
    blockedFields: [],
    reason: ""
  }
}
```

---

## Vector Database Integration

### Retrieval Architecture

```
┌─────────────────────────────────────┐
│      Canonical State (PostgreSQL)   │  ← Source of truth
│   • Versioned domain model          │
│   • Provenance-backed fields        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│     Evidence Store (PostgreSQL)     │  ← Content + metadata
│   • Full source content             │
│   • Structured metadata             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Vector Index (pgvector/external) │  ← Retrieval mechanism
│   • Embeddings for semantic search  │
│   • Used for discovery only         │
└─────────────────────────────────────┘
```

### Usage Pattern

```typescript
// CORRECT: Vectors for retrieval, Postgres for truth
async function retrieveRelevantEvidence(
  query: string
): Promise<EvidenceRef[]> {
  // 1. Vector similarity search
  const candidateIds = await vectorDB.similaritySearch(query, {
    limit: 20,
    threshold: 0.7
  })
  
  // 2. Fetch full evidence from Postgres
  const evidence = await db.evidence_refs
    .select('*')
    .whereIn('id', candidateIds)
    .where('workspace_id', workspaceId)  // Enforce tenancy
  
  // 3. Verify each piece of evidence
  return evidence.map(e => ({
    ...e,
    retrievalScore: e.vectorScore,  // Informational only
    canonicalData: await fetchCanonicalState(e.sourceId)  // Truth from Postgres
  }))
}

// INCORRECT: Don't treat vector score as truth
async function incorrectUsage(query: string) {
  const results = await vectorDB.search(query)
  
  // ❌ DO NOT DO THIS
  return results[0].content  // Vector result ≠ verified truth
}
```

---

## Migration Strategy

### Phase 1: Evidence Layer (Non-Breaking)
- Add new tables (sources, evidence_refs, claims, etc.)
- Keep existing tables unchanged
- Both systems run in parallel
- Gradually migrate ingestion to evidence layer

### Phase 2: Claim Extraction (Additive)
- Enhance Semantic Agent to write claims
- Keep writing to existing meaning_states table
- Verify claim extraction accuracy

### Phase 3: Truth Resolution (New Capability)
- Enable truth resolver
- Start populating canonical_states
- Agents can read from either source

### Phase 4: Cutover (Breaking)
- Agents read exclusively from canonical_states
- Deprecate direct meaning_states access
- Archive old pipeline

---

## Testing Strategy

### Unit Tests
- Evidence ingestion
- Claim extraction
- Conflict detection
- Resolution strategies
- Authority scoring

### Integration Tests
- End-to-end evidence pipeline
- Multi-source conflict resolution
- Canonical state versioning
- Research evidence graph

### Property-Based Tests
```typescript
// Property: Canonical state always has provenance
property("canonical state has complete provenance", () => {
  const state = generateCanonicalState()
  for (const field in state.data) {
    assert(state.provenance[field] !== undefined)
    assert(state.provenance[field].claims.length > 0)
  }
})

// Property: Higher authority always wins (when using authority strategy)
property("authority resolution respects priority", () => {
  const highAuthClaim = generateClaim({ authority: 2 })
  const lowAuthClaim = generateClaim({ authority: 7 })
  
  const decision = resolver.resolveClaim(highAuthClaim, [lowAuthClaim])
  
  assert(decision.action === "supersede")
  assert(decision.selectedClaim === highAuthClaim.id)
})

// Property: User corrections always supersede
property("user corrections always win", () => {
  const userClaim = generateClaim({ sourceType: "user" })
  const systemClaim = generateClaim({ sourceType: "database", authority: 2 })
  
  const decision = resolver.resolveClaim(userClaim, [systemClaim])
  
  assert(decision.action === "supersede")
  assert(decision.selectedClaim === userClaim.id)
})
```

---

## Performance Considerations

### Indexing Strategy
- Composite index on (workspace_id, entity_id, entity_type) for canonical_states
- GiST index on JSONB fields for fast queries
- Partial indexes on active claims (status != 'superseded')

### Caching
- Cache canonical state per entity (Redis/in-memory)
- Invalidate on version change
- TTL: 5 minutes for non-financial, 30 seconds for financial

### Pagination
- Claims and evidence: cursor-based pagination
- Research sources: offset-based with limit 100

---

## Security Considerations

### RLS Enforcement
- All new tables enforce workspace tenancy via RLS
- Evidence can only be accessed by workspace members
- Canonical state is workspace-scoped

### Content Safety
- Web sources: untrusted input, never execute instructions
- User input: validated, sanitized, but trusted for intent
- API sources: validated against schema, rate-limited

### Audit Trail
- Every claim tracks who extracted it
- Every resolution tracks who/what resolved it
- Canonical state tracks who updated it
- Complete provenance chain to source

---

## Monitoring & Observability

### Metrics
- Claim extraction rate (claims/minute)
- Conflict detection rate (conflicts/hour)
- Resolution accuracy (% auto-resolved correctly)
- Evidence freshness (age distribution)
- Canonical state update frequency

### Alerts
- High conflict rate (> 10%)
- Resolution failures (> 5%)
- Evidence ingestion delays (> 5 minutes)
- Low confidence claims entering canonical state (< 0.7)

### Dashboards
- Evidence pipeline health
- Conflict resolution stats
- Source authority distribution
- Canonical state coverage

---

## Documentation Requirements

1. **Developer Guide**: Evidence ingestion, claim extraction patterns
2. **Truth Resolver Guide**: Resolution strategies, authority configuration
3. **Migration Guide**: Transitioning from Phase 3 to evidence architecture
4. **API Reference**: New endpoints, schemas, examples
5. **Operational Runbook**: Monitoring, troubleshooting, manual resolution

---

## Success Criteria

### Functional
- ✅ All sources tracked with full provenance
- ✅ Claims extracted from evidence with confidence scores
- ✅ Conflicts detected and resolved automatically (>80%)
- ✅ Canonical state always has evidence references
- ✅ User corrections always supersede system claims
- ✅ Financial fields blocked when confidence < threshold

### Non-Functional
- ✅ Evidence ingestion < 200ms p95
- ✅ Claim extraction < 500ms p95
- ✅ Truth resolution < 1s p95
- ✅ Canonical state queries < 50ms p95
- ✅ Zero data loss in provenance chain
- ✅ 100% RLS enforcement

### Quality
- ✅ Property-based tests pass
- ✅ Integration tests cover all resolution strategies
- ✅ Benchmark shows improved semantic accuracy
- ✅ Manual testing confirms conflict resolution UX

---

## Open Questions

1. **Vector Database**: pgvector vs dedicated vector DB (Qdrant, Pinecone)?
2. **Conflict UI**: How should users be presented with conflicts requiring manual resolution?
3. **Historical States**: How long to retain old canonical state versions?
4. **Cross-Workspace**: Should research sources be shared across workspaces?
5. **Confidence Aggregation**: How to combine multiple weak evidence into strong claim?

---

## Next Steps

1. Review and approve this design document
2. Create requirements document (if not using design-first)
3. Break down into implementation tasks
4. Start with Phase 1 (Evidence Layer)
5. Iterate with benchmarking

---

**Design Version**: 1.0  
**Last Updated**: September 15, 2026  
**Status**: Ready for Review
