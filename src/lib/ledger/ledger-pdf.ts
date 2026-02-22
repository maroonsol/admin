import { LedgerData } from './ledger-calculation';

export async function generateLedgerPDF(ledgerData: LedgerData): Promise<Buffer> {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @page {
            margin: 0;
            size: A4;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            color: #000;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .address {
            font-size: 10px;
            margin-bottom: 5px;
          }
          .cin-gstin {
            font-size: 10px;
            margin-bottom: 15px;
          }
          .business-info {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .business-address {
            font-size: 10px;
            margin-bottom: 3px;
            color: #333;
          }
          .business-gst {
            font-size: 10px;
            margin-bottom: 5px;
            color: #333;
          }
          .period {
            font-size: 11px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10px;
          }
          th {
            background-color: #f0f0f0;
            padding: 4px 4px;
            text-align: left;
            font-weight: bold;
            border: none;
          }
          td {
            padding: 2px 4px;
            border: none;
            text-align: left;
          }
          .number-cell {
            text-align: right;
          }
          .sr-no {
            text-align: center;
            width: 5%;
          }
          .date-cell {
            width: 10%;
          }
          .particulars-cell {
            width: 25%;
          }
          .vch-type-cell {
            width: 12%;
          }
          .vch-no-cell {
            width: 12%;
          }
          .debit-cell {
            text-align: right;
            width: 11%;
          }
          .credit-cell {
            text-align: right;
            width: 11%;
          }
          .balance-cell {
            text-align: right;
            width: 14%;
          }
          .opening-balance-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          .closing-balance-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          .total-row {
            font-weight: bold;
            background-color: #e8e8e8;
            border-top: 1px solid #000;
          }
          .summary {
            margin-top: 20px;
            font-size: 11px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Ledger Statement</div>
          <div class="company-name">Maroonsol Private Limited</div>
          <div class="address">Khairatali, Mittan Chak, Patna, Patna Sadar, Bihar, India, 804453</div>
          <div class="cin-gstin">CIN : U69100BR2025PTC079059 | GSTIN : 10AATCM8978R1Z8</div>
          <div class="business-info">${escapeHtml(ledgerData.businessName)}</div>
          ${ledgerData.businessAddress ? `<div class="business-address">${escapeHtml(ledgerData.businessAddress)}</div>` : ''}
          ${ledgerData.businessGstNumber ? `<div class="business-gst">GST Number: ${escapeHtml(ledgerData.businessGstNumber)}</div>` : ''}
          <div class="period">Ledger Period: ${formatDate(ledgerData.startDate)} to ${formatDate(ledgerData.endDate)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="sr-no">Sr No.</th>
              <th class="date-cell">Date</th>
              <th class="particulars-cell">Particulars</th>
              <th class="vch-type-cell">Vch Type</th>
              <th class="vch-no-cell">Vch No.</th>
              <th class="debit-cell">Debit (₹)</th>
              <th class="credit-cell">Credit (₹)</th>
              <th class="balance-cell">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-balance-row">
              <td class="sr-no"></td>
              <td class="date-cell"></td>
              <td class="particulars-cell">Opening Balance</td>
              <td class="vch-type-cell"></td>
              <td class="vch-no-cell"></td>
              <td class="debit-cell"></td>
              <td class="credit-cell"></td>
              <td class="balance-cell number-cell">${formatCurrency(ledgerData.openingBalance)}</td>
            </tr>
            ${ledgerData.entries.map(entry => `
              <tr>
                <td class="sr-no">${entry.srNo}</td>
                <td class="date-cell">${formatDate(entry.date)}</td>
                <td class="particulars-cell">${escapeHtml(entry.particulars)}</td>
                <td class="vch-type-cell">${escapeHtml(entry.vchType)}</td>
                <td class="vch-no-cell">${escapeHtml(entry.vchNo)}</td>
                <td class="debit-cell number-cell">${entry.debit > 0 ? formatCurrency(entry.debit) : ''}</td>
                <td class="credit-cell number-cell">${entry.credit > 0 ? formatCurrency(entry.credit) : ''}</td>
                <td class="balance-cell number-cell">${formatCurrency(entry.balance)}</td>
              </tr>
            `).join('')}
            <tr class="closing-balance-row">
              <td class="sr-no"></td>
              <td class="date-cell"></td>
              <td class="particulars-cell">Closing Balance</td>
              <td class="vch-type-cell"></td>
              <td class="vch-no-cell"></td>
              <td class="debit-cell"></td>
              <td class="credit-cell"></td>
              <td class="balance-cell number-cell">${formatCurrency(ledgerData.closingBalance)}</td>
            </tr>
            <tr class="total-row">
              <td class="sr-no"></td>
              <td class="date-cell"></td>
              <td class="particulars-cell">Total</td>
              <td class="vch-type-cell"></td>
              <td class="vch-no-cell"></td>
              <td class="debit-cell number-cell">${formatCurrency(ledgerData.totalDebit)}</td>
              <td class="credit-cell number-cell">${formatCurrency(ledgerData.totalCredit)}</td>
              <td class="balance-cell number-cell">${formatCurrency(ledgerData.closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;

  const puppeteer = await import('puppeteer-core');
  const chromiumModule = await import('@sparticuz/chromium');
  const Chromium = chromiumModule.default;
  
  // For Vercel/serverless environments, use @sparticuz/chromium
  // For local development, try to use system Chrome if available
  const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  let browser;
  if (isVercel) {
    // Vercel/serverless: must use @sparticuz/chromium
    const executablePath: string = await Chromium.executablePath();
    browser = await puppeteer.launch({
      args: [
        ...Chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      executablePath,
      headless: true,
    });
  } else {
    // Local development: try Chromium first, then fallback to system Chrome
    try {
      const executablePath: string = await Chromium.executablePath();
      browser = await puppeteer.launch({
        args: [
          ...Chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        executablePath,
        headless: true,
      });
    } catch (error) {
      // Fallback for local development only
      try {
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ],
          channel: 'chrome',
          headless: true,
        });
      } catch (fallbackError) {
        throw new Error(`Failed to launch browser. Chromium error: ${error instanceof Error ? error.message : String(error)}. Chrome fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  }

  // Create a new page
  const page = await browser.newPage();

  // Set the content of the page
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0'
  });

  // Generate PDF
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '30px',
      left: '20px'
    }
  });

  // Close the browser
  await browser.close();

  return Buffer.from(pdf);
}

