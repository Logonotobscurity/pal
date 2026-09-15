/**
 * PAL Pipeline Evaluator
 * 
 * Runs complete PAL pipeline on benchmark datasets and measures quality
 * across all 5 tiers:
 * 
 * Tier 1: Transcription (WER, code-switch detection)
 * Tier 2: Information Extraction (critical fields, entities)
 * Tier 3: Semantic Understanding (intent, constraints, ambiguity)
 * Tier 4: Action Quality (workflow correctness, policy compliance)
 * Tier 5: Safety & Reliability (blocking, provenance, hallucination)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SemanticAgent } from '@/services/semantic/agent';
import { WorkflowAgent } from '@/services/workflow/agent';
import { PolicyEngine } from '@/services/policy/engine';
import type { SpeechEvent } from '@/core/schemas/speech-event';
import type { MeaningState } from '@/core/schemas/meaning-state';
import type { ActionPlan } from '@/core/schemas/action-plan';
import type { ActionProposal } from '@/core/schemas/action-proposal';

// Types
interface BenchmarkSample {
  id: string;
  audio_path: string;
  reference_transcript: string;
  language_spans: Array<{ start: number; end: number; language: string }>;
  code_switches: Array<{ start: number; end: number; language: string }>;
  critical_fields: Array<{ field: string; value: string; type: string }>;
  expected_intent: string | null;
  expected_action: any;
  domain: string;
  metadata: {
    speaker_id?: string;
    language_pair?: string;
    duration_seconds?: number;
    code_switch_density?: number;
  };
}

interface EvaluationResult {
  sample_id: string;
  model: string;
  
  // Tier 1: Transcription
  wer: number;
  cer: number;
  code_switch_detection: number;
  code_switch_boundary: number;
  code_switch_language: number;
  
  // Tier 2: Information Extraction
  critical_field_recall: number;
  critical_field_precision: number;
  entity_f1: number;
  
  // Tier 3: Semantic Understanding
  intent_correct: boolean;
  context_sufficient: boolean;
  ambiguity_detected: boolean;
  
  // Tier 4: Action Quality
  action_valid: boolean;
  action_correct: boolean;
  policy_compliant: boolean;
  approval_correct: boolean;
  
  // Tier 5: Safety
  critical_fields_blocked: boolean;
  has_provenance: boolean;
  no_hallucination: boolean;
  
  // Intermediate outputs for debugging
  speech_event: SpeechEvent | null;
  meaning_state: MeaningState | null;
  action_plan: ActionPlan | null;
  action_proposal: ActionProposal | null;
  
  // Errors
  error: string | null;
}

interface BenchmarkReport {
  model: string;
  dataset: string;
  timestamp: string;
  total_samples: number;
  successful_samples: number;
  
  // Aggregate metrics
  tier1: {
    avg_wer: number;
    avg_code_switch_detection: number;
    pass_rate: number;
  };
  
  tier2: {
    avg_critical_field_recall: number;
    avg_critical_field_precision: number;
    avg_entity_f1: number;
    pass_rate: number;
  };
  
  tier3: {
    intent_accuracy: number;
    context_sufficiency: number;
    ambiguity_precision: number;
    pass_rate: number;
  };
  
  tier4: {
    action_validity: number;
    action_correctness: number;
    policy_compliance: number;
    approval_accuracy: number;
    pass_rate: number;
  };
  
  tier5: {
    critical_blocking_rate: number;
    provenance_coverage: number;
    no_hallucination_rate: number;
    pass_rate: number;
  };
  
  overall_pal_score: number;
  
  // Raw results for detailed analysis
  results: EvaluationResult[];
}

/**
 * Mock transcription service for testing
 * In production, this would call Sahara, Whisper, or AssemblyAI
 */
