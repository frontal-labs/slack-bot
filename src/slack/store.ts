/**
 * In-memory implementation of the OCP `EventStore` contract.
 *
 * Used by the mock demo so the app runs without a database. Events are kept
 * in a Map keyed by `eventId`; the append is idempotent by design.
 *
 * The `EventStore` and `ActionExecutionRecord` shapes are duplicated here
 * (rather than imported) because they are not part of the SDK's public
 * surface — only the `openChannel()` consumer needs them at runtime.
 */
import type { EventEnvelope } from "@openchannelprotocol/sdk";

export interface ActionExecutionRecord {
  actionId: string;
  error?: unknown;
  owner?: string;
  result?: unknown;
  status: "claimed" | "completed" | "failed";
}

export interface EventStore {
  all: () => Promise<EventEnvelope[]>;
  append: (event: EventEnvelope) => Promise<void>;
  appendIfAbsent?: (event: EventEnvelope) => Promise<boolean>;
  claimAction?: (actionId: string, owner: string) => Promise<boolean>;
  close?: () => Promise<void> | void;
  completeAction?: (actionId: string, result: unknown) => Promise<void>;
  failAction?: (actionId: string, error: unknown) => Promise<void>;
  get?: (eventId: string) => Promise<EventEnvelope | undefined>;
  getAction?: (actionId: string) => Promise<ActionExecutionRecord | undefined>;
  has: (eventId: string) => Promise<boolean>;
  list?: (options?: { eventType?: string; limit?: number }) => Promise<
    EventEnvelope[]
  >;
  query?: (options?: { eventType?: string; limit?: number }) => Promise<
    EventEnvelope[]
  >;
}

export class InMemoryEventStore implements EventStore {
  private readonly events = new Map<string, EventEnvelope>();
  private readonly actions = new Map<string, ActionExecutionRecord>();

  all(): Promise<EventEnvelope[]> {
    return Promise.resolve([...this.events.values()]);
  }

  append(event: EventEnvelope): Promise<void> {
    this.events.set(event.eventId, event);
    return Promise.resolve();
  }

  appendIfAbsent(event: EventEnvelope): Promise<boolean> {
    if (this.events.has(event.eventId)) {
      return Promise.resolve(false);
    }
    this.events.set(event.eventId, event);
    return Promise.resolve(true);
  }

  has(eventId: string): Promise<boolean> {
    return Promise.resolve(this.events.has(eventId));
  }

  get(eventId: string): Promise<EventEnvelope | undefined> {
    return Promise.resolve(this.events.get(eventId));
  }

  list(options?: {
    eventType?: string;
    limit?: number;
  }): Promise<EventEnvelope[]> {
    const limit = options?.limit ?? 10_000;
    const result: EventEnvelope[] = [];
    for (const event of this.events.values()) {
      if (options?.eventType && event.payload.case !== options.eventType) {
        continue;
      }
      result.push(event);
      if (result.length >= limit) {
        break;
      }
    }
    return Promise.resolve(result);
  }

  query(options?: {
    eventType?: string;
    limit?: number;
  }): Promise<EventEnvelope[]> {
    return this.list(options);
  }

  claimAction(actionId: string, owner: string): Promise<boolean> {
    const existing = this.actions.get(actionId);
    if (existing) {
      if (existing.status === "claimed" && owner !== existing.owner) {
        existing.owner = owner;
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    }
    this.actions.set(actionId, { actionId, owner, status: "claimed" });
    return Promise.resolve(true);
  }

  completeAction(actionId: string, result: unknown): Promise<void> {
    this.actions.set(actionId, { actionId, result, status: "completed" });
    return Promise.resolve();
  }

  failAction(actionId: string, error: unknown): Promise<void> {
    this.actions.set(actionId, { actionId, error, status: "failed" });
    return Promise.resolve();
  }

  getAction(actionId: string): Promise<ActionExecutionRecord | undefined> {
    return Promise.resolve(this.actions.get(actionId));
  }

  close(): Promise<void> {
    this.events.clear();
    this.actions.clear();
    return Promise.resolve();
  }
}

export function createInMemoryStore(): InMemoryEventStore {
  return new InMemoryEventStore();
}
