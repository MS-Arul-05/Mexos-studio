import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import { storageProvider } from '../../storage';
import { decimalToString } from '../../utils/serialize';

export interface InvoiceOrder {
  id: string;
  currency: string;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  createdAt: Date;
  items: Array<{ name: string; quantity: number; unitPrice: Prisma.Decimal }>;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  currency: string;
  lines: Array<{ name: string; quantity: number; unitPrice: string; lineTotal: string }>;
  subtotal: string;
  discount: string;
  total: string;
}

export function buildInvoiceData(order: InvoiceOrder): InvoiceData {
  return {
    invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
    date: order.createdAt.toISOString().slice(0, 10),
    currency: order.currency,
    lines: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPrice: decimalToString(it.unitPrice) ?? '0.00',
      lineTotal: it.unitPrice.mul(it.quantity).toFixed(2),
    })),
    subtotal: decimalToString(order.subtotal) ?? '0.00',
    discount: decimalToString(order.discount) ?? '0.00',
    total: decimalToString(order.total) ?? '0.00',
  };
}

/** Render an invoice PDF into a Buffer. */
export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Custom T-Shirt Brand', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Invoice: ${data.invoiceNumber}`);
    doc.text(`Date: ${data.date}`);
    doc.moveDown();

    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.3);
    for (const line of data.lines) {
      doc.text(
        `${line.quantity} x ${line.name}  @ ${data.currency} ${line.unitPrice}  = ${data.currency} ${line.lineTotal}`,
      );
    }
    doc.moveDown();
    doc.text(`Subtotal: ${data.currency} ${data.subtotal}`);
    doc.text(`Discount: ${data.currency} ${data.discount}`);
    doc.fontSize(14).text(`Total: ${data.currency} ${data.total}`);

    doc.end();
  });
}

/** Generate the invoice PDF and store it, returning its URL + file name. */
export async function generateAndStoreInvoice(
  order: InvoiceOrder,
): Promise<{ fileUrl: string; fileName: string; invoiceNumber: string }> {
  const data = buildInvoiceData(order);
  const pdf = await generateInvoicePdf(data);
  const fileName = `${data.invoiceNumber}.pdf`;
  const key = `invoices/${order.id}/${fileName}`;
  const { fileUrl } = await storageProvider.putObject({
    key,
    body: pdf,
    contentType: 'application/pdf',
  });
  return { fileUrl, fileName, invoiceNumber: data.invoiceNumber };
}
