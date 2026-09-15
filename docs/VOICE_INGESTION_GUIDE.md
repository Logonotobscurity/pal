# PAL Voice Ingestion Pipeline — Implementation Guide

## Overview

The PAL voice ingestion pipeline implements **PAL_ARCHITECTURE.md §35–§37**: microphone audio capture → PCM16 encoding → Sahara streaming → SpeechEvent persistence.

This implementation follows the architecture principle:

> **Browser → audio capture → PCM16 encoder → PAL voice session → Sahara adapter → SpeechEvent → database/event stream**

## Architecture Principles

### 1. No Provider Credentials in Browser (§37, §43)

The browser **never receives** Sahara API credentials. The server owns the WebSocket connection to Sahara:

```
Browser                    Server                      Sahara
   │                          │                           │
   │── POST /api/voice/────→  │                           │
   │   sessions                │                           │
   │                          │─── WebSocket connect ───→ │
   │                          │                           │
   │← sessionId ───────────   │                           │
   │                          │                           │
   │── POST /api/voice/────→  │                           │
   │   audio (PCM16)           │                           │
   │                          │─── audio_chunk ────────→ │
   │                          │                           │
   │                          │← partial_transcript ────  │
   │← partial transcript ───  │                           │
```

### 2. Provider-Independent SpeechEvent (§11)

The `SpeechEvent` schema is provider-agnostic. It can represent transcripts from Sahara, AssemblyAI, Whisper, or any future provider:

```typescript
type SpeechEvent = {
  provider: "sahara" | "assemblyai" | "whisper" | "other";
  providerVersion: string;
  transcript: { text: string; segments: TranscriptSegment[] };
  codeSwitch: { detected: boolean; switchCount: number; density?: number; pairs: string[] };
  timing: { startedAt: string; endedAt: string };
  provenance: EvidenceRef[];
};
```

### 3. PCM16 Audio Format (§35)

Sahara requires:
- **Sample rate**: 16kHz (16,000 Hz)
- **Channels**: 1 (mono)
- **Bit depth**: 16-bit signed integers
- **Format**: Int16Array (little-endian)
- **Max chunk size**: 64KB

Browser audio (typically 48kHz stereo Float32) must be converted to this format before transmission.

## Implementation Components

### 1. Database Schema

**Migration**: `supabase/migrations/0002_voice_ingestion.sql`

Tables:
- `voice_sessions`: Live transcription sessions with state tracking
- `speech_events`: Immutable committed transcripts with provenance

RLS policies enforce workspace-scoped access (§41–§43).

### 2. Sahara WebSocket Adapter

**File**: `src/providers/sahara-websocket-adapter.ts`

Implements the `SaharaProvider` interface using real WebSocket connections to Sahara's streaming endpoint.

Protocol messages:
- `start_session` → `session_ready`
- `audio_chunk` → `audio_ack` | `partial_transcript`
- `commit` → `final_transcript`
- `error` → handled errors (AUTH_FAILED, QUOTA_EXCEEDED, INVALID_AUDIO, etc.)

### 3. Voice Database Service

**File**: `src/services/voice/db.ts`

Persists sessions and speech events to Supabase with workspace tenancy enforcement.

### 4. API Routes

#### POST /api/voice/sessions

Creates a new voice session. Returns `sessionId` and audio configuration.

**Request**:
```json
{
  "workspaceId": "ws_123",
  "traceId": "trace_456" // optional
}
```

**Response**:
```json
{
  "sessionId": "sess_abc123",
  "traceId": "trace_456",
  "status": "ready",
  "config": {
    "sampleRate": 16000,
    "channels": 1,
    "bitDepth": 16,
    "maxChunkBytes": 65536
  }
}
```

#### POST /api/voice/audio

Sends PCM16 audio chunk to active session.

**Request**:
```json
{
  "sessionId": "sess_abc123",
  "workspaceId": "ws_123",
  "sequence": 0,
  "audioData": "AAABAAIAAP//..." // base64-encoded PCM16
}
```

**Response**:
```json
{
  "accepted": true,
  "sequence": 0,
  "type": "partial_transcript", // optional
  "transcript": "Hello there", // optional
  "segments": [] // optional
}
```

#### POST /api/voice/commit

Commits session and creates final SpeechEvent.

