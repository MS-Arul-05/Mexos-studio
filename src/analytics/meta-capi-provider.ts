import { env } from '../config/env';
import type { MetaEvent, MetaEventsProvider } from './events-provider';

const GRAPH_VERSION = 'v21.0';

/**
 * Real Meta Conversions API provider. POSTs server-side events to the Graph API,
 * keyed by a shared event_id for Pixel dedup. Constructed only when a Pixel id +
 * CAPI token are present (see factory in ./index.ts).
 */
export function createMetaCapiProvider(): MetaEventsProvider {
  const pixelId = env.META_PIXEL_ID!;
  const token = env.META_CONVERSIONS_API_TOKEN!;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

  return {
    name: 'meta',
    enabled: true,
    async track(event: MetaEvent): Promise<void> {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name: event.eventName,
              event_time: event.eventTimeSeconds,
              event_id: event.eventId,
              action_source: 'website',
              ...(event.customData ? { custom_data: event.customData } : {}),
            },
          ],
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Meta CAPI event failed: ${res.status} ${text}`);
      }
    },
  };
}
