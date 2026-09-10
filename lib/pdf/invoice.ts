import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { formatKoboToNaira } from "@/lib/utils";

export interface InvoiceReceiptData {
  type: "INVOICE" | "RECEIPT";
  documentNumber: number;
  orderNumber: number;
  date: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceKobo: number;
    lineTotalKobo: number;
  }>;
  totalKobo: number;
  paystackReference?: string;
}

export async function generateDocumentPdf(data: InvoiceReceiptData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.1, 0.15, 0.25);
  const mutedColor = rgb(0.4, 0.45, 0.5);
  const darkColor = rgb(0.15, 0.15, 0.15);

  let y = height - 50;

  // Title / Header
  const title = data.type === "INVOICE" ? "INVOICE" : "OFFICIAL RECEIPT";
  page.drawText(title, {
    x: 50,
    y,
    size: 24,
    font: fontBold,
    color: primaryColor,
  });

  const docLabel = `${data.type === "INVOICE" ? "INV" : "REC"}-${String(data.documentNumber).padStart(5, "0")}`;
  page.drawText(docLabel, {
    x: width - 200,
    y,
    size: 14,
    font: fontBold,
    color: mutedColor,
  });

  y -= 30;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  y -= 35;
  // Metadata row
  page.drawText(`Date: ${data.date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}`, {
    x: 50,
    y,
    size: 10,
    font: fontRegular,
    color: darkColor,
  });

  page.drawText(`Order Reference: #${data.orderNumber}`, {
    x: 200,
    y,
    size: 10,
    font: fontRegular,
    color: darkColor,
  });

  if (data.paystackReference) {
    page.drawText(`Payment Ref: ${data.paystackReference}`, {
      x: 350,
      y,
      size: 10,
      font: fontRegular,
      color: darkColor,
    });
  }

  y -= 40;
  // Customer Details Box
  page.drawText("BILLED TO:", {
    x: 50,
    y,
    size: 10,
    font: fontBold,
    color: primaryColor,
  });
  y -= 16;
  page.drawText(data.customerName, {
    x: 50,
    y,
    size: 11,
    font: fontBold,
    color: darkColor,
  });
  y -= 14;
  page.drawText(`${data.customerEmail} | ${data.customerPhone}`, {
    x: 50,
    y,
    size: 10,
    font: fontRegular,
    color: mutedColor,
  });
  y -= 14;
  page.drawText(`Delivery Address: ${data.deliveryAddress}`, {
    x: 50,
    y,
    size: 10,
    font: fontRegular,
    color: mutedColor,
  });

  y -= 35;
  // Table Header
  page.drawRectangle({
    x: 50,
    y: y - 5,
    width: width - 100,
    height: 22,
    color: rgb(0.95, 0.96, 0.98),
  });

  page.drawText("ITEM DESCRIPTION", { x: 60, y: y + 2, size: 9, font: fontBold, color: primaryColor });
  page.drawText("QTY", { x: 330, y: y + 2, size: 9, font: fontBold, color: primaryColor });
  page.drawText("UNIT PRICE", { x: 390, y: y + 2, size: 9, font: fontBold, color: primaryColor });
  page.drawText("TOTAL", { x: 480, y: y + 2, size: 9, font: fontBold, color: primaryColor });

  y -= 25;

  // Table rows
  for (const item of data.items) {
    page.drawText(item.name.substring(0, 45), {
      x: 60,
      y,
      size: 10,
      font: fontRegular,
      color: darkColor,
    });

    page.drawText(String(item.quantity), {
      x: 335,
      y,
      size: 10,
      font: fontRegular,
      color: darkColor,
    });

    page.drawText(formatKoboToNaira(item.unitPriceKobo), {
      x: 390,
      y,
      size: 10,
      font: fontRegular,
      color: darkColor,
    });

    page.drawText(formatKoboToNaira(item.lineTotalKobo), {
      x: 480,
      y,
      size: 10,
      font: fontRegular,
      color: darkColor,
    });

    y -= 20;
  }

  y -= 10;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Total summary
  y -= 25;
  page.drawText("TOTAL AMOUNT:", {
    x: 360,
    y,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });

  page.drawText(formatKoboToNaira(data.totalKobo), {
    x: 480,
    y,
    size: 12,
    font: fontBold,
    color: primaryColor,
  });

  // Footer Note
  y = 60;
  page.drawText("Thank you for shopping with us! For customer support, reach out to our WhatsApp line.", {
    x: 50,
    y,
    size: 9,
    font: fontRegular,
    color: mutedColor,
  });

  return await pdfDoc.save();
}