**Request**:
```json
{
  "sessionId": "sess_abc123",
  "workspaceId": "ws_123",
  "traceId": "trace_456",
  "transcript": "Remind me to call Ngozi tomorrow",
  "segments": [
    { "id": "seg_1", "startMs": 0, "endMs": 2500, "text": "Remind me to call Ngozi tomorrow" }
  ],
  "language": "en",
  "codeSwitch": {
    "detected": false,
    "switchCount": 0,
    "pairs": []
  }
}
```

**Response**:
```json
{
  "success": true,
  "speechEvent": {
    "id": "speech_xyz789",
    "traceId": "trace_456",
    "sessionId": "sess_abc123",
    "provider": "sahara",
    "transcript": "Remind me to call Ngozi tomorrow",
    "segments": [...],
    "codeSwitch": {...},
    "timing": {...}
  }
}
```

### 5. Browser-Side Audio Utilities

**File**: `src/lib/audio/pcm16-encoder.ts`

Converts browser Float32 audio to PCM16 format:

```typescript
// Example: process microphone audio
const audioBuffer = [leftChannel, rightChannel]; // Float32Array[]
const sourceSampleRate = 48000; // browser native rate

const pcm16 = processAudioBuffer(audioBuffer, sourceSampleRate, SAHARA_AUDIO_CONFIG);
const base64 = int16ArrayToBase64(pcm16);

// Send to server
await fetch("/api/voice/audio", {
  method: "POST",
  body: JSON.stringify({
    sessionId,
    workspaceId,
    sequence,
    audioData: base64,
  }),
});
```

Functions:
- `downsample()`: Resample from source rate to 16kHz
- `stereoToMono()`: Average stereo channels
- `float32ToInt16()`: Convert Float32 [-1, 1] to Int16 [-32768, 32767]
- `processAudioBuffer()`: Complete pipeline
- `int16ArrayToBase64()`: Encode for HTTP transmission

Optional: `PCM16_PROCESSOR_CODE` for AudioWorklet-based real-time processing.

## Usage Example

### Server-Side Session Creation

```typescript
// Create session (API route)
const session = await pipeline.startSession({
  traceId: "trace_123",
  workspaceId: "ws_1",
});

// Persist to database
await dbService.createSession(session);
```

### Client-Side Audio Capture

```typescript
// 1. Request microphone permission
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// 2. Create session
const response = await fetch("/api/voice/sessions", {
  method: "POST",
  body: JSON.stringify({ workspaceId: "ws_1" }),
});
const { sessionId, config } = await response.json();

// 3. Set up audio processing
const audioContext = new AudioContext({ sampleRate: 48000 });
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

let sequence = 0;

processor.onaudioprocess = async (event) => {
  const inputBuffer = event.inputBuffer;
  const leftChannel = inputBuffer.getChannelData(0);
  const rightChannel = inputBuffer.numberOfChannels > 1 
    ? inputBuffer.getChannelData(1) 
    : leftChannel;

  // Convert to PCM16
  const pcm16 = processAudioBuffer(
    [leftChannel, rightChannel],
    audioContext.sampleRate,
    SAHARA_AUDIO_CONFIG
  );

  // Send to server
  const base64 = int16ArrayToBase64(pcm16);
  await fetch("/api/voice/audio", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      workspaceId: "ws_1",
      sequence: sequence++,
      audioData: base64,
    }),
  });
};

source.connect(processor);
processor.connect(audioContext.destination);

// 4. Stop and commit
function stopRecording() {
  processor.disconnect();
  source.disconnect();
  stream.getTracks().forEach(track => track.stop());

  await fetch("/api/voice/commit", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      workspaceId: "ws_1",
      traceId: "trace_123",
      transcript: "...", // from final partial transcript
      segments: [...],
      language: "en",
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
    }),
  });
}
```

## Error Handling

The pipeline handles:

1. **Connection Failure**: WebSocket connection to Sahara fails
2. **Authentication Failure**: Invalid Sahara API secret
3. **Quota Errors**: Sahara quota exceeded
4. **Malformed Audio**: Invalid PCM16 format
5. **Session Timeout**: Session expires after 5 minutes
6. **Backpressure**: Audio chunks sent faster than Sahara can process