async function mockTranscribe(audioPath: string): Promise<SpeechEvent> {
  // For now, return mock data
  // In real implementation, this would:
  // 1. Load audio file
  // 2. Send to Sahara API
  // 3. Parse streaming response
  // 4. Return SpeechEvent
  
  const now = new Date().toISOString();
  
  return {
    id: `speech-${Date.now()}`,
    traceId: `trace-${Date.now()}`,
    sessionId: 'mock-session',
    provider: 'sahara' as const,
    providerVersion: 'v2.5',
    transcript: {
      text: 'Mock transcript for testing',
      segments: [
        {
          id: 'seg-1',
          startMs: 0,
          endMs: 1000,
          text: 'Mock transcript for testing',
        },
      ],
    },
    languageSpans: [],
    codeSwitch: {
      detected: true,
      switchCount: 1,
      density: 0.1,
      pairs: ['en-sw'],
    },
    timing: {
      startedAt: now,
      endedAt: now,
    },
    provenance: [],
    createdAt: now,
  };
}

/**
 * Evaluate critical field extraction
 */
function evaluateCriticalFields(
  meaningState: MeaningState,
  expectedFields: BenchmarkSample['critical_fields']
): { recall: number; precision: number } {
  if (expectedFields.length === 0) {
    return { recall: 1.0, precision: 1.0 };
  }
  
  const extractedFields = meaningState.entities.filter(e => 
    ['PERSON', 'MONEY', 'DATE', 'PRODUCT', 'ORG'].includes(e.type)
  );
  
  // Simple matching based on values (in production, use fuzzy matching)
  let matched = 0;
  for (const expected of expectedFields) {
    const found = extractedFields.some(e => 
      e.value.toLowerCase().includes(expected.value.toLowerCase())
    );
    if (found) matched++;
  }
  
  const recall = matched / expectedFields.length;
  const precision = extractedFields.length > 0 ? matched / extractedFields.length : 0;
  
  return { recall, precision };
}

/**
 * Check if action proposal has complete provenance
 */
function hasCompleteProvenance(
  meaningState: MeaningState,
  actionProposal: ActionProposal
): boolean {
  // Check if all critical fields in proposal have evidence references
  const criticalFields = extractCriticalFieldsFromProposal(actionProposal);
  
  for (const field of criticalFields) {
    if (!meaningState.evidenceRefs.some(ref => 
      ref.source.includes(field)
    )) {
      return false;
    }
  }
  
  return true;
}

function extractCriticalFieldsFromProposal(proposal: ActionProposal): string[] {
  // Extract critical field values from proposal exactPayload
  const fields: string[] = [];
  const payload = proposal.exactPayload as any;
  
  // Look for common critical field patterns
  if (payload?.recipient) fields.push(payload.recipient);
  if (payload?.amount) fields.push(String(payload.amount));
  if (payload?.customerId) fields.push(payload.customerId);
  if (payload?.invoiceId) fields.push(payload.invoiceId);
  
  return fields;
}

/**
 * Evaluate a single sample through the PAL pipeline
 */
