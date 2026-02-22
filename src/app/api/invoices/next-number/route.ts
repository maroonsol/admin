import { NextRequest, NextResponse } from 'next/server';
import { getNextInvoiceNumber } from '@/lib/invoice-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceType = searchParams.get('type') as 'B2B' | 'B2C' | 'EXPORT';
    const invoiceDate = searchParams.get('date');

    if (!invoiceType || !['B2B', 'B2C', 'EXPORT'].includes(invoiceType)) {
      return NextResponse.json(
        { error: 'Valid invoice type is required' },
        { status: 400 }
      );
    }

    const nextInvoiceNumber = await getNextInvoiceNumber(invoiceType, invoiceDate || undefined);
    
    return NextResponse.json({ invoiceNumber: nextInvoiceNumber });
  } catch (error) {
    console.error('Error getting next invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to get next invoice number' },
      { status: 500 }
    );
  }
}

