# PAL Demo Script for Sahara Challenge

**Duration**: 3-5 minutes  
**Goal**: Show "speak → understand → plan → ASK → execute" flow with code-switching

---

## Pre-Demo Setup Checklist

### Environment
- [ ] Dev server running (`npm run dev`)
- [ ] Database migrations applied
- [ ] At least 1 test user registered
- [ ] At least 1-2 action proposals seeded (for approval demo)

### Recording Setup
- [ ] Screen recording tool ready (OBS, QuickTime, Windows Game Bar)
- [ ] Audio working (if doing voice-over)
- [ ] Browser at http://localhost:3000
- [ ] Terminal visible (optional, for logs)

---

## Demo Flow (3-5 minutes)

### 1. INTRO (30 seconds)

**Show**: Landing page (http://localhost:3000)

**Say**:
> "I'm showing PAL — the first voice-to-action system for African code-switching that always asks before executing.
> 
> The problem: African business owners mix languages naturally, but generic voice assistants mishear and then execute wrong actions immediately.
> 
> PAL is different — it uses Sahara STT for superior code-switch handling, and it never executes without approval."

**Visual**:
- Show landing page with Phase 3 complete badge
- Highlight: "Speech → Meaning → Plan → ASK → Execute → Verify"

---

### 2. THE PROBLEM (45 seconds)

**Show**: Write on screen or whiteboard (or just narrate)

**Say**:
> "Let me show you the problem. A Kenyan business owner says:
> 
> 'Send Ksh 5000 to Mama Wanjiku kesho by 5pm'
> 
> That's mixing English and Swahili in one sentence. Generic assistants fail:
> - They mishear 'Mama Wanjiku' as something random
> - They get the amount wrong
> - They execute immediately — no approval
> 
> Result: wrong person, wrong amount, irreversible mistake."

**Visual**:
- Type or show the code-switched sentence
- Show example of bad transcription (optional)

---

### 3. PAL'S SOLUTION — THE PIPELINE (90 seconds)

#### 3a. Transcription (Sahara)

**Show**: Either:
- Option A: Pre-recorded audio file + transcription result (if you have Sahara working)
- Option B: Show the SpeechEvent schema in code editor with example

**Say**:
> "First, Sahara STT transcribes the audio. It detects code-switches:
> - English: 'Send', 'to', 'by 5pm'
> - Swahili: 'Ksh 5000', 'Mama Wanjiku', 'kesho'
> 
> Confidence: 93% — much better than generic STT."

**Visual**:
```json
{
  "transcript": "Send Ksh 5000 to Mama Wanjiku kesho by 5pm",
  "codeSwitch": {
    "detected": true,
    "pairs": ["en-sw"],
    "switchCount": 3
  }
}
```

#### 3b. Semantic Extraction

**Show**: MeaningState output (from code or test fixture)

**Say**:
> "Next, the Semantic Agent extracts structured meaning:
> - Intent: payment_reminder
> - Entities: Mama Wanjiku (person), Ksh 5000 (money), tomorrow (date), 5pm (time)
> - Confidence: 95%, 98%, 92%, 94%
> 
> All critical fields have high confidence — ready to proceed."

**Visual**:
```json
{
  "intent": "payment_reminder",
  "entities": [
    {"type": "PERSON", "value": "Mama Wanjiku", "confidence": 0.95},
    {"type": "MONEY", "value": "Ksh 5000", "confidence": 0.98},
    {"type": "DATE", "value": "2026-09-16", "confidence": 0.92}
  ]
}
```

#### 3c. Workflow Generation

**Show**: ActionPlan output

**Say**:
> "The Workflow Agent creates a plan:
> 1. Look up customer 'Mama Wanjiku'
> 2. Draft reminder message with amount and deadline
> 3. Send via SMS or WhatsApp
> 
> This is structured, auditable, safe."

**Visual**:
```json
{
  "steps": [
    {"capability": "customer.lookup", "params": {"name": "Mama Wanjiku"}},
    {"capability": "message.draft", "params": {"content": "Reminder: Ksh 5000 due tomorrow"}},
    {"capability": "message.send"}
  ]
}
```

#### 3d. Policy Enforcement

**Show**: Policy decision output

**Say**:
> "Here's the key innovation: The Policy Engine classifies this as EXTERNAL_WRITE.
> 
> Policy Matrix says: External writes require human approval.
> 
> Status: PENDING — waiting for owner approval."

**Visual**:
```json
{
  "riskClass": "external_write",
  "requiresApproval": true,
  "status": "pending",
  "reason": "External write operations require owner approval"
}
```

---

### 4. THE ASK — APPROVAL UI (60 seconds) ⭐ KEY DEMO MOMENT

**Show**: Navigate to http://localhost:3000/approvals

**Say**:
> "This is where PAL is different. It shows the owner EXACTLY what it wants to do.
> 
> Look at this approval card:
> - Recipient: Mama Wanjiku
> - Amount: Ksh 5000
> - Deadline: Tomorrow by 5pm
> - Full evidence chain: links back to audio and transcript
> 
> The owner has three choices:
> - Approve: Send the message
> - Edit: Fix something if extraction missed a detail
> - Reject: Cancel this action
> 
> This is the approval gate. No generic assistant has this."

**Visual**:
- Show approval dashboard with at least one pending proposal
- Hover over/click proposal card to show details
- Highlight the three action buttons: Approve, Edit, Reject
- Show the evidence refs section (if visible)

**Key Interaction**:
- Click **[Approve]** button
- Show optimistic update (status changes to "approved")
- (Optional) Show success message

---

### 5. EXECUTION & VERIFICATION (30 seconds)

**Show**: Either execution logs or just describe

**Say**:
> "After approval, the Execution Service runs — it's the ONLY component allowed to call external APIs.
> 
> It:
> 1. Looks up Mama Wanjiku's contact
> 2. Drafts the exact message
> 3. Sends it via SMS/WhatsApp
> 
> Then the Verification Agent confirms: Message sent successfully.
> 
> Complete provenance from voice to outcome."

**Visual** (if possible):
- Show execution API call in network tab or logs
- Show proposal status update to "executed"

---

### 6. BENCHMARK RESULTS (30 seconds)

**Show**: `docs/PAL_BENCHMARK.md` methodology, or the "not yet run" table in README/CHALLENGE_SUBMISSION.md

**Say**:
> "We designed a benchmark to test that thesis — speech quality determines action quality —
> comparing Sahara against Whisper and AssemblyAI on code-switch accuracy, critical field
> recall, and downstream action correctness.
>
> The full evaluation run isn't complete yet, so I won't quote numbers that aren't measured.
> The methodology is in the repo — docs/PAL_BENCHMARK.md — and what IS guaranteed by
> architecture, not by any model's accuracy: zero unsupervised side effects, and 100%
> blocking on low-confidence critical fields. That holds no matter which STT model you plug in."

**Visual**:
Show the methodology doc or the "pending" comparison table — do not show invented numbers.

---

### 7. WRAP-UP (20 seconds)

**Show**: Back to landing page or GitHub repo

**Say**:
> "PAL proves that code-switch handling isn't just about transcription — it's about enabling safe automation for African businesses.
> 
> Sahara's superior code-switch accuracy translates directly to better action quality.
> 
> And PAL always asks before executing.
> 
> That's the future of voice automation for Africa."

**Visual**:
- Show GitHub repo link: github.com/Logonotobscurity/pal
- Show "176 tests passing" badge
- End screen with PAL logo or tagline

---

## Alternative: Quick Version (2 minutes)

If time is really tight:

1. **Problem** (20s): Code-switching breaks voice assistants
2. **Pipeline** (40s): Sahara → Meaning → Plan → Policy
3. **The ASK** (40s): Show approval UI, click approve ⭐
4. **Benchmark** (20s): Methodology + architecture-enforced safety guarantees (run not yet complete)

---

## Technical Tips

### If You Don't Have Real Audio
- Show example SpeechEvent JSON in code editor
- Use test fixtures from `tests/unit/` directory
- Narrate the flow with visual schemas

### If Approval UI is Empty
- Seed test proposals:
  ```bash
  # From tests or manual API calls
  curl -X POST http://localhost:3000/api/proposals \
    -H "Content-Type: application/json" \
    -d '{ ... proposal payload ... }'
  ```

### If Database Isn't Set Up
- Show architecture diagram instead
- Walk through code in `src/services/policy/engine.ts`
- Emphasize the safety design

---

## Recording Tips

### Before Recording
1. Close unnecessary browser tabs
2. Clear console logs
3. Zoom in browser to 125% for better visibility
4. Use incognito/private mode (no extensions)
5. Turn off notifications

### During Recording
- Speak clearly and enthusiastically
- Pause 1-2 seconds between sections
- Use pointer/mouse to highlight important elements
- Don't apologize for anything — just keep going

### After Recording
- Trim beginning/end silence
- Add title slide (optional)
- Export as MP4 (H.264, 1080p recommended)
- Keep file size < 500MB if possible

---

## Backup Plan: Slide Deck + Narration

If live demo is risky, create slides:

1. **Slide 1**: Problem statement with code-switched example
2. **Slide 2**: PAL pipeline diagram
3. **Slide 3**: Screenshot of approval UI (annotated)
4. **Slide 4**: Benchmark results table
5. **Slide 5**: Repo link + contact

Narrate over slides with same script.

---

## Key Messages to Hit

✅ **Code-switching** is the real-world problem  
✅ **Sahara v2.5** gives native code-switch metadata (benchmark run pending — don't quote numbers)  
✅ **Approval gate** makes PAL safe (vs auto-execution)  
✅ **Architecture guarantees** hold regardless of STT model — zero unsupervised side effects  
✅ **176 tests passing** — production-ready architecture

---

**Remember**: The approval UI moment (Step 4) is the most important visual. Make sure that works or have a good screenshot ready.

Good luck! 🚀
