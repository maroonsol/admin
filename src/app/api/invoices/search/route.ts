import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNumber = searchParams.get('invoiceNumber');

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }

    const invoice = await adminPrisma.invoice.findUnique({
      where: {
        invoiceNumber: invoiceNumber.trim()
      },
      include: {
        business: true,
        items: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Calculate rounded amount if not already set
    const roundedAmount = invoice.roundedAmount || Math.round(invoice.grandTotal);

    return NextResponse.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      grandTotal: invoice.grandTotal,
      roundedAmount: roundedAmount,
      businessId: invoice.businessId,
      business: invoice.business,
    });
  } catch (error) {
    console.error('Error searching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to search invoice' },
      { status: 500 }
    );
  }
}

