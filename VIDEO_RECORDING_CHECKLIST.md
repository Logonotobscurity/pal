# Video Recording Checklist - QUICK SETUP

**Time**: 2 hours left  
**Goal**: 3-5 minute demo video showing approval flow

---

## ✅ Pre-Recording (5 minutes)

### 1. Check Dev Server
- [ ] Visit http://localhost:3000
- [ ] Server is running (wait 30 seconds if still loading)
- [ ] Landing page loads correctly

### 2. Seed Test Data (CRITICAL)
You need at least 1-2 approval proposals to show. Run this:

```bash
# Quick test to create a proposal (from tests)
npm test -- approval

# OR manually via API (if time):
curl -X POST http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "ws-demo",
    "actionType": "message.send",
    "recipient": "Mama Wanjiku",
    "amount": "Ksh 5000",
    "riskClass": "external_write"
  }'
```

### 3. Browser Setup
- [ ] Chrome/Edge in **Incognito/Private** mode (no extensions)
- [ ] Zoom to **125%** for better visibility
- [ ] Close all other tabs
- [ ] Clear console (F12 → Console → Clear)
- [ ] Turn off notifications (Windows Focus Assist or Mac DND)

### 4. Recording Tool
**Windows**: Xbox Game Bar (Win + G)
**Mac**: QuickTime Screen Recording
**Both**: OBS Studio

- [ ] Recording tool ready
- [ ] Audio input set (for voice-over)
- [ ] Recording area: Full screen or browser window only

---

## 🎬 Recording Flow (3-5 minutes)

### Script Option A: Full Flow (5 min)

Follow `DEMO_SCRIPT.md` exactly:
1. Intro (30s) — Landing page, explain problem
2. Problem (45s) — Code-switching example
3. Pipeline (90s) — Show transcription → meaning → plan → policy
4. **Approval UI** (60s) — ⭐ KEY MOMENT ⭐
5. Benchmark (30s) — Show results table
6. Wrap-up (20s) — GitHub link

### Script Option B: Quick Version (3 min)

1. **Problem** (30s): "Code-switching breaks voice assistants"
2. **Pipeline** (60s): "Sahara → Meaning → Plan → Policy → ASK"
3. **Approval Demo** (60s): Navigate to /approvals, show card, click approve ⭐
4. **Benchmark** (30s): "Methodology defined; architecture guarantees zero unsupervised side effects regardless of STT model — full run pending"

---

## 🎯 Key Moments to Capture

### MUST SHOW:
1. ✅ Landing page with "PAL — Meaning-to-Action Intelligence"
2. ✅ **Approval dashboard** at http://localhost:3000/approvals
3. ✅ **Proposal card** showing:
   - Recipient (e.g., "Mama Wanjiku")
   - Amount (e.g., "Ksh 5000")
   - [Approve] [Edit] [Reject] buttons
4. ✅ **Click Approve** button and show status change
5. ✅ Benchmark table from README

### NICE TO HAVE:
- Code-switched example sentence typed out
- Pipeline diagram (show in README or docs)
- Evidence chain in proposal detail

---

## 🚀 Quick Start Commands

### Terminal 1: Dev Server (already running)
```bash
npm run dev
# Wait for "Ready on http://localhost:3000"
```

### Terminal 2: Check Server
```bash
# Test API
curl http://localhost:3000/api/me

# If 401 (not logged in), that's OK for demo
# You can show the approval UI without auth if seeded properly
```

### Terminal 3: Seed Proposals (if needed)
```bash
# Run tests that create proposals
npm test approval-ui

# OR use Supabase Studio to insert directly:
# https://supabase.com/dashboard/project/YOUR_PROJECT/editor
```

---

## 📱 Demo Flow URL Sequence

1. http://localhost:3000 — Landing page
2. http://localhost:3000/approvals — **Main demo page** ⭐
3. http://localhost:3000/approvals/[id] — Proposal detail (if you have ID)

---

## ⚠️ If Things Go Wrong

### "No proposals found"
**Quick fix**: Show the code instead
- Open `src/components/approvals/proposal-card.tsx`
- Show the approve/reject logic
- Narrate: "This is where PAL asks for approval"

### "Server not running"
```bash
# Kill and restart
npm run dev
```

### "Can't log in"
**Skip it**: Just show the UI components and narrate
- Show approval card code
- Show policy engine code
- Emphasize architecture over live demo

---

## 🎤 Voice-Over Script (if no live demo)

**Option: Narrate over screenshots/code**

> "PAL is the first voice-to-action system for African code-switching that always asks before executing.
>
> [Show landing page]
>
> When a user says: 'Send Ksh 5000 to Mama Wanjiku kesho by 5pm' — mixing English and Swahili —
>
> [Show code/architecture]
>
> PAL uses Sahara STT for superior code-switch detection, then extracts structured meaning, generates an action plan, and here's the key innovation:
>
> [Show approval UI code or mockup]
>
> PAL shows the owner exactly what it wants to do. The owner can approve, edit, or reject. No generic assistant has this approval gate.
>
> [Show benchmark methodology]
>
> Our benchmark methodology compares Sahara against Whisper and AssemblyAI on code-switch accuracy and downstream action correctness — that run is still in progress, so I'm not going to quote numbers here. What's already guaranteed by architecture, independent of any model's accuracy, is zero unsupervised side effects.
>
> [Show GitHub]
>
> PAL proves that better code-switch handling isn't just about transcription — it's about enabling safe automation for African businesses.
>
> Repository: github.com/Logonotobscurity/pal"

---

## ✅ Post-Recording (5 minutes)

### 1. Review
- [ ] Approve button click is visible
- [ ] Audio is clear (if voice-over)
- [ ] No long pauses or errors
- [ ] Under 6 minutes total

### 2. Export
- [ ] Format: MP4 (H.264)
- [ ] Resolution: 1080p (1920x1080)
- [ ] File size: < 500MB preferred

### 3. Upload
**Options**:
- YouTube (unlisted)
- Google Drive (public link)
- GitHub Release (if < 100MB)
- Vimeo

### 4. Add Link to Submission
Update submission form with video URL

---

## 🎯 Success Criteria

**Minimum viable video shows**:
1. ✅ Landing page with project name
2. ✅ Approval UI (even if static/screenshot)
3. ✅ Benchmark results table
4. ✅ GitHub repo link

**Ideal video shows**:
1. ✅ Everything above +
2. ✅ Live approval button click
3. ✅ Status change animation
4. ✅ Evidence chain visible

---

## ⏰ Time Budget

- **Setup & test**: 5 minutes
- **Recording**: 5 minutes (2-3 takes)
- **Review & export**: 5 minutes
- **Upload**: 5 minutes

**Total**: 20 minutes for video

**Remaining**: ~1h40m for submission form + extras

---

**READY TO RECORD? Server should be up at http://localhost:3000**

Open browser and check!
