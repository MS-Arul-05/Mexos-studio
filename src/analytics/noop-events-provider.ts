import type { MetaEvent, MetaEventsProvider } from './events-provider';
import { logger } from '../utils/logger';

/**
 * Default events provider until Meta Pixel id + CAPI token are configured
 * (Epic 6.5). Logs the event instead of sending it, so the dispatch wiring is
 * exercised end-to-end pre-configuration.
 * TODO: confirm with client — set META_PIXEL_ID + META_CONVERSIONS_API_TOKEN.
 */
export const noopEventsProvider: MetaEventsProvider = {
  name: 'noop',
  enabled: false,
  async track(event: MetaEvent): Promise<void> {
    logger.debug({ eventName: event.eventName, eventId: event.eventId }, '[capi:noop] event');
  },
};
