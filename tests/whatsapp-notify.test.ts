jest.mock('../src/modules/whatsapp/graph-client', () => ({
  createGraphClient: () => ({ sendMessage: jest.fn().mockResolvedValue({ id: 'msg_1' }) }),
}));
jest.mock('../src/modules/whatsapp/whatsapp.repository', () => ({
  whatsappRepository: { log: jest.fn().mockResolvedValue({ id: 'log1' }) },
}));

import { Prisma } from '@prisma/client';
import { createMetaWhatsappProvider } from '../src/notifications/meta-whatsapp-provider';
import { whatsappRepository } from '../src/modules/whatsapp/whatsapp.repository';
import { buildInvoiceData, generateInvoicePdf } from '../src/modules/whatsapp/invoice';

const repo = whatsappRepository as jest.Mocked<typeof whatsappRepository>;

describe('Meta WhatsApp provider (Epic 4.3–4.4)', () => {
  it('sends a status template message and logs it', async () => {
    const provider = createMetaWhatsappProvider();
    expect(provider.supportsInvoice).toBe(true);

    await provider.sendOrderStatusUpdate({
      orderId: 'order-1',
      status: 'CONFIRMED',
      toNumber: '+919876543210',
    });

    expect(repo.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', relatedOrderId: 'order-1' }),
    );
  });

  it('sends an invoice document message and logs it', async () => {
    const provider = createMetaWhatsappProvider();
    await provider.sendInvoice({
      orderId: 'order-1',
      toNumber: '+919876543210',
      documentUrl: 'https://example.com/INV-1.pdf',
      fileName: 'INV-1.pdf',
    });
    expect(repo.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', templateName: 'invoice_document' }),
    );
  });

  it('skips sending when there is no recipient number', async () => {
    const provider = createMetaWhatsappProvider();
    await provider.sendOrderStatusUpdate({ orderId: 'order-1', status: 'SHIPPED', toNumber: null });
    expect(repo.log).not.toHaveBeenCalled();
  });
});

describe('Invoice generation (Epic 4.4)', () => {
  const order = {
    id: 'abcdef12-0000-0000-0000-000000000000',
    currency: 'INR',
    subtotal: new Prisma.Decimal('998.00'),
    discount: new Prisma.Decimal('0.00'),
    total: new Prisma.Decimal('998.00'),
    createdAt: new Date('2026-07-02T00:00:00Z'),
    items: [{ name: 'Classic Crew Neck', quantity: 2, unitPrice: new Prisma.Decimal('499.00') }],
  };

  it('builds invoice data with a stable number and line totals', () => {
    const data = buildInvoiceData(order);
    expect(data.invoiceNumber).toBe('INV-ABCDEF12');
    expect(data.date).toBe('2026-07-02');
    expect(data.lines[0]).toMatchObject({ quantity: 2, unitPrice: '499.00', lineTotal: '998.00' });
    expect(data.total).toBe('998.00');
  });

  it('renders a non-empty PDF buffer', async () => {
    const pdf = await generateInvoicePdf(buildInvoiceData(order));
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
