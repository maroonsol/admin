import path from "path";
import fs from "fs";
import { PDFDocument, PageSizes, StandardFonts, rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib';
import { indianStates } from './data';
import { gstServiceCodeLabel, SERVICE_TYPE_LABELS } from './service-codes';

interface InvoiceItem {
  hsnSac: string;
  description: string;
  qty: number;
  rate: number;
  taxableAmount: number;
  gstRate: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

export interface InvoiceServiceRow {
  serviceType: string;
  serviceCode?: string | null;
  domainName: string | null;
  serverIp: string | null;
  emailName: string | null;
  startDate: string;
  endDate: string;
  planCode: string | null;
  gstFilingYear?: number | null;
  gstFilingMonth?: number | null;
  gstQuarter?: number | null;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceType: 'B2B' | 'B2C' | 'EXPORT';
  invoiceDate: string;
  isExport: boolean;
  currency: string;
  exchangeRate: number;
  lutNumber?: string;
  
  // Customer details
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerAddress2?: string;
  customerDistrict?: string;
  customerState?: string;
  customerPincode?: string;
  customerGst?: string;
  
  // Financial details
  subtotal: number;
  totalTax: number;
  discount: number;
  totalPaid: number;
  grandTotal: number;
  balanceAmount: number;
  
  items: InvoiceItem[];
  /** Services linked to this invoice (for B2B "invoice includes services period") */
  services?: InvoiceServiceRow[];
  /** Shown above the services table when billing uses a different GSTIN (B2B multi-GST) */
  servicesBillToGstNote?: string;
}

export interface TableCell {
  text: string;
  align?: "left" | "center" | "right";
  font?: PDFFont;
  fontSize?: number;
  background?: boolean;
  image?: PDFImage;
  noWrap?: boolean; // For numeric columns
}

export interface TableRow {
  cells: TableCell[];
}

export interface DrawTableOptions {
  page: PDFPage;
  startX: number;
  startY: number;
  tableWidth: number;
  columns: number[]; // actual widths in points
  rows: TableRow[];
  font: PDFFont;
  boldFont: PDFFont;
  fontSize: number;
  cellPadding?: number;
  lineHeight?: number;
}

// Global settings (exported for use by ledger and other PDF generators)
export const PAGE_MARGIN = 5;
export const FONT_SIZE = 8; // Default font size
export const LINE_HEIGHT = 12;
export const CELL_PADDING = 6;
export const CELL_PADDING_VERTICAL = 4; // Vertical padding inside each cell (rows still connect)
const SECTION_SPACING = 0; // No gap between sections - rows connect like one table
const LOGO_HEIGHT = 20;

// Helper to convert number to words
function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " and " + numberToWords(num % 100) : "");
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + numberToWords(num % 1000) : "");
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + numberToWords(num % 100000) : "");
  return numberToWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + numberToWords(num % 10000000) : "");
}

// Helper to format date
function formatDate(dateInput: string): string {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN');
}

// Helper to wrap text
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
      line = testLine;
      return;
    }
    if (line) lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Measure column widths dynamically
function measureColumnWidths(
  headers: string[],
  rows: TableRow[],
  font: PDFFont,
  fontSize: number
): number[] {
  const widths = headers.map((h) => font.widthOfTextAtSize(h, fontSize) + (CELL_PADDING * 2));
  
  rows.forEach((row) => {
    row.cells.forEach((cell, i) => {
      const cellFont = cell.font || font;
      if (cell.noWrap) {
        // For no-wrap columns, measure single line (first line if multi-line)
        const firstLine = cell.text.split('\n')[0] || cell.text;
        const w = cellFont.widthOfTextAtSize(firstLine, fontSize) + (CELL_PADDING * 2);
        widths[i] = Math.max(widths[i], w);
      } else {
        // For wrap columns, measure longest line (not individual words)
        const lines = cell.text.split('\n');
        lines.forEach((line) => {
          const w = cellFont.widthOfTextAtSize(line, fontSize) + (CELL_PADDING * 2);
          widths[i] = Math.max(widths[i], w);
        });
      }
    });
  });
  
  return widths;
}

