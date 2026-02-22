import path from "path";
import fs from "fs";
import { indianStates } from './data';

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
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  try {
    // Precompute base64 images
    const logoBase64 = await getLogoBase64();
    await getSignatureBase64();

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
              padding: 0;
              font-size: 12px;
              color: #000;
              line-height: 1.4;
            }
            .invoice-container {
              padding: 25px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 10px;
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
            }
            .logo {
              width: 160px;
              height: auto;
            }
            .invoice-title-section {
              text-align: right;
            }
            .invoice-title {
              font-size: 22px;
              font-weight: bold;
              color: #000;
              margin: 0;
            }
            .original-recipient {
              font-size: 11px;
              color: #333;
              margin: 2px 0 0 0;
            }
            .company-details {
              font-size: 11px;
              line-height: 1.5;
              margin-top: 10px;
            }
            .company-details p {
              margin: 1px 0;
            }
            .main-content {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              margin-top: 8px;
            }
            .billing-details, .invoice-details {
              width: 48%;
              font-size: 11px;
              line-height: 0.6;
            }
            .billing-details h3, .invoice-details h3 {
              color: #000;
              margin: 0 0 4px 0;
              font-size: 13px;
              font-weight: bold;
            }
            .billing-details p{
              line-height: 1.2;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              font-size: 11px;
            }
            th {
              background-color: #f0f0f0;
              color: #000;
              padding: 5px 4px;
              text-align: center;
              border: 1px solid #000;
              font-weight: bold;
              font-size: 11px;
            }
            td {
              padding: 4px;
              border: 1px solid #000;
              text-align: center;
              font-size: 11px;
            }
            .description-cell {
              text-align: left;
              padding-left: 6px;
            }
            .bottom-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              margin-top: 10px;
            }
            .totals {
              width: 200px;
              font-size: 11px;
            }
            .totals p {
              margin: 1px 0;
              display: flex;
              justify-content: space-between;
            }
            .total-row {
              background-color: #f0f0f0;
              font-weight: bold;
              padding: 3px;
              margin-top: 3px;
              border: 1px solid #000;
            }
            .amount-words {
              font-size: 11px;
              margin-top: 6px;
              color: #000;
            }
            .bank-details {
              font-size: 11px;
              min-width: 180px;
            }
            .bank-details h3 {
              margin: 0 0 4px 0;
              font-size: 13px;
              font-weight: bold;
            }
            .bank-details p {
              margin: 1px 0;
            }
            .footer {
              margin-top: 12px;
              font-size: 12px;
              color: #333;
              line-height: 1.4;
            }
            .footer p {
              margin: 1px 0;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="data:image/png;base64,${logoBase64}" class="logo" alt="Logo">
              <div class="invoice-title-section">
                <div class="invoice-title">${invoiceData.isExport ? 'EXPORT INVOICE' : 'TAX INVOICE'}</div>
                <div class="original-recipient">(Original for Recipient)</div>
              </div>
            </div>
            
            <div class="company-details">
              <p><strong>Maroonsol Private Limited</strong></p>
              <p>Khairatali, Mittan Chak, Patna, Bihar, India, 804453</p>
              <p>info@maroonsol.com | (+91) 9305166411</p>
              <p>GSTIN: 10AATCM8978R1Z8 | PAN: AATCM8978R | CIN: U69100BR2025PTC079059</p>
              <p>Place of Supply: ${invoiceData.customerState || 'West Bengal'} (${stateCode})</p>
            </div>

            <div class="main-content">
              <div class="billing-details">
                <h3>Bill To:</h3>
                <p><strong>${invoiceData.customerName}</strong></p>
                ${invoiceData.customerAddress ? `<p>${invoiceData.customerAddress}</p>` : ''}
                ${invoiceData.customerAddress2 ? `<p>${invoiceData.customerAddress2}</p>` : ''}
                ${invoiceData.customerDistrict ? `<p>${invoiceData.customerDistrict}</p>` : ''}
                ${invoiceData.customerState && invoiceData.customerPincode ? `<p>${invoiceData.customerState} - ${invoiceData.customerPincode}</p>` : ''}
                ${invoiceData.customerGst ? `<p><strong>GST:</strong> ${invoiceData.customerGst}</p>` : ''}
                ${invoiceData.customerPhone ? `<p><strong>Phone:</strong> ${invoiceData.customerPhone}</p>` : ''}
                ${invoiceData.customerEmail ? `<p><strong>Email:</strong> ${invoiceData.customerEmail}</p>` : ''}
              </div>

              <div class="invoice-details">
                <h3>Invoice Details:</h3>
                <p><strong>Invoice No:</strong> ${invoiceData.invoiceNumber}</p>
                <p><strong>Invoice Date:</strong> ${formatDate(invoiceData.invoiceDate)}</p>
                <p><strong>Invoice Amount:</strong> ${invoiceData.currency} ${roundedTotal.toFixed(2)}</p>
                ${invoiceData.isExport ? `<p><strong>Exchange Rate:</strong> ${invoiceData.exchangeRate}</p>` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">S.No</th>
                  <th style="width: 35%;">Description</th>
                  <th style="width: 10%;">HSN/SAC</th>
                  <th style="width: 8%;">Rate</th>
                  <th style="width: 6%;">Qty</th>
                  <th style="width: 10%;">Taxable Amount</th>
                  ${isSameState ? `
                    <th style="width: 9%;">CGST (Rate & Amount)</th>
                    <th style="width: 9%;">SGST (Rate & Amount)</th>
                  ` : `
                    <th style="width: 9%;">IGST (Rate & Amount)</th>
                  `}
                  <th style="width: 10%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map((item, idx) => {
                  return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td class="description-cell">${item.description}</td>
                      <td>${item.hsnSac}</td>
                      <td>${invoiceData.currency} ${item.rate.toFixed(2)}</td>
                      <td>${item.qty}</td>
                      <td>${invoiceData.currency} ${item.taxableAmount.toFixed(2)}</td>
                      ${isSameState ? `
                        <td>${(item.gstRate/2).toFixed(1)}%<br/>${invoiceData.currency} ${item.cgstAmount.toFixed(2)}</td>
                        <td>${(item.gstRate/2).toFixed(1)}%<br/>${invoiceData.currency} ${item.sgstAmount.toFixed(2)}</td>
                      ` : `
                        <td>${item.gstRate}%<br/>${invoiceData.currency} ${item.igstAmount.toFixed(2)}</td>
                      `}
                      <td>${invoiceData.currency} ${item.totalAmount.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="bottom-row">
              <div class="bank-details">
                <h3>Bank Details:</h3>
                <p><strong>Bank Name:</strong> AXIS BANK</p>
                <p><strong>Account Number:</strong> 925020031020697</p>
                <p><strong>IFSC Code:</strong> UTIB0005552</p>
                <p><strong>Branch:</strong> KURTHAUR PARSA BRANCH</p>
                <p><strong>Account Holder:</strong> MAROONSOL PRIVATE LIMITED</p>
                ${invoiceData.isExport ? `<p><strong>SWIFT CODE:</strong> AXISINBB142</p>` : ''}
                
                <div class="footer">
                  <p>1. Please make all cheques/DD payable to MAROONSOL PRIVATE LIMITED</p>
                  <p>2. This is a computer generated Invoice and does not require any stamp or signature</p>
                </div>
              </div>
              <div class="totals">
                <p><span>Subtotal:</span> <span>${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}</span></p>
                <p><span>Total Tax:</span> <span>${invoiceData.currency} ${invoiceData.totalTax.toFixed(2)}</span></p>
                ${invoiceData.discount > 0 ? `<p><span>Discount:</span> <span>-${invoiceData.currency} ${invoiceData.discount.toFixed(2)}</span></p>` : ''}
                <div class="total-row">
                  <span>Grand Total:</span>
                  <span>${invoiceData.currency} ${invoiceData.grandTotal.toFixed(2)}</span>
                </div>
                ${roundingDiff !== 0 ? `<p><span>Rounding Off:</span> <span>${roundingDiff > 0 ? '+' : ''}${invoiceData.currency} ${roundingDiff.toFixed(2)}</span></p>` : ''}
                <div class="total-row">
                  <span>Total (Rounded):</span>
                  <span>${invoiceData.currency} ${roundedTotal.toFixed(2)}</span>
                </div>
                <p><span>Total Paid:</span> <span>${invoiceData.currency} ${invoiceData.totalPaid.toFixed(2)}</span></p>
                <p><span>Balance Amount:</span> <span>${invoiceData.currency} ${(roundedTotal - invoiceData.totalPaid).toFixed(2)}</span></p>
                <div class="amount-words">
                  <strong>Amount in Words:</strong> ${invoiceData.isExport 
                    ? `${invoiceData.currency} ${numberToWords(roundedTotal)}`
                    : `INR ${numberToWords(roundedTotal)}`} Only
                </div>
              </div>
            </div>

          </div>
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
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Helper function to get logo base64
async function getLogoBase64(): Promise<string> {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo", "logo.png");
    if (fs.existsSync(logoPath)) {
      const imageData = fs.readFileSync(logoPath);
      return imageData.toString('base64');
    }
    return '';
  } catch (error) {
    console.error('Error reading logo:', error);
    return '';
  }
}

// Helper function to get signature base64
async function getSignatureBase64(): Promise<string> {
  try {
    const signaturePath = path.join(process.cwd(), "public", "img", "sign.png");
    if (fs.existsSync(signaturePath)) {
      const imageData = fs.readFileSync(signaturePath);
      return imageData.toString('base64');
    }
    return '';
  } catch (error) {
    console.error('Error reading signature:', error);
    return '';
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