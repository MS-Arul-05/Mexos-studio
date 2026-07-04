/**
 * Server-side event provider for Meta Conversions API (Epic 6.5). Ships with a
 * no-op provider (logs) until a Pixel id + CAPI token are configured, then swaps to
 * the real Meta adapter. Every event carries an `eventId` shared with the client
 * Pixel call so Meta can deduplicate.
 */
export type MetaEventName = 'ViewOffer' | 'ViewProduct' | 'SubmitCustomDesign' | 'Purchase';

export interface MetaEvent {
  eventName: MetaEventName;
  eventId: string;
  eventTimeSeconds: number;
  customData?: Record<string, unknown>;
}

export interface MetaEventsProvider {
  readonly name: string;
  readonly enabled: boolean;
  track(event: MetaEvent): Promise<void>;
}