// Fit columns to page width
function fitColumnsToPage(
  widths: number[],
  tableWidth: number,
  flexibleIndices: number[]
): number[] {
  const total = widths.reduce((a, b) => a + b, 0);
  
  if (total <= tableWidth) return widths;
  
  const overflow = total - tableWidth;
  const flexibleTotal = flexibleIndices.reduce((sum, idx) => sum + widths[idx], 0);
  
  if (flexibleTotal === 0) return widths; // No flexible columns
  
  // Shrink flexible columns proportionally
  flexibleIndices.forEach((idx) => {
    const proportion = widths[idx] / flexibleTotal;
    const shrink = Math.min(widths[idx] * 0.5, overflow * proportion);
    widths[idx] = Math.max(widths[idx] - shrink, 30); // Minimum 30 points
  });
  
  // If still overflowing, shrink description column more (it's most flexible)
  const newTotal = widths.reduce((a, b) => a + b, 0);
  if (newTotal > tableWidth) {
    const remainingOverflow = newTotal - tableWidth;
    const descIndex = flexibleIndices[0]; // Description is first flexible
    widths[descIndex] = Math.max(widths[descIndex] - remainingOverflow, 30); // Minimum 30 points
  }
  
  return widths;
}

// Measure row height based on cell content
function measureRowHeight(
  row: TableRow,
  columnWidths: number[],
  font: PDFFont,
  boldFont: PDFFont,
  fontSize: number,
  cellPadding: number,
  lineHeight: number
): number {
  let maxLines = 1;
  let hasImage = false;
  let maxFontSize = fontSize;
  
  row.cells.forEach((cell, cellIdx) => {
    if (cell.image) {
      hasImage = true;
      const imageHeight = LOGO_HEIGHT;
      const imageLines = Math.ceil(imageHeight / lineHeight);
      maxLines = Math.max(maxLines, imageLines);
    } else if (cell.text) {
      const cellWidth = columnWidths[cellIdx] - (cellPadding * 2);
      const cellFont = cell.font || font;
      const cellFontSize = cell.fontSize || fontSize;
      maxFontSize = Math.max(maxFontSize, cellFontSize);
      
      // Check for special formatting (company name, bill to, totals, recipient)
      const isCompanyName = cell.text.includes('Maroonsol Private Limited');
      const isBillToLabel = cell.text.startsWith('Bill To:');
      const isTotalsLabel = cell.text.includes('Total Invoice Amount:') || 
                           cell.text.includes('Total Paid:') || 
                           cell.text.includes('Balance Amount:') || 
                           cell.text.includes('Amount in Words:');
      
      if (cell.noWrap) {
        // No wrap - single line
        maxLines = Math.max(maxLines, 1);
      } else {
        // Wrap text
        const textLines = cell.text.split('\n');
        let cellHeight = 0;
        
        textLines.forEach((textLine, lineIdx) => {
          // Determine actual font size for this line
          let lineFontSize = cellFontSize;
          if (isCompanyName && lineIdx === 0) {
            lineFontSize = 10;
          } else if (isBillToLabel && lineIdx === 0) {
            lineFontSize = 10;
          } else if (isTotalsLabel && ['Total Invoice Amount:', 'Total Paid:', 'Balance Amount:', 'Amount in Words:'].some(label => textLine.startsWith(label))) {
            lineFontSize = 8;
          } else if (textLine.includes('(Original for Recipient)') && cellFontSize === 14) {
            lineFontSize = 8;
          }
          
          maxFontSize = Math.max(maxFontSize, lineFontSize);
          const wrappedLines = wrapText(textLine, cellWidth, cellFont, lineFontSize);
          cellHeight += wrappedLines.length;
        });
        
        maxLines = Math.max(maxLines, cellHeight);
      }
    }
  });
  
  if (hasImage) {
    const minHeight = LOGO_HEIGHT + (CELL_PADDING_VERTICAL * 2);
    const textHeight = maxLines * Math.max(lineHeight, maxFontSize + 2) + (CELL_PADDING_VERTICAL * 2);
    return Math.max(minHeight, textHeight);
  }
  
  return maxLines * Math.max(lineHeight, maxFontSize + 2) + (CELL_PADDING_VERTICAL * 2);
}

