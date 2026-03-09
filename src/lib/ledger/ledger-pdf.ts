import { PDFDocument, PageSizes, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import { LedgerData } from './ledger-calculation';
import {
  drawTable,
  type TableRow,
  PAGE_MARGIN,
  FONT_SIZE,
  LINE_HEIGHT,
} from '../pdf-generator';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function generateLedgerPDF(ledgerData: LedgerData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const tableWidth = width - PAGE_MARGIN * 2;
  let currentY = height - PAGE_MARGIN;

  // Header: Ledger Statement, company, business info, period
  const companyName = 'Maroonsol Private Limited';
  const companyAddress = 'Khairatali, Mittan Chak, Patna, Patna Sadar, Bihar, India, 804453';
  const companyGst = 'CIN : U69100BR2025PTC079059 | GSTIN : 10AATCM8978R1Z8';
  const periodText = `Ledger Period: ${formatDate(ledgerData.startDate)} to ${formatDate(ledgerData.endDate)}`;

  const headerLines: string[] = [
    'Ledger Statement',
    companyName,
    companyAddress,
    companyGst,
    ledgerData.businessName,
  ];
  if (ledgerData.businessAddress) headerLines.push(ledgerData.businessAddress);
  if (ledgerData.businessGstNumber)
    headerLines.push(`GST Number: ${ledgerData.businessGstNumber}`);
  headerLines.push(periodText);

  const headerRows: TableRow[] = [
    {
      cells: [
        {
          text: headerLines.join('\n'),
          align: 'center',
          font: boldFont,
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
    rows: headerRows,
    font,
    boldFont,
    fontSize: FONT_SIZE,
  });

  currentY -= LINE_HEIGHT;

  // Ledger table column widths (proportional to match original layout)
  const colPct = [0.05, 0.10, 0.25, 0.12, 0.12, 0.11, 0.11, 0.14]; // Sr, Date, Particulars, Vch Type, Vch No, Debit, Credit, Balance
  const columns = colPct.map((p) => Math.round(tableWidth * p));

  const headerRow: TableRow = {
    cells: [
      { text: 'Sr No.', align: 'center', font: boldFont, background: true, noWrap: true },
      { text: 'Date', align: 'left', font: boldFont, background: true, noWrap: true },
      { text: 'Particulars', align: 'left', font: boldFont, background: true },
      { text: 'Vch Type', align: 'left', font: boldFont, background: true, noWrap: true },
      { text: 'Vch No.', align: 'left', font: boldFont, background: true, noWrap: true },
      { text: 'Debit (₹)', align: 'right', font: boldFont, background: true, noWrap: true },
      { text: 'Credit (₹)', align: 'right', font: boldFont, background: true, noWrap: true },
      { text: 'Balance (₹)', align: 'right', font: boldFont, background: true, noWrap: true },
    ],
  };

  const openingRow: TableRow = {
    cells: [
      { text: '', noWrap: true },
      { text: '', noWrap: true },
      { text: 'Opening Balance', font: boldFont },
      { text: '', noWrap: true },
      { text: '', noWrap: true },
      { text: '', align: 'right', noWrap: true },
      { text: '', align: 'right', noWrap: true },
      { text: formatCurrency(ledgerData.openingBalance), align: 'right', noWrap: true },
    ],
  };

  const entryRows: TableRow[] = ledgerData.entries.map((entry) => ({
    cells: [
      { text: String(entry.srNo), align: 'center', noWrap: true },
      { text: formatDate(entry.date), noWrap: true },
      { text: entry.particulars },
      { text: entry.vchType, noWrap: true },
      { text: entry.vchNo, noWrap: true },
      {
        text: entry.debit > 0 ? formatCurrency(entry.debit) : '',
        align: 'right',
        noWrap: true,
      },
      {
        text: entry.credit > 0 ? formatCurrency(entry.credit) : '',
        align: 'right',
        noWrap: true,
      },
      { text: formatCurrency(entry.balance), align: 'right', noWrap: true },
    ],
  }));

  const closingRow: TableRow = {
    cells: [
      { text: '', noWrap: true },
      { text: '', noWrap: true },
      { text: 'Closing Balance', font: boldFont },
      { text: '', noWrap: true },
      { text: '', noWrap: true },
      { text: '', align: 'right', noWrap: true },
      { text: '', align: 'right', noWrap: true },
      { text: formatCurrency(ledgerData.closingBalance), align: 'right', noWrap: true },
    ],
  };

  const totalRow: TableRow = {
    cells: [
      { text: '', noWrap: true },
      { text: '', noWrap: true },
      { text: 'Total', font: boldFont },
      { text: '', noWrap: true },
      { text: '', noWrap: true },
      { text: formatCurrency(ledgerData.totalDebit), align: 'right', font: boldFont, noWrap: true },
      { text: formatCurrency(ledgerData.totalCredit), align: 'right', font: boldFont, noWrap: true },
      { text: formatCurrency(ledgerData.closingBalance), align: 'right', font: boldFont, noWrap: true },
    ],
  };

  const allTableRows: TableRow[] = [headerRow, openingRow, ...entryRows, closingRow, totalRow];

  const minY = PAGE_MARGIN + 60;
  const approxRowHeight = LINE_HEIGHT + 8; // line + vertical padding
  const maxRowsPerPage = Math.floor((currentY - minY) / approxRowHeight);

  let rowIndex = 0;
  let currentPage = page;

  while (rowIndex < allTableRows.length) {
    const chunkEnd = Math.min(rowIndex + maxRowsPerPage, allTableRows.length);
    const rowsChunk = allTableRows.slice(rowIndex, chunkEnd);

    currentY = drawTable({
      page: currentPage,
      startX: PAGE_MARGIN,
      startY: currentY,
      tableWidth,
      columns,
      rows: rowsChunk,
      font,
      boldFont,
      fontSize: FONT_SIZE,
    });

    rowIndex = chunkEnd;

    if (rowIndex < allTableRows.length) {
      const newPage = pdfDoc.addPage(PageSizes.A4);
      const newHeight = newPage.getSize().height;
      currentY = newHeight - PAGE_MARGIN;
      currentPage = newPage;
      // Repeat table header on new page
      currentY = drawTable({
        page: currentPage,
        startX: PAGE_MARGIN,
        startY: currentY,
        tableWidth,
        columns,
        rows: [headerRow],
        font,
        boldFont,
        fontSize: FONT_SIZE,
      });
      currentY -= LINE_HEIGHT;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
