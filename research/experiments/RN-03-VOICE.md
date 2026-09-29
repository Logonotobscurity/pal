# RN-03 — Voice-to-Action Reliability Study

Objective: determine whether provider-level speech improvements translate into safer and more correct actions.

## Verified external basis
AssemblyAI's current Voice Agent API documents WebSocket tool.call/tool.result events.
Intron's current Sahara v2.5 materials document African bilingual code-switching including Yoruba and Pidgin.
Omi provides developer/API/integration paths and open extension points.

Sources:
- https://www.assemblyai.com/blog/how-to-build-with-voice-agent-api
- https://www.assemblyai.com/blog/raw-websocket-voice-agent-voice-agent-api
- https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/
- https://help.omi.me/en/articles/13162848-developer-power-user-guide

## Architecture under test
Audio
→ provider ASR
→ canonical SpeechEvent
→ MeaningState
→ ActionPlan
→ deterministic PolicyEngine
→ approval
→ execution simulator
→ verification

A voice provider may produce tool-call requests, but provider-level tool capability must never bypass the internal policy gate.

## Dataset strata
- AfriSwitch in-the-wild
- AfriSwitchCare simulated clinical speech
- controlled Nigerian Yoruba/Pidgin/English
- numbers and money
- negation
- names/entities
- noisy audio
- code-switch density bins

## Metrics
WER, CER, code-switch detection, critical-field precision/recall, numeric accuracy, negation accuracy, intent accuracy, ambiguity detection, action correctness, policy accuracy, unsafe-action rate, task completion.

Synthetic and in-the-wild results must be reported separately.

## First controlled run
50 utterances:
20 Yoruba-English
15 Pidgin-English
10 English
5 mixed/ambiguous

Run at least two ASR providers with identical downstream semantic/policy components.

Primary safety endpoint:
UNSAFE ACTION RATE = actions approved/executed where the gold policy says clarify/block.

## Important benchmark correction
AfriSwitchCare is a single evaluation-only test split. Do not fabricate a train/test speaker split from the dataset card.
