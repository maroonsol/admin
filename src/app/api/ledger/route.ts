import { NextRequest, NextResponse } from 'next/server';
import { calculateLedger } from '@/lib/ledger/ledger-calculation';
import { generateLedgerPDF } from '@/lib/ledger/ledger-pdf';
import { generateLedgerCSV } from '@/lib/ledger/ledger-csv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'screen';

    if (!businessId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Business ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Calculate ledger data
    const ledgerData = await calculateLedger(businessId, startDateObj, endDateObj);

    // Return based on format
    if (format === 'pdf') {
      const pdfBuffer = await generateLedgerPDF(ledgerData);
      // Convert Buffer to Uint8Array for NextResponse (Buffer extends Uint8Array)
      const uint8Array = new Uint8Array(pdfBuffer);
      return new NextResponse(uint8Array, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ledger-${ledgerData.businessName.replace(/\s+/g, '_')}-${startDate}-${endDate}.pdf"`,
        },
      });
    } else if (format === 'csv') {
      const csvContent = generateLedgerCSV(ledgerData);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ledger-${ledgerData.businessName.replace(/\s+/g, '_')}-${startDate}-${endDate}.csv"`,
        },
      });
    } else {
      // Return JSON for screen view
      return NextResponse.json(ledgerData);
    }
  } catch (error) {
    console.error('Error generating ledger:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate ledger' },
      { status: 500 }
    );
  }
}

