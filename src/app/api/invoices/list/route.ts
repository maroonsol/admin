import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const search = searchParams.get('search');

    const whereClause: {
      invoiceDate?: {
        gte: Date;
        lte: Date;
      };
      invoiceNumber?: {
        contains: string;
      };
      balanceAmount: {
        gt: number;
      };
    } = {
      balanceAmount: {
        gt: 0
      }
    };

    // Filter by month and year if provided
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        
        whereClause.invoiceDate = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

    // Add search filter if provided
    if (search) {
      whereClause.invoiceNumber = {
        contains: search
      };
    }

    const invoices = await adminPrisma.invoice.findMany({
      where: whereClause,
      include: {
        business: true
      },
      orderBy: {
        invoiceDate: 'desc'
      }
    });

    // Calculate rounded amounts and balance amounts
    const invoicesWithRounded = invoices.map(invoice => {
      const roundedAmount = invoice.roundedAmount || Math.round(invoice.grandTotal);
      // Use the actual balanceAmount from database, or calculate if not set
      // Balance amount should be: roundedAmount - totalPaid
      // But we use the stored balanceAmount if it exists (it gets updated when payments are made)
      const balanceAmount = invoice.balanceAmount !== null && invoice.balanceAmount !== undefined
        ? invoice.balanceAmount
        : Math.max(0, roundedAmount - (invoice.totalPaid || 0));
      
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        invoiceDate: invoice.invoiceDate,
        grandTotal: invoice.grandTotal,
        roundedAmount: roundedAmount,
        balanceAmount: Math.max(0, balanceAmount), // Ensure non-negative
        totalPaid: invoice.totalPaid || 0,
        paid: invoice.paid || false,
        partialPayment: invoice.partialPayment || false,
        businessId: invoice.businessId,
        business: invoice.business,
      };
    });

    return NextResponse.json(invoicesWithRounded);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

