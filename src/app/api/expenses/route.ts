import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';
import { getNextVCRNumber } from '@/lib/vcr-generator';

export async function GET() {
  try {
    const expenses = await adminPrisma.expense.findMany({
      include: {
        invoices: {
          include: {
            vendor: true,
            taxBreakdowns: true,
          },
        },
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        paidTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.expenseType || !data.paymentMethod || !data.paidOn) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate invoices array
    if (!data.invoices || !Array.isArray(data.invoices) || data.invoices.length === 0) {
      return NextResponse.json(
        { error: 'At least one invoice is required' },
        { status: 400 }
      );
    }
    
    // Calculate total amount from all invoices
    interface InvoiceInput {
      totalInvoiceAmount?: string | number;
    }
    const totalAmount = data.invoices.reduce((sum: number, inv: InvoiceInput) => 
      sum + parseFloat(String(inv.totalInvoiceAmount || 0)), 0
    );
    
    // Validate payment method restrictions
    if (data.paymentMethod === 'CASH' && totalAmount >= 2000) {
      return NextResponse.json(
        { error: 'Cash payment is only allowed for amounts less than ₹2000' },
        { status: 400 }
      );
    }
    
    if (data.paymentMethod === 'CHEQUE' && !data.chequeNumber) {
      return NextResponse.json(
        { error: 'Cheque number is required for cheque payments' },
        { status: 400 }
      );
    }
    
    // Validate payment date
    const paidOnDate = new Date(data.paidOn);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    if (paidOnDate > today) {
      return NextResponse.json(
        { error: 'Payment date cannot be in the future' },
        { status: 400 }
      );
    }
    
    if (paidOnDate < oneYearAgo) {
      return NextResponse.json(
        { error: 'Payment date cannot be more than 1 year in the past' },
        { status: 400 }
      );
    }
    
    // Generate VCR number
    const vcrNumber = await getNextVCRNumber();
    
    // Create expense with multiple invoices
    const expense = await adminPrisma.expense.create({
      data: {
        expenseType: data.expenseType,
        vcrNumber: vcrNumber,
        paymentMethod: data.paymentMethod,
        chequeNumber: data.chequeNumber || null,
        paidOn: paidOnDate,
        paidById: data.paidById || null,
        paidToId: data.paidToId || null,
        invoices: {
          create: data.invoices.map((inv: InvoiceInput & {
            invoiceNumber?: string;
            invoiceDate?: string;
            expenseCategory?: string;
            isGstPaymentReceipt?: boolean;
            withGst?: boolean;
            businessId?: string;
            vendorId?: string;
            invoiceFileUrl?: string;
            taxBreakdowns?: Array<{
              taxableAmount: string | number;
              taxPercentage: string | number;
              taxAmount: string | number;
            }>;
          }) => ({
            invoiceNumber: inv.invoiceNumber || null,
            invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : null,
            expenseCategory: inv.expenseCategory || null,
            isGstPaymentReceipt: inv.isGstPaymentReceipt || false,
            withGst: inv.withGst || false,
            businessId: inv.businessId || null,
            vendorId: inv.vendorId || null,
            totalInvoiceAmount: parseFloat(String(inv.totalInvoiceAmount)),
            invoiceFileUrl: inv.invoiceFileUrl || null,
            taxBreakdowns: {
              create: (inv.taxBreakdowns || []).map((tb) => ({
                taxableAmount: parseFloat(String(tb.taxableAmount)),
                taxPercentage: parseFloat(String(tb.taxPercentage)),
                taxAmount: parseFloat(String(tb.taxAmount)),
              })),
            },
          })),
        },
      },
      include: {
        invoices: {
          include: {
            vendor: true,
            business: true,
            taxBreakdowns: true,
          },
        },
        paidBy: true,
        paidTo: true,
      },
    });
    
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

