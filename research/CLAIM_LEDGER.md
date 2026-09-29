# Claim Ledger

Status values:
VERIFIED
DOCUMENTED_DESIGN
IMPLEMENTED_UNVERIFIED
MODEL_HYPOTHESIS
SOURCE_ATTRIBUTED
UNRESOLVED
SUPERSEDED

## RN-01
### CLM-001
Claim: PAL policy evaluation is deterministic and non-LLM.
Status: IMPLEMENTED_UNVERIFIED.
Evidence: POLICY_ENGINE_IMPLEMENTATION.md and src/services/policy/engine.ts.
Required verification: execute adversarial and integration tests.

### CLM-002
Claim: External-write and financial actions cannot execute without approval in the intended flow.
Status: IMPLEMENTED_UNVERIFIED.
Evidence: POLICY_ENGINE_IMPLEMENTATION.md and EXECUTION_SERVICE_IMPLEMENTATION.md.
Required verification: forged proposal, stale approval, direct-service, race and cross-workspace tests.

## RN-02
### CLM-101
Claim: PAL architecture treats cultural meaning as contextual and provenance-first.
Status: DOCUMENTED_DESIGN.
Evidence: PAL_V03_ARCHITECTURE.md.
Important: design intent is not cultural validity.

### CLM-102
Claim: Early PAL annotations contain detailed semantic/causal interpretations.
Status: SOURCE_ATTRIBUTED.
Evidence: PAL v0.1 annotation document.
Constraint: document itself states these are preliminary and require expert validation.

### CLM-103
Claim: DAPF keeps interpretation confidence, context sufficiency, evidence coverage, discourse alignment and cultural relevance separate.
Status: DOCUMENTED_DESIGN.
Evidence: wwhisper/docs/04-DAPF-SPECIFICATION.md.

## RN-03
### CLM-201
Claim: AssemblyAI Voice Agent API supports WebSocket tool.call/tool.result events.
Status: VERIFIED.
Source: https://www.assemblyai.com/blog/how-to-build-with-voice-agent-api

### CLM-202
Claim: Sahara v2.5 supports African bilingual code-switching including Yoruba and Pidgin.
Status: VERIFIED.
Source: https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/

### CLM-203
Claim: AfriSwitch is an evaluation-only 54.41-hour African code-switched speech benchmark with Yoruba and Pidgin.
Status: VERIFIED.
Source: https://huggingface.co/datasets/intronhealth/AfriSwitch

### CLM-204
Claim: AfriSwitchCare is an evaluation-only dataset with a single test split.
Status: VERIFIED.
Source: https://huggingface.co/datasets/intronhealth/AfriSwitchCare
Action: repair repository methodology that assumes train/test speaker splitting.

### CLM-205
Claim: Omi exposes developer/integration paths and open hardware/software extension points.
Status: VERIFIED.
Sources: https://help.omi.me/en/articles/13162848-developer-power-user-guide and https://www.omi.me/products/omi

## RN-04
### CLM-301
Claim: OpenServ provides agent building, orchestration, integrations/MCP, verification and audit-oriented platform primitives.
Status: VERIFIED.
Source: https://www.openserv.ai/agent-builder

### CLM-302
Claim: LOG_ON's Pan-African module treats funding as an observable trigger rather than automatically as an opportunity.
Status: DOCUMENTED_DESIGN.
Evidence: LOG_ON_Pan_African_Expansion_Intelligence_Module_v1.md.
