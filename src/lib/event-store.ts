import type { EventType } from "@/types";
import { mockEventTypes } from "./mock-data";

let eventTypes: EventType[] = [...mockEventTypes];
let listeners: (() => void)[] = [];

function emitChange() {
  listeners.forEach((l) => l());
}

export function getEventTypes(): EventType[] {
  return eventTypes;
}

export function addEventType(eventType: EventType): void {
  eventTypes = [...eventTypes, eventType];
  emitChange();
}

export function deleteEventType(id: string): void {
  eventTypes = eventTypes.filter((e) => e.id !== id);
  emitChange();
}

export function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
