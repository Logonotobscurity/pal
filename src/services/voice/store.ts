import { SaharaSessionRecord } from "@/providers/sahara";
import { SpeechEvent } from "@/core/schemas/speech-event";

const sessions = new Map<string, SaharaSessionRecord>();
const events: SpeechEvent[] = [];

export function saveSession(session: SaharaSessionRecord) {
  sessions.set(session.sessionId, session);
}

export function getSession(id: string): SaharaSessionRecord | undefined {
  return sessions.get(id);
}

export function listSessions(): SaharaSessionRecord[] {
  return Array.from(sessions.values());
}

export function addSpeechEvent(event: SpeechEvent) {
  events.push(event);
}

export function listEvents(): SpeechEvent[] {
  return events.slice();
}

export function listEventsForSession(sessionId: string): SpeechEvent[] {
  return events.filter((e) => e.sessionId === sessionId);
}