// Draw a single cell
function drawCell(
  page: PDFPage,
  cell: TableCell,
  x: number,
  y: number,
  width: number,
  height: number,
  font: PDFFont,
  boldFont: PDFFont,
  fontSize: number,
  cellPadding: number,
  lineHeight: number
): void {
  // Draw cell background if needed
  if (cell.background) {
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      color: rgb(0.94, 0.94, 0.94)
    });
  }
  
  // Draw cell border
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0)
  });
  
  // Draw image if present
  if (cell.image) {
    const imageHeight = LOGO_HEIGHT;
    const imageWidth = (cell.image.width / cell.image.height) * imageHeight;
    const imageX = x + cellPadding;
    const imageY = y - CELL_PADDING_VERTICAL - imageHeight;
    page.drawImage(cell.image, {
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight
    });
    return;
  }
  
  // Draw text
  if (cell.text) {
    const cellFont = cell.font || font;
    const cellFontSize = cell.fontSize || fontSize;
    const cellWidth = width - (cellPadding * 2);
    const align = cell.align || "left";
    
    // Check for special formatting needs
    const isCompanyName = cell.text.includes('Maroonsol Private Limited');
    const isBillToLabel = cell.text.startsWith('Bill To:');
    const isTotalsLabel = cell.text.includes('Total Invoice Amount:') || 
                         cell.text.includes('Total Paid:') || 
                         cell.text.includes('Balance Amount:') || 
                         cell.text.includes('Amount in Words:');
    
    if (cell.noWrap) {
      // No wrap - draw single line
      const text = cell.text.split('\n')[0] || cell.text;
      const textWidth = cellFont.widthOfTextAtSize(text, cellFontSize);
      let textX = x + cellPadding;
      
      if (align === "center") {
        textX = x + (width - textWidth) / 2;
      } else if (align === "right") {
        textX = x + width - textWidth - cellPadding;
      }
      
      const textY = y - CELL_PADDING_VERTICAL - cellFontSize;
      
      page.drawText(text, {
        x: textX,
        y: textY,
        size: cellFontSize,
        font: cellFont,
        color: rgb(0, 0, 0)
      });
    } else {
      // Wrap text
      const textLines = cell.text.split('\n');
      let lineY = y - CELL_PADDING_VERTICAL;
      
      textLines.forEach((textLine, lineIdx) => {
        // Determine font and size for this line
        let lineFont = cellFont;
        let lineFontSize = cellFontSize;
        
        // Special formatting rules
        if (isCompanyName && lineIdx === 0) {
          // First line is company name - bold and size 10
          lineFont = boldFont;
          lineFontSize = 10;
        } else if (isBillToLabel && lineIdx === 0) {
          // First line is "Bill To:" - bold and size 10
          lineFont = boldFont;
          lineFontSize = 10;
        } else if (isTotalsLabel) {
          // Check if this line is a totals label
          const totalsLabels = ['Total Invoice Amount:', 'Total Paid:', 'Balance Amount:', 'Amount in Words:'];
          if (totalsLabels.some(label => textLine.startsWith(label))) {
            lineFont = boldFont;
            lineFontSize = 10;
          }
        } else if (textLine.includes('(Original for Recipient)') && cellFontSize === 14) {
          // Recipient text below TAX INVOICE - size 8, regular font
          lineFont = font;
          lineFontSize = 8;
        }
        
        const wrappedLines = wrapText(textLine, cellWidth, lineFont, lineFontSize);
        
        wrappedLines.forEach((wrappedLine) => {
          const textWidth = lineFont.widthOfTextAtSize(wrappedLine, lineFontSize);
          let textX = x + cellPadding;
          
          if (align === "center") {
            textX = x + (width - textWidth) / 2;
          } else if (align === "right") {
            textX = x + width - textWidth - cellPadding;
          }
          
          const textY = lineY - lineFontSize;
          
          page.drawText(wrappedLine, {
            x: textX,
            y: textY,
            size: lineFontSize,
            font: lineFont,
            color: rgb(0, 0, 0)
          });
          
          lineY -= Math.max(lineHeight, lineFontSize + 2);
        });
      });
    }
  }
}