Error responses follow Sahara protocol error codes:
- `AUTH_FAILED`: Invalid credentials
- `QUOTA_EXCEEDED`: Usage limit reached
- `INVALID_AUDIO`: Wrong format or corrupted
- `SESSION_TIMEOUT`: Inactive session
- `CONNECTION_FAILED`: Network issue
- `MALFORMED_MESSAGE`: Protocol violation

## Testing

### Unit Tests

**File**: `tests/unit/voice-ingestion.test.ts`

Tests cover:
- PCM16 encoding (downsampling, stereo-to-mono, Float32-to-Int16)
- Protocol message parsing
- Audio chunk validation
- End-to-end pipeline with mocked provider
- Code-switching metadata
- Session timeout handling
- Error scenarios

Run tests:
```bash
npm run test
```

### Integration Testing with Mocked Provider

```typescript
const mockProvider: SaharaProvider = {
  async startSession(input) {
    return { sessionId: "mock_sess", traceId: input.traceId, state: "ready", provider: "sahara", providerVersion: "2026.09" };
  },
  async sendAudioChunk(input) {
    return { type: "audio_ack", sessionId: input.sessionId, sequence: input.sequence, accepted: true, status: "accepted" };
  },
  async commit(input) {
    return { type: "final_transcript", sessionId: input.sessionId, traceId: input.traceId, transcript: input.transcript, segments: input.segments };
  },
};

const pipeline = new SaharaVoicePipeline({ provider: mockProvider });
```

## Configuration

Add to `.env.local`:

```bash
# Sahara Voice Provider
SAHARA_API_SECRET=your_sahara_api_secret_here
SAHARA_WS_ENDPOINT=wss://api.sahara.ai/v1/stream
```

**Security**: Never commit real credentials. Never expose `SAHARA_API_SECRET` to the browser.

## Limitations & Future Work

### Current Limitations

1. **No WebSocket in API routes**: Next.js deployment environments may not support persistent WebSocket connections in Route Handlers. For production, consider:
   - Supabase Edge Functions for WebSocket proxying
   - Dedicated WebSocket server (Node.js, Deno)
   - Third-party WebSocket gateway

2. **No semantic agent**: This implementation provides only the voice ingestion pipeline. Semantic interpretation (SpeechEvent → MeaningState) is not yet implemented.

3. **No real-time browser updates**: Partial transcripts are returned synchronously. For live UI updates, implement Supabase Realtime broadcast (§44).

4. **No audio chunk buffering**: Each audio chunk is sent immediately. For production, consider:
   - Client-side buffering (accumulate 250ms chunks)
   - Retry logic for failed transmissions
   - Network-aware quality adjustment

### Roadmap

- [ ] Implement Supabase Realtime for live transcript updates
- [ ] Add client-side audio buffering and retry logic
- [ ] Implement Semantic Agent (SpeechEvent → MeaningState)
- [ ] Add support for additional providers (AssemblyAI, Whisper)
- [ ] Production WebSocket deployment strategy
- [ ] Audio quality monitoring and diagnostics
- [ ] Benchmark integration (PAL_BENCHMARK.md)

## References

- **PAL_ARCHITECTURE.md §35–§37**: Voice pipeline architecture
- **PAL_ARCHITECTURE.md §11**: SpeechEvent schema
- **PAL_ARCHITECTURE.md §41–§43**: Tenancy and security
- **PAL_DOMAIN_MODEL.md**: SpeechEvent invariants
- **0002_voice_ingestion.sql**: Database schema

## Acceptance Criteria

✅ Microphone audio is captured and converted to PCM16 (16kHz, mono, 16-bit)  
✅ Browser sends audio chunks to server API (no provider credentials exposed)  
✅ Server maintains WebSocket connection to Sahara  
✅ Partial transcripts are received and can update UI  
✅ Final transcript is committed and persists as SpeechEvent  
✅ SpeechEvent contains full provenance chain  
✅ Code-switching metadata is captured where available  
✅ Session metadata is persisted with workspace tenancy  
✅ Error handling covers connection, auth, quota, audio format, and timeout failures  
✅ Tests validate protocol parsing, PCM16 encoding, and end-to-end pipeline  
✅ Integration test uses mocked Sahara provider  

**Status**: ✅ **Voice ingestion pipeline complete. Ready for semantic agent integration.**
