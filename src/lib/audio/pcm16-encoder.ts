/**
 * PCM16 Audio Encoder — Browser-side audio capture and conversion
 * 
 * Implements PAL_ARCHITECTURE.md §35: microphone → PCM16 encoder → 16kHz mono
 * 
 * Converts browser Float32 audio samples to PCM16 format required by Sahara:
 * - Sample rate: 16kHz (downsampled from native rate if necessary)
 * - Channels: 1 (mono)
 * - Bit depth: 16-bit signed integers
 * - Format: Int16Array
 */

export type AudioConfig = {
  sampleRate: number; // Target: 16000
  channels: number; // Target: 1 (mono)
  bitDepth: number; // Target: 16
};

export const SAHARA_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
};

/**
 * Downsample Float32 audio from source sample rate to target sample rate
 */
export function downsample(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return samples;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.floor(samples.length / ratio);
  const result = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = Math.floor(i * ratio);
    result[i] = samples[sourceIndex] ?? 0;
  }

  return result;
}

/**
 * Convert stereo (2-channel) Float32 audio to mono by averaging channels
 */
export function stereoToMono(left: Float32Array, right: Float32Array): Float32Array {
  const length = Math.min(left.length, right.length);
  const mono = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    mono[i] = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
  }

  return mono;
}

/**
 * Convert Float32 samples (range -1.0 to 1.0) to Int16 (range -32768 to 32767)
 */
export function float32ToInt16(samples: Float32Array): Int16Array {
  const int16 = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1] range
    const sample = samples[i] ?? 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    // Convert to 16-bit integer
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return int16;
}

/**
 * Process raw browser audio samples into PCM16 format for Sahara
 */
export function processAudioBuffer(
  audioBuffer: Float32Array[],
  sourceSampleRate: number,
  targetConfig: AudioConfig = SAHARA_AUDIO_CONFIG,
): Int16Array {
  // 1. Convert to mono if stereo
  let mono: Float32Array;
  if (audioBuffer.length === 2) {
    const left = audioBuffer[0];
    const right = audioBuffer[1];
    if (!left || !right) {
      throw new Error("Invalid stereo audio buffer");
    }
    mono = stereoToMono(left, right);
  } else if (audioBuffer.length === 1) {
    const channel = audioBuffer[0];
    if (!channel) {
      throw new Error("Invalid mono audio buffer");
    }
    mono = channel;
  } else {
    throw new Error(`Unsupported channel count: ${audioBuffer.length}`);
  }

  // 2. Downsample if necessary
  const resampled = downsample(mono, sourceSampleRate, targetConfig.sampleRate);

  // 3. Convert to Int16
  const pcm16 = float32ToInt16(resampled);

  return pcm16;
}

/**
 * Convert Int16Array to base64 string for HTTP transmission
 */
export function int16ArrayToBase64(samples: Int16Array): string {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0;
    view.setInt16(i * 2, sample, true); // little-endian
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }

  return btoa(binary);
}

/**
 * AudioWorklet processor for real-time PCM16 encoding
 * Register this processor before creating audio nodes
 */
export const PCM16_PROCESSOR_CODE = `
class PCM16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = options.processorOptions?.targetSampleRate ?? 16000;
    this.sourceSampleRate = sampleRate;
    this.ratio = this.sourceSampleRate / this.targetSampleRate;
    this.buffer = [];
    this.sampleIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    // Get mono channel (or average if stereo)
    let samples;
    if (input.length === 2) {
      const left = input[0];
      const right = input[1];
      samples = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        samples[i] = (left[i] + right[i]) / 2;
      }
    } else {
      samples = input[0];
    }

    // Downsample and convert to Int16
    for (let i = 0; i < samples.length; i++) {
      const targetIndex = Math.floor(this.sampleIndex / this.ratio);
      
      if (targetIndex >= this.buffer.length) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        const int16 = clamped < 0 ? Math.floor(clamped * 0x8000) : Math.floor(clamped * 0x7fff);
        this.buffer.push(int16);
      }
      
      this.sampleIndex++;
    }

    // Send chunks when buffer reaches threshold (e.g., 4096 samples = ~250ms at 16kHz)
    if (this.buffer.length >= 4096) {
      const chunk = new Int16Array(this.buffer.splice(0, 4096));
      this.port.postMessage({ type: 'audio', samples: chunk });
    }

    return true;
  }
}

registerProcessor('pcm16-processor', PCM16Processor);
`;

/**
 * Create and register the PCM16 AudioWorklet processor
 */
export async function registerPCM16Processor(audioContext: AudioContext): Promise<void> {
  const blob = new Blob([PCM16_PROCESSOR_CODE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    await audioContext.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
