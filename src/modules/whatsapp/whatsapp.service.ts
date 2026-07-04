import { env } from '../../config/env';
import { customOrdersService } from '../custom-orders/custom-orders.service';
import { ordersService } from '../orders/orders.service';
import { buildWaMeLink, type ChatLink } from './chat-link';
import { buildCustomOrderMessage, buildOrderMessage, buildSupportMessage } from './templates';
import type { ChatLinkQuery } from './whatsapp.schemas';

export interface ChatLinkRequester {
  userId?: string;
  guestOrderId?: string;
}

export const whatsappService = {
  /**
   * Build a wa.me click-to-chat link with a prefilled message from a custom order,
   * a formal order, or a generic support template (Epic 4.1). Access to a referenced
   * record is enforced by the underlying service (owner / capability / guest token).
   */
  async buildChatLink(query: ChatLinkQuery, requester: ChatLinkRequester): Promise<ChatLink> {
    let message: string;

    if (query.customOrderId) {
      const co = await customOrdersService.getById(query.customOrderId, {
        userId: requester.userId,
      });
      message = buildCustomOrderMessage(co);
    } else if (query.orderId) {
      const order = await ordersService.getById(query.orderId, {
        userId: requester.userId,
        guestOrderId: requester.guestOrderId,
      });
      message = buildOrderMessage(order);
    } else {
      message = buildSupportMessage();
    }

    return buildWaMeLink(env.WHATSAPP_BUSINESS_NUMBER, message);
  },
};
