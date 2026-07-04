import type { SerializedCustomOrder } from '../custom-orders/custom-orders.service';
import type { SerializedOrder } from '../orders/orders.service';

/**
 * Message-template builders for click-to-chat (Epic 4.1). These produce the plain
 * text that gets URL-encoded into a wa.me link so the brand receives structured info.
 */

/** Join non-empty lines so optional fields don't leave blank rows. */
function lines(parts: Array<string | false | null | undefined>): string {
  return parts.filter((p): p is string => !!p).join('\n');
}

export function buildCustomOrderMessage(o: SerializedCustomOrder): string {
  return lines([
    "Hi! I'd like to order a custom T-shirt.",
    `Ref: ${o.id}`,
    `Base: ${o.baseType} | Size: ${o.size} | Qty: ${o.quantity}`,
    o.color && `Color: ${o.color}`,
    o.printType && `Print: ${o.printType}${o.printPlacement ? ` at ${o.printPlacement}` : ''}`,
    o.designDescription && `Notes: ${o.designDescription}`,
    o.quotedPrice && `Quoted price: ₹${o.quotedPrice}`,
    o.uploadedFileUrl && `Design file: ${o.uploadedFileUrl}`,
    `Contact: ${o.contactName} (${o.contactMobile})`,
  ]);
}

export function buildOrderMessage(o: SerializedOrder): string {
  const items = o.items.map((it) => `- ${it.quantity} x ${it.name}`).join('\n');
  return lines([
    "Hi! I'd like help with my order.",
    `Order: ${o.id}`,
    `Status: ${o.status}`,
    `Total: ${o.currency} ${o.total}`,
    items && `Items:\n${items}`,
  ]);
}

export function buildSupportMessage(): string {
  return 'Hi! I have a question and would like some help.';
}
