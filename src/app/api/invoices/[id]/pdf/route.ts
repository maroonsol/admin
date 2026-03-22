import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/invoice-service';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { adminPrisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // For B2B invoices, fetch business data from BusinessInfo if businessId exists
    let business = invoice.business;

    if (invoice.invoiceType === 'B2B' && invoice.businessId) {
      if (!business) {
        business = await adminPrisma.businessInfo.findUnique({
          where: { id: invoice.businessId },
          include: { additionalGstLocations: true },
        });
      }
    }

    const inv = invoice as typeof invoice & {
      differentGst?: boolean;
      customerAddress?: string | null;
      customerGst?: string | null;
    };

    let customerName = '';
    let customerPhone: string | undefined;
    let customerEmail: string | undefined;
    let customerAddress: string | undefined;
    let customerAddress2: string | undefined;
    let customerDistrict: string | undefined;
    let customerState: string | undefined;
    let customerPincode: string | undefined;
    let customerGst: string | undefined;

    if (invoice.invoiceType === 'B2B' && business) {
      customerName = business.businessName || invoice.customerName || '';
      customerPhone = business.businessPhone || invoice.customerPhone || undefined;
      customerEmail = business.businessEmail || invoice.customerEmail || undefined;
      if (inv.differentGst) {
        customerAddress = inv.customerAddress || undefined;
        customerAddress2 = inv.customerAddress2 || undefined;
        customerDistrict = inv.customerDistrict || undefined;
        customerState = inv.customerState || undefined;
        customerPincode = inv.customerPincode || undefined;
        customerGst = inv.customerGst || undefined;
      } else {
        customerAddress = business.businessAddress || inv.customerAddress || undefined;
        customerAddress2 = business.businessAddress2 || inv.customerAddress2 || undefined;
        customerDistrict = business.businessDistrict || inv.customerDistrict || undefined;
        customerState = business.businessState || inv.customerState || undefined;
        customerPincode = business.businessPincode || inv.customerPincode || undefined;
        customerGst = business.gstNumber || inv.customerGst || undefined;
      }
    } else {
      customerName = invoice.customerName || '';
      customerPhone = invoice.customerPhone || undefined;
      customerEmail = invoice.customerEmail || undefined;
      customerAddress = invoice.customerAddress || undefined;
      customerAddress2 = invoice.customerAddress2 || undefined;
      customerDistrict = invoice.customerDistrict || undefined;
      customerState = invoice.customerState || undefined;
      customerPincode = invoice.customerPincode || undefined;
      customerGst = invoice.customerGst || undefined;
    }

    const servicesList = (invoice as { services?: unknown[] }).services ?? [];
    let servicesBillToGstNote: string | undefined;
    if (
      invoice.invoiceType === 'B2B' &&
      inv.differentGst &&
      servicesList.length > 0 &&
      (inv.customerGst || inv.customerAddress)
    ) {
      const addrParts: string[] = [];
      if (inv.customerAddress) addrParts.push(inv.customerAddress);
      if (inv.customerAddress2) addrParts.push(inv.customerAddress2);
      if (inv.customerDistrict) addrParts.push(inv.customerDistrict);
      if (inv.customerState && inv.customerPincode) {
        addrParts.push(`${inv.customerState} - ${inv.customerPincode}`);
      } else if (inv.customerState) {
        addrParts.push(inv.customerState);
      } else if (inv.customerPincode) {
        addrParts.push(inv.customerPincode);
      }
      const gstLine = inv.customerGst ? `GSTIN: ${inv.customerGst}` : '';
      const addrLine = addrParts.length ? `Address: ${addrParts.join(', ')}` : '';
      servicesBillToGstNote = [gstLine, addrLine].filter(Boolean).join('\n');
    }
    
    // Transform invoice data to match PDF generator interface
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType as 'B2B' | 'B2C' | 'EXPORT',
      invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
      isExport: invoice.invoiceType === 'EXPORT',
      currency: invoice.currency || 'INR',
      exchangeRate: invoice.exchangeRate || 1,
      lutNumber: invoice.lutNumber || undefined,
      
      // Customer/Business details
      customerName: customerName,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      customerAddress: customerAddress || undefined,
      customerAddress2: customerAddress2 || undefined,
      customerDistrict: customerDistrict || undefined,
      customerState: customerState || undefined,
      customerPincode: customerPincode || undefined,
      customerGst: customerGst || undefined,
      
      // Financial details
      subtotal: invoice.subtotal,
      totalTax: invoice.totalTax,
      discount: invoice.discount || 0,
      totalPaid: invoice.totalPaid || 0,
      grandTotal: invoice.grandTotal,
      balanceAmount: invoice.balanceAmount,
      
      items: invoice.items.map(item => ({
        hsnSac: item.hsnSac,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        igstAmount: item.igstAmount || 0,
        cgstAmount: item.cgstAmount || 0,
        sgstAmount: item.sgstAmount || 0,
        totalAmount: item.totalAmount,
      })),
      servicesBillToGstNote,
      services: ((invoice as { services?: Array<{
        serviceType: string;
        serviceCode?: string | null;
        domainName: string | null;
        serverIp: string | null;
        emailName: string | null;
        startDate: Date;
        endDate: Date;
        planCode: string | null;
        gstFilingYear?: number | null;
        gstFilingMonth?: number | null;
        gstQuarter?: number | null;
      }> }).services ?? []).map((s) => ({
        serviceType: s.serviceType,
        serviceCode: s.serviceCode,
        domainName: s.domainName,
        serverIp: s.serverIp,
        emailName: s.emailName,
        startDate: s.startDate instanceof Date ? s.startDate.toISOString().split('T')[0] : String(s.startDate),
        endDate: s.endDate instanceof Date ? s.endDate.toISOString().split('T')[0] : String(s.endDate),
        planCode: s.planCode,
        gstFilingYear: s.gstFilingYear,
        gstFilingMonth: s.gstFilingMonth,
        gstQuarter: s.gstQuarter,
      })),
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(pdfData);

    // Convert Buffer to Uint8Array for NextResponse (Buffer extends Uint8Array)
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF as response
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber.replace('/', '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

