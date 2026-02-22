import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Parse month and year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: 'Invalid month or year' },
        { status: 400 }
      );
    }

    // Calculate start and end dates for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // Fetch all invoices for the month with their items
    const invoices = await adminPrisma.invoice.findMany({
      where: {
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        invoiceType: {
          in: ['B2B', 'B2C']
        }
      },
      include: {
        items: true
      }
    });

    // Group items by HSN/SAC code and invoice type
    const b2bAnalysis: Record<string, {
      hsnSac: string;
      taxableAmount: number;
      gstRate: number;
      gstAmount: number;
      totalQuantity: number;
    }> = {};

    const b2cAnalysis: Record<string, {
      hsnSac: string;
      taxableAmount: number;
      gstRate: number;
      gstAmount: number;
      totalQuantity: number;
    }> = {};

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const key = item.hsnSac;
        const gstAmount = (item.igstAmount || 0) + (item.cgstAmount || 0) + (item.sgstAmount || 0);
        
        if (invoice.invoiceType === 'B2B') {
          if (!b2bAnalysis[key]) {
            b2bAnalysis[key] = {
              hsnSac: key,
              taxableAmount: 0,
              gstRate: item.gstRate,
              gstAmount: 0,
              totalQuantity: 0,
            };
          }
          b2bAnalysis[key].taxableAmount += item.taxableAmount;
          b2bAnalysis[key].gstAmount += gstAmount;
          b2bAnalysis[key].totalQuantity += item.qty;
        } else if (invoice.invoiceType === 'B2C') {
          if (!b2cAnalysis[key]) {
            b2cAnalysis[key] = {
              hsnSac: key,
              taxableAmount: 0,
              gstRate: item.gstRate,
              gstAmount: 0,
              totalQuantity: 0,
            };
          }
          b2cAnalysis[key].taxableAmount += item.taxableAmount;
          b2cAnalysis[key].gstAmount += gstAmount;
          b2cAnalysis[key].totalQuantity += item.qty;
        }
      });
    });

    // Convert to arrays and sort by HSN/SAC code
    const b2bData = Object.values(b2bAnalysis).sort((a, b) => a.hsnSac.localeCompare(b.hsnSac));
    const b2cData = Object.values(b2cAnalysis).sort((a, b) => a.hsnSac.localeCompare(b.hsnSac));

    return NextResponse.json({
      month: monthNum,
      year: yearNum,
      b2b: b2bData,
      b2c: b2cData,
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}



