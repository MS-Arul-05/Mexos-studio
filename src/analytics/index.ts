import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { MetaEventsProvider } from './events-provider';
import { noopEventsProvider } from './noop-events-provider';
import { createMetaCapiProvider } from './meta-capi-provider';

/**
 * Events provider factory. Uses the real Meta CAPI provider only when a Pixel id +
 * token are configured; otherwise the no-op (so nothing blocks launch).
 */
function resolveProvider(): MetaEventsProvider {
  if (env.META_PIXEL_ID && env.META_CONVERSIONS_API_TOKEN) {
    return createMetaCapiProvider();
  }
  logger.warn('Meta CAPI not configured (no pixel id/token) — using no-op events provider.');
  return noopEventsProvider;
}

export const metaEventsProvider: MetaEventsProvider = resolveProvider();
export type { MetaEventsProvider, MetaEvent, MetaEventName } from './events-provider';