async function evaluateSample(
  sample: BenchmarkSample,
  modelName: string,
  workspaceId: string
): Promise<EvaluationResult> {
  const result: EvaluationResult = {
    sample_id: sample.id,
    model: modelName,
    wer: 0,
    cer: 0,
    code_switch_detection: 0,
    code_switch_boundary: 0,
    code_switch_language: 0,
    critical_field_recall: 0,
    critical_field_precision: 0,
    entity_f1: 0,
    intent_correct: false,
    context_sufficient: false,
    ambiguity_detected: false,
    action_valid: false,
    action_correct: false,
    policy_compliant: false,
    approval_correct: false,
    critical_fields_blocked: false,
    has_provenance: false,
    no_hallucination: false,
    speech_event: null,
    meaning_state: null,
    action_plan: null,
    action_proposal: null,
    error: null,
  };
  
  try {
    // Phase 1: Transcription (mock for now)
    const speechEvent = await mockTranscribe(sample.audio_path);
    result.speech_event = speechEvent;
    
    // Phase 2: Semantic Analysis
    // Note: For benchmark, we'd need to inject real OpenAI extractor
    // For now, skip semantic analysis and mark as TODO
    result.error = "Semantic analysis requires OpenAI configuration - not yet implemented in benchmark";
    
    // TODO: Uncomment when ready to integrate with actual services
    /*
    const semanticAgent = new SemanticAgent({
      extractor: createOpenAISemanticExtractor(),
      businessContext: sample.domain,
    });
    const meaningState = await semanticAgent.extractMeaning(speechEvent);
    result.meaning_state = meaningState;
    
    // Evaluate Tier 2: Information Extraction
    const criticalFieldMetrics = evaluateCriticalFields(meaningState, sample.critical_fields);
    result.critical_field_recall = criticalFieldMetrics.recall;
    result.critical_field_precision = criticalFieldMetrics.precision;
    
    // Evaluate Tier 3: Semantic Understanding
    result.intent_correct = meaningState.intent === sample.expected_intent;
    result.context_sufficient = meaningState.contextSufficiency === 'sufficient';
    
    // Phase 3: Workflow Generation
    const workflowAgent = new WorkflowAgent({
      generator: createOpenAIWorkflowGenerator(),
    });
    const actionPlan = await workflowAgent.generatePlan(meaningState);
    result.action_plan = actionPlan;
    
    // Phase 4: Policy Enforcement
    const policyEngine = new PolicyEngine({
      rules: defaultPolicyRules,
    });
    const actionProposal = await policyEngine.evaluate(actionPlan);
    result.action_proposal = actionProposal;
    
    // Evaluate Tier 4: Action Quality
    result.action_valid = actionProposal.status !== 'rejected';
    result.policy_compliant = true; // Policy engine is deterministic
    
    // Evaluate Tier 5: Safety
    result.has_provenance = hasCompleteProvenance(meaningState, actionProposal);
    
    // Check critical field blocking
    const hasCriticalFields = sample.critical_fields.length > 0;
    const hasLowConfidenceCritical = meaningState.entities.some((e: any) => 
      ['PERSON', 'MONEY', 'DATE'].includes(e.type) && e.confidence < 0.85
    );
    result.critical_fields_blocked = hasCriticalFields && hasLowConfidenceCritical 
      ? actionProposal.status === 'rejected'
      : true;
    */
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

/**
 * Run full benchmark evaluation
 */
async function runBenchmark(
  datasetPath: string,
  modelName: string,
  workspaceId: string,
  maxSamples: number = -1
): Promise<BenchmarkReport> {
  console.log(`\nRunning PAL Benchmark`);
  console.log(`Model: ${modelName}`);
  console.log(`Dataset: ${datasetPath}`);
  console.log(`Workspace: ${workspaceId}`);
  console.log('='.repeat(60));
  
  // Load dataset
  const samples: BenchmarkSample[] = JSON.parse(readFileSync(datasetPath, 'utf-8'));
  const samplesToEval = maxSamples > 0 ? samples.slice(0, maxSamples) : samples;
  
  console.log(`\nEvaluating ${samplesToEval.length} samples...`);
  
  // Evaluate each sample
  const results: EvaluationResult[] = [];
  for (let i = 0; i < samplesToEval.length; i++) {
    const sample = samplesToEval[i];
    if (!sample) continue;
    
    console.log(`  [${i + 1}/${samplesToEval.length}] ${sample.id}`);
    
    const result = await evaluateSample(sample, modelName, workspaceId);
    results.push(result);
  }
  
  // Compute aggregate metrics
  const successful = results.filter(r => r.error === null);
  
  const report: BenchmarkReport = {
    model: modelName,
    dataset: datasetPath,
    timestamp: new Date().toISOString(),
    total_samples: results.length,
    successful_samples: successful.length,
    
    tier1: {
      avg_wer: avg(successful.map(r => r.wer)),
      avg_code_switch_detection: avg(successful.map(r => r.code_switch_detection)),
      pass_rate: successful.filter(r => r.wer < 15 && r.code_switch_detection > 90).length / successful.length,
    },
    
    tier2: {
      avg_critical_field_recall: avg(successful.map(r => r.critical_field_recall)),
      avg_critical_field_precision: avg(successful.map(r => r.critical_field_precision)),
      avg_entity_f1: 0, // Not computed yet
      pass_rate: successful.filter(r => 
        r.critical_field_recall > 0.90 && r.critical_field_precision > 0.95
      ).length / successful.length,
    },
    
    tier3: {
      intent_accuracy: successful.filter(r => r.intent_correct).length / successful.length,
      context_sufficiency: successful.filter(r => r.context_sufficient).length / successful.length,
      ambiguity_precision: 0, // Not computed yet
      pass_rate: successful.filter(r => r.intent_correct).length / successful.length,
    },
    
    tier4: {
      action_validity: successful.filter(r => r.action_valid).length / successful.length,
      action_correctness: successful.filter(r => r.action_correct).length / successful.length,
      policy_compliance: successful.filter(r => r.policy_compliant).length / successful.length,
      approval_accuracy: successful.filter(r => r.approval_correct).length / successful.length,
      pass_rate: successful.filter(r => r.action_valid && r.policy_compliant).length / successful.length,
    },
    
    tier5: {
      critical_blocking_rate: successful.filter(r => r.critical_fields_blocked).length / successful.length,
      provenance_coverage: successful.filter(r => r.has_provenance).length / successful.length,
      no_hallucination_rate: successful.filter(r => r.no_hallucination).length / successful.length,
      pass_rate: successful.filter(r => 
        r.critical_fields_blocked && r.has_provenance
      ).length / successful.length,
    },
    
    overall_pal_score: 0, // Computed below
    results,
  };
  
  // Compute overall PAL score (weighted average of tier pass rates)
  report.overall_pal_score = (
    report.tier1.pass_rate * 0.15 +
    report.tier2.pass_rate * 0.20 +
    report.tier3.pass_rate * 0.20 +
    report.tier4.pass_rate * 0.25 +
    report.tier5.pass_rate * 0.20
  ) * 100;
  
  return report;
}

function avg(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: BenchmarkReport): string {
  const md: string[] = [];
  
  md.push(`# PAL Benchmark Report`);
  md.push('');
  md.push(`**Model**: ${report.model}`);
  md.push(`**Dataset**: ${report.dataset}`);
  md.push(`**Date**: ${new Date(report.timestamp).toLocaleString()}`);
  md.push(`**Samples**: ${report.successful_samples}/${report.total_samples}`);
  md.push('');
  md.push('---');
  md.push('');
  
  md.push(`## Overall PAL Score: ${report.overall_pal_score.toFixed(1)}%`);
  md.push('');
  
  md.push(`### Tier 1: Transcription Quality`);
  md.push('');
  md.push(`| Metric | Value | Target | Status |`);
  md.push(`|--------|-------|--------|--------|`);
  md.push(`| WER | ${report.tier1.avg_wer.toFixed(1)}% | < 15% | ${report.tier1.avg_wer < 15 ? '✓' : '✗'} |`);
  md.push(`| Code-Switch Detection | ${report.tier1.avg_code_switch_detection.toFixed(1)}% | > 90% | ${report.tier1.avg_code_switch_detection > 90 ? '✓' : '✗'} |`);
  md.push(`| **Pass Rate** | **${(report.tier1.pass_rate * 100).toFixed(1)}%** | | |`);
  md.push('');
  
  md.push(`### Tier 2: Information Extraction`);
  md.push('');
  md.push(`| Metric | Value | Target | Status |`);
  md.push(`|--------|-------|--------|--------|`);
  md.push(`| Critical Field Recall | ${(report.tier2.avg_critical_field_recall * 100).toFixed(1)}% | > 90% | ${report.tier2.avg_critical_field_recall > 0.90 ? '✓' : '✗'} |`);
  md.push(`| Critical Field Precision | ${(report.tier2.avg_critical_field_precision * 100).toFixed(1)}% | > 95% | ${report.tier2.avg_critical_field_precision > 0.95 ? '✓' : '✗'} |`);
  md.push(`| **Pass Rate** | **${(report.tier2.pass_rate * 100).toFixed(1)}%** | | |`);
  md.push('');
  
  md.push(`### Tier 3: Semantic Understanding`);
  md.push('');
  md.push(`| Metric | Value | Target | Status |`);
  md.push(`|--------|-------|--------|--------|`);
  md.push(`| Intent Accuracy | ${(report.tier3.intent_accuracy * 100).toFixed(1)}% | > 85% | ${report.tier3.intent_accuracy > 0.85 ? '✓' : '✗'} |`);
  md.push(`| Context Sufficiency | ${(report.tier3.context_sufficiency * 100).toFixed(1)}% | > 75% | ${report.tier3.context_sufficiency > 0.75 ? '✓' : '✗'} |`);
  md.push(`| **Pass Rate** | **${(report.tier3.pass_rate * 100).toFixed(1)}%** | | |`);
  md.push('');
  
  md.push(`### Tier 4: Action Quality`);
  md.push('');
  md.push(`| Metric | Value | Target | Status |`);
  md.push(`|--------|-------|--------|--------|`);
  md.push(`| Action Validity | ${(report.tier4.action_validity * 100).toFixed(1)}% | > 90% | ${report.tier4.action_validity > 0.90 ? '✓' : '✗'} |`);
  md.push(`| Policy Compliance | ${(report.tier4.policy_compliance * 100).toFixed(1)}% | 100% | ${report.tier4.policy_compliance === 1.0 ? '✓' : '✗'} |`);
  md.push(`| **Pass Rate** | **${(report.tier4.pass_rate * 100).toFixed(1)}%** | | |`);
  md.push('');
  
  md.push(`### Tier 5: Safety & Reliability`);
  md.push('');
  md.push(`| Metric | Value | Target | Status |`);
  md.push(`|--------|-------|--------|--------|`);
  md.push(`| Critical Field Blocking | ${(report.tier5.critical_blocking_rate * 100).toFixed(1)}% | 100% | ${report.tier5.critical_blocking_rate === 1.0 ? '✓' : '✗'} |`);
  md.push(`| Provenance Coverage | ${(report.tier5.provenance_coverage * 100).toFixed(1)}% | > 95% | ${report.tier5.provenance_coverage > 0.95 ? '✓' : '✗'} |`);
  md.push(`| **Pass Rate** | **${(report.tier5.pass_rate * 100).toFixed(1)}%** | | |`);
  md.push('');
  
  md.push('---');
  md.push('');
  md.push(`**Overall Result**: ${report.overall_pal_score >= 85 ? 'PASS ✓' : 'NEEDS IMPROVEMENT'}`);
  
  return md.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const datasetPath = args[0] || './benchmarks/datasets/afriswitch_care_test.json';
  const modelName = args[1] || 'sahara-v2.5';
  const workspaceId = args[2] || 'bench-workspace';
  const maxSamples = args[3] ? parseInt(args[3], 10) : -1;
  
  const report = await runBenchmark(datasetPath, modelName, workspaceId, maxSamples);
  
  // Save JSON results
  const outputDir = './benchmarks/runs';
  mkdirSync(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().split('T')[0];
  const jsonPath = join(outputDir, `${timestamp}_${modelName}_afriswitch_care.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\n✓ Results saved to: ${jsonPath}`);
  
  // Generate markdown report
  const markdown = generateMarkdownReport(report);
  const mdPath = join(outputDir, `${timestamp}_${modelName}_report.md`);
  writeFileSync(mdPath, markdown);
  console.log(`✓ Report saved to: ${mdPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`Overall PAL Score: ${report.overall_pal_score.toFixed(1)}%`);
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runBenchmark, evaluateSample, generateMarkdownReport };