// Main table drawing function (exported for use by ledger and other PDF generators)
export function drawTable(options: DrawTableOptions): number {
  const {
    page,
    startX,
    startY,
    tableWidth,
    columns,
    rows,
    font,
    boldFont,
    fontSize,
    cellPadding = CELL_PADDING,
    lineHeight = LINE_HEIGHT
  } = options;
  
  let currentY = startY;
  
  rows.forEach((row) => {
    // Measure row height
    const rowHeight = measureRowHeight(row, columns, font, boldFont, fontSize, cellPadding, lineHeight);
    
    // Draw row cells
    let currentX = startX;
    row.cells.forEach((cell, cellIdx) => {
      drawCell(
        page,
        cell,
        currentX,
        currentY,
        columns[cellIdx],
        rowHeight,
        font,
        boldFont,
        fontSize,
        cellPadding,
        lineHeight
      );
      currentX += columns[cellIdx];
    });
    
    // Move to next row
    currentY -= rowHeight;
  });
  
  return currentY;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  try {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Load logo image
    let logoImage: PDFImage | null = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "logo", "logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
    
    // Determine if customer is in same state as company
    const isSameState = invoiceData.customerState === 'Bihar';
    
    // Get state code for place of supply
    interface StateInfo {
      name: string;
      code: string;
    }
    const stateCode = (indianStates as StateInfo[]).find((s) => s.name === invoiceData.customerState)?.code || '19';
    
    // Calculate rounding
    const roundedTotal = Math.round(invoiceData.grandTotal);
    const roundingDiff = roundedTotal - invoiceData.grandTotal;
    
    const tableWidth = width - (PAGE_MARGIN * 2);
    let currentY = height - PAGE_MARGIN;
    
    // ============================================
    // SECTION 1: HEADER TABLE
    // Row 1: Logo | TAX INVOICE
    // Row 2: Company Details | Invoice Meta
    // ============================================
    const invoiceTitle = invoiceData.isExport ? 'EXPORT INVOICE' : 'TAX INVOICE';
    const recipientText = '(Original for Recipient)';
    const companyName = 'Maroonsol Private Limited';
    const companyAddress = 'Khairatali, Mittan Chak, Patna, Bihar, India, 804453';
    const companyContact = 'info@maroonsol.com | (+91) 9305166411';
    const companyGst = 'GSTIN: 10AATCM8978R1Z8 | PAN: AATCM8978R | CIN: U69100BR2025PTC079059';
    const placeOfSupply = `Place of Supply: ${invoiceData.customerState || 'West Bengal'} (${stateCode})`;
    
    // Header table rows
    const headerRows: TableRow[] = [
      {
        cells: [
          {
            text: '',
            image: logoImage || undefined,
            align: 'left'
          },
          {
            text: `${invoiceTitle}\n${recipientText}`,
            align: 'right',
            font: boldFont,
            fontSize: 14 // TAX INVOICE font size (recipient will be handled in drawCell)
          }
        ]
      },
      {
        cells: [
          {
            text: `${companyName}\n${companyAddress}\n${companyContact}\n${companyGst}\n${placeOfSupply}`,
            align: 'left',
            font: font // Will handle company name separately
          },
          {
            text: `Invoice No: ${invoiceData.invoiceNumber}\nInvoice Date: ${formatDate(invoiceData.invoiceDate)}\n${placeOfSupply}\nInvoice Amount: ${invoiceData.currency} ${roundedTotal.toFixed(2)}`,
            align: 'right'
          }
        ]
      }
    ];
    
    // Set company name to bold and size 10 (we'll handle this in drawCell)
    headerRows[1].cells[0].text = `${companyName}\n${companyAddress}\n${companyContact}\n${companyGst}\n${placeOfSupply}`;
    
    // Calculate header column widths (50-50 split for logo and Tax Invoice)
    const headerColWidths = [
      tableWidth * 0.5, // Logo column
      tableWidth * 0.5  // Tax Invoice column
    ];
    
    // Draw first row (Logo | TAX INVOICE)
    currentY = drawTable({
      page,
      startX: PAGE_MARGIN,
      startY: currentY,
      tableWidth,
      columns: headerColWidths,
      rows: [headerRows[0]],
      font,
      boldFont,
      fontSize: FONT_SIZE
    });
    
    currentY -= SECTION_SPACING;
    
    // Draw second row (Company Details | Invoice Meta)
    const companyColWidths = [
      tableWidth * 0.5,
      tableWidth * 0.5
    ];
    
    currentY = drawTable({
      page,
      startX: PAGE_MARGIN,
      startY: currentY,
      tableWidth,
      columns: companyColWidths,
      rows: [headerRows[1]],
      font,
      boldFont,
      fontSize: FONT_SIZE
    });
    
    currentY -= SECTION_SPACING;
    
    // ============================================
    // SECTION 2: BILLING TABLE (1 column - Bill To only)
    // ============================================
    // Build address as continuous text (will wrap automatically)
    const addressParts: string[] = [];
    if (invoiceData.customerAddress) addressParts.push(invoiceData.customerAddress);
    if (invoiceData.customerAddress2) addressParts.push(invoiceData.customerAddress2);
    if (invoiceData.customerDistrict) addressParts.push(invoiceData.customerDistrict);
    if (invoiceData.customerState && invoiceData.customerPincode) {
      addressParts.push(`${invoiceData.customerState} - ${invoiceData.customerPincode}`);
    }
    const fullAddress = addressParts.join(', ');
    
    // Build phone and email line
    const phoneEmailParts: string[] = [];
    if (invoiceData.customerPhone) phoneEmailParts.push(`Phone: ${invoiceData.customerPhone}`);
    if (invoiceData.customerEmail) phoneEmailParts.push(`Email: ${invoiceData.customerEmail}`);
    const phoneEmailLine = phoneEmailParts.join(' | ');
    
    // Build Bill To text with proper formatting
    const billToTextParts: string[] = [];
    billToTextParts.push('Bill To:');
    billToTextParts.push(invoiceData.customerName);
    if (fullAddress) billToTextParts.push(fullAddress);
    if (invoiceData.customerGst) billToTextParts.push(`GST: ${invoiceData.customerGst}`);
    if (phoneEmailLine) billToTextParts.push(phoneEmailLine);
    
    const billingRows: TableRow[] = [
      {
        cells: [
          {
            text: billToTextParts.join('\n'),
            align: 'left',
            font: font
          }
        ]
      }
    ];
    
    currentY = drawTable({
      page,
      startX: PAGE_MARGIN,
      startY: currentY,
      tableWidth,
      columns: [tableWidth],
      rows: billingRows,
      font,
      boldFont,
      fontSize: FONT_SIZE
    });
    
    currentY -= SECTION_SPACING;
    
    // ============================================
    // SECTION 3: ITEMS TABLE (Dynamic columns)
    // ============================================
    const itemsHeaders = isSameState
      ? ['S.No', 'Description', 'HSN/SAC', 'Rate', 'Qty', 'Taxable Amount', 'CGST (Rate & Amount)', 'SGST (Rate & Amount)', 'Total']
      : ['S.No', 'Description', 'HSN/SAC', 'Rate', 'Qty', 'Taxable Amount', 'IGST (Rate & Amount)', 'Total'];
    
    // Prepare item rows data
    const itemsData: string[][] = invoiceData.items.map((item, idx) => {
      if (isSameState) {
        return [
          String(idx + 1),
          item.description,
          item.hsnSac,
          `${invoiceData.currency} ${item.rate.toFixed(2)}`,
          String(item.qty),
          `${invoiceData.currency} ${item.taxableAmount.toFixed(2)}`,
          `${(item.gstRate/2).toFixed(1)}%\n${invoiceData.currency} ${item.cgstAmount.toFixed(2)}`,
          `${(item.gstRate/2).toFixed(1)}%\n${invoiceData.currency} ${item.sgstAmount.toFixed(2)}`,
          `${invoiceData.currency} ${item.totalAmount.toFixed(2)}`
        ];
      } else {
        return [
          String(idx + 1),
          item.description,
          item.hsnSac,
          `${invoiceData.currency} ${item.rate.toFixed(2)}`,
          String(item.qty),
          `${invoiceData.currency} ${item.taxableAmount.toFixed(2)}`,
          `${item.gstRate}%\n${invoiceData.currency} ${item.igstAmount.toFixed(2)}`,
          `${invoiceData.currency} ${item.totalAmount.toFixed(2)}`
        ];
      }
    });
    
    // Convert to TableRow format
    const itemsRows: TableRow[] = [
      {
        cells: itemsHeaders.map((h) => ({
          text: h,
          align: 'center' as "left" | "center" | "right",
          font: boldFont,
          fontSize: 8, // Header font size
          background: true,
          noWrap: false
        }))
      },
      ...itemsData.map((rowData) => ({
        cells: rowData.map((cellText, cellIdx) => {
          // Description column (index 1) can wrap; tax columns (CGST/SGST/IGST) have % + amount on two lines
          const isDescription = cellIdx === 1;
          const isTaxColumn = isSameState ? (cellIdx === 6 || cellIdx === 7) : (cellIdx === 6);
          const isNumeric = [0, 3, 4, 5, isSameState ? (cellIdx === 6 || cellIdx === 7 || cellIdx === 8) : (cellIdx === 6 || cellIdx === 7)].includes(cellIdx);
          
          let align: "left" | "center" | "right" = 'center';
          if (isDescription) {
            align = 'left';
          } else if (isNumeric) {
            align = 'right';
          }
          
          // Tax columns: show both lines (percentage + amount), so noWrap must be false
          return {
            text: cellText,
            align: align,
            noWrap: !isDescription && !isTaxColumn
          };
        })
      }))
    ];
    
    // Measure column widths
    let columnWidths = measureColumnWidths(itemsHeaders, itemsRows, font, FONT_SIZE);
    
    // Define flexible and fixed columns
    const flexibleIndices = isSameState 
      ? [1, 6, 7] // Description, CGST, SGST
      : [1, 6]; // Description, IGST
    
    // Fit columns to page
    columnWidths = fitColumnsToPage(columnWidths, tableWidth, flexibleIndices);
    
    // Check if still overflowing and reduce font size if needed
    let tableFontSize = FONT_SIZE;
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    if (totalWidth > tableWidth) {
      tableFontSize = 9;
      // Re-measure with smaller font
      columnWidths = measureColumnWidths(itemsHeaders, itemsRows, font, tableFontSize);
      columnWidths = fitColumnsToPage(columnWidths, tableWidth, flexibleIndices);
      const newTotalWidth = columnWidths.reduce((a, b) => a + b, 0);
      if (newTotalWidth > tableWidth * 1.1) {
        tableFontSize = 8;
        columnWidths = measureColumnWidths(itemsHeaders, itemsRows, font, tableFontSize);
        columnWidths = fitColumnsToPage(columnWidths, tableWidth, flexibleIndices);
      }
    }
    
    // Update rows with correct font size
    itemsRows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (!cell.fontSize) {
          cell.fontSize = tableFontSize;
        }
      });
    });
    
    currentY = drawTable({
      page,
      startX: PAGE_MARGIN,
      startY: currentY,
      tableWidth,
      columns: columnWidths,
      rows: itemsRows,
      font,
      boldFont,
      fontSize: tableFontSize
    });
    
    currentY -= SECTION_SPACING;

    // ============================================
    // SECTION 3b: SERVICES COVERED (if any)
    // ============================================
    const services = invoiceData.services ?? [];
    if (services.length > 0) {
      const serviceTypeLabel = (t: string) => SERVICE_TYPE_LABELS[t] ?? t;
      const serviceDesc = (s: InvoiceServiceRow) => {
        if (s.serviceType === 'DOMAIN' && s.domainName) return s.domainName;
        if ((s.serviceType === 'VPS' || s.serviceType === 'WEB_HOSTING') && s.serverIp) return s.serverIp;
        if (s.serviceType === 'DOMAIN_EMAIL' && s.emailName) return s.emailName;
        if (s.serviceType === 'GST_SERVICES' && s.serviceCode) {
          const label = gstServiceCodeLabel(s.serviceCode);
          const parts = [label];
          if (s.serviceCode === 'GST_FILING_MON' && s.gstFilingMonth && s.gstFilingYear) {
            parts.push(`M${String(s.gstFilingMonth).padStart(2, '0')}/${s.gstFilingYear}`);
          }
          if (s.serviceCode === 'GST_FILING_QTR' && s.gstQuarter && s.gstFilingYear != null) {
            parts.push(`Q${s.gstQuarter} FY${s.gstFilingYear}–${String(s.gstFilingYear + 1).slice(-2)}`);
          }
          return parts.join(' · ');
        }
        return '-';
      };
      if (invoiceData.servicesBillToGstNote) {
        const gstCtxRow: TableRow[] = [
          {
            cells: [
              {
                text: invoiceData.servicesBillToGstNote,
                align: 'left',
                font,
                fontSize: FONT_SIZE,
              },
            ],
          },
        ];
        currentY = drawTable({
          page,
          startX: PAGE_MARGIN,
          startY: currentY,
          tableWidth,
          columns: [tableWidth],
          rows: gstCtxRow,
          font,
          boldFont,
          fontSize: FONT_SIZE,
        });
        currentY -= SECTION_SPACING;
      }

      const servicesTitleRow: TableRow[] = [
        {
          cells: [{ text: 'Services covered in this invoice', align: 'left', font: boldFont, fontSize: 9 }],
        },
      ];
      currentY = drawTable({
        page,
        startX: PAGE_MARGIN,
        startY: currentY,
        tableWidth,
        columns: [tableWidth],
        rows: servicesTitleRow,
        font,
        boldFont,
        fontSize: FONT_SIZE,
      });
      currentY -= SECTION_SPACING;
      const servicesHeaders = ['S.No', 'Service Type', 'Description', 'Start Date', 'End Date', 'Plan Code'];
      const servicesData: string[][] = services.map((s, idx) => [
        String(idx + 1),
        serviceTypeLabel(s.serviceType),
        serviceDesc(s),
        formatDate(s.startDate),
        formatDate(s.endDate),
        s.planCode ?? '-',
      ]);
      const servicesRows: TableRow[] = [
        {
          cells: servicesHeaders.map((h) => ({
            text: h,
            align: 'center' as const,
            font: boldFont,
            fontSize: 8,
            background: true,
            noWrap: false,
          })),
        },
        ...servicesData.map((rowData) => ({
          cells: rowData.map((text, cellIdx) => ({
            text,
            align: (cellIdx === 2 ? 'left' : 'center') as 'left' | 'center' | 'right',
            noWrap: false,
          })),
        })),
      ];
      const servicesColCount = servicesHeaders.length;
      const servicesColWidths = Array(servicesColCount).fill(tableWidth / servicesColCount);
      currentY = drawTable({
        page,
        startX: PAGE_MARGIN,
        startY: currentY,
        tableWidth,
        columns: servicesColWidths,
        rows: servicesRows,
        font,
        boldFont,
        fontSize: FONT_SIZE,
      });
      currentY -= SECTION_SPACING;
    }

    // ============================================
    // SECTION 4: BANK + TOTALS TABLE (2 columns)
    // ============================================
    const bankDetailsLines: string[] = ['Bank Details:'];
    bankDetailsLines.push('Bank Name: AXIS BANK');
    bankDetailsLines.push('Account Number: 925020031020697');
    bankDetailsLines.push('IFSC Code: UTIB0005552');
    bankDetailsLines.push('Branch: KURTHAUR PARSA BRANCH');
    bankDetailsLines.push('Account Holder: MAROONSOL PRIVATE LIMITED');
    if (invoiceData.isExport) {
      bankDetailsLines.push('SWIFT CODE: AXISINBB142');
    }
    bankDetailsLines.push('');
    bankDetailsLines.push('1. Please make all cheques/DD payable to MAROONSOL PRIVATE LIMITED');
    bankDetailsLines.push('2. This is a computer generated Invoice and does not require any stamp or signature');
    
    const totalsLines: string[] = [];
    totalsLines.push(`Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}`);
    totalsLines.push(`Total Tax: ${invoiceData.currency} ${invoiceData.totalTax.toFixed(2)}`);
    if (invoiceData.discount > 0) {
      totalsLines.push(`Discount: -${invoiceData.currency} ${invoiceData.discount.toFixed(2)}`);
    }
    totalsLines.push(`Grand Total: ${invoiceData.currency} ${invoiceData.grandTotal.toFixed(2)}`);
    if (roundingDiff !== 0) {
      totalsLines.push(`Rounding Off: ${roundingDiff > 0 ? '+' : ''}${invoiceData.currency} ${roundingDiff.toFixed(2)}`);
    }
    totalsLines.push(`Total Invoice Amount: ${invoiceData.currency} ${roundedTotal.toFixed(2)}`);
    totalsLines.push(`Total Paid: ${invoiceData.currency} ${invoiceData.totalPaid.toFixed(2)}`);
    totalsLines.push(`Balance Amount: ${invoiceData.currency} ${(roundedTotal - invoiceData.totalPaid).toFixed(2)}`);
    
    const amountWords = invoiceData.isExport 
      ? `${invoiceData.currency} ${numberToWords(roundedTotal)} Only`
      : `INR ${numberToWords(roundedTotal)} Only`;
    totalsLines.push('');
    totalsLines.push(`Amount in Words: ${amountWords}`);
    
    // Create totals text with special formatting for bold labels
    // We'll handle bold labels in drawCell by checking line content
    const bankTotalsRows: TableRow[] = [
      {
        cells: [
          {
            text: bankDetailsLines.join('\n'),
            align: 'left',
            font: font
          },
          {
            text: totalsLines.join('\n'),
            align: 'right',
            font: font
          }
        ]
      }
    ];
    
    currentY = drawTable({
      page,
      startX: PAGE_MARGIN,
      startY: currentY,
      tableWidth,
      columns: [tableWidth * 0.5, tableWidth * 0.5],
      rows: bankTotalsRows,
      font,
      boldFont,
      fontSize: FONT_SIZE
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export function generateInvoiceNumber(type: 'B2B' | 'B2C' | 'EXPORT', sequenceNumber: number, invoiceDate?: Date): string {
  const date = invoiceDate || new Date();
  const currentYear = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  // Financial year runs from April to March
  // If month is April (4) or later, use current year - next year
  // If month is March (3) or earlier, use previous year - current year
  let financialYearStart: number;
  let financialYearEnd: number;
  
  if (month >= 4) {
    // April onwards - use current year to next year
    financialYearStart = currentYear;
    financialYearEnd = currentYear + 1;
  } else {
    // January to March - use previous year to current year
    financialYearStart = currentYear - 1;
    financialYearEnd = currentYear;
  }
  
  // Format: Full year for start, last 2 digits for end (e.g., 2025-26)
  const financialYear = `${financialYearStart}-${financialYearEnd.toString().slice(-2)}`;
  
  const prefix = type === 'EXPORT' ? 'EXP' : type;
  return `${prefix}/${financialYear}/${sequenceNumber}`;
}
