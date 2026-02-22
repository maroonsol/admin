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
      // If business relation is not loaded, fetch it explicitly
      if (!business) {
        business = await adminPrisma.businessInfo.findUnique({
          where: { id: invoice.businessId }
        });
      }
    }

    // Get customer/business details - use business info if available, otherwise use customer details
    const customerName = business?.businessName || invoice.customerName || '';
    const customerPhone = business?.businessPhone || invoice.customerPhone;
    const customerEmail = business?.businessEmail || invoice.customerEmail;
    const customerAddress = business?.businessAddress || invoice.customerAddress;
    const customerAddress2 = business?.businessAddress2 || invoice.customerAddress2;
    const customerDistrict = business?.businessDistrict || invoice.customerDistrict;
    const customerState = business?.businessState || invoice.customerState;
    const customerPincode = business?.businessPincode || invoice.customerPincode;
    const customerGst = business?.gstNumber || invoice.customerGst;
    
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
      }))
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

