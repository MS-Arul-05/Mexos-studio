export interface ChatLink {
  url: string;
  phone: string;
  message: string;
}

/**
 * Build a click-to-chat deep link: https://wa.me/<digits>?text=<url-encoded message>.
 * The number is normalized to digits only (wa.me rejects '+' and spaces); the
 * message is URL-encoded so newlines/spaces/emoji survive intact (Epic 4.1).
 */
export function buildWaMeLink(rawNumber: string, message: string): ChatLink {
  const phone = rawNumber.replace(/\D/g, '');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return { url, phone, message };
}
