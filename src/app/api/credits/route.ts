import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';
import { getNextCreditNumber } from '@/lib/invoice-service';

interface InvoiceCreditInput {
  invoiceId: string;
  creditAmount: number;
  businessId?: string | null;
}

export async function GET() {
  try {
    const credits = await adminPrisma.paymentCredit.findMany({
      include: {
        bankAccount: true,
        business: true,
        invoiceCredits: {
          include: {
            invoice: true,
            business: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(credits);
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { creditAmount, creditDate, bankAccountId, invoiceCredits } = data;

    if (!creditAmount || !creditDate || !bankAccountId || !invoiceCredits || invoiceCredits.length === 0) {
      return NextResponse.json(
        { error: 'Credit amount, date, bank account, and at least one invoice are required' },
        { status: 400 }
      );
    }

    // Get business ID from first invoice if all invoices are from same business
    let businessId: string | null = null;
    const firstInvoiceCredit = invoiceCredits[0] as InvoiceCreditInput;
    if (firstInvoiceCredit.businessId) {
      // Check if all invoices have same business ID
      const allSameBusiness = invoiceCredits.every((ic: InvoiceCreditInput) => ic.businessId === firstInvoiceCredit.businessId);
      if (allSameBusiness) {
        businessId = firstInvoiceCredit.businessId;
      }
    }

    const creditDateObj = new Date(creditDate);

    // Get the next credit number based on credit date
    const creditNumber = await getNextCreditNumber(creditDate);

    // Create payment credit
    const paymentCredit = await adminPrisma.paymentCredit.create({
      data: {
        creditNumber,
        creditAmount,
        creditDate: creditDateObj,
        bankAccountId,
        businessId,
        invoiceCredits: {
          create: invoiceCredits.map((ic: InvoiceCreditInput) => ({
            invoiceId: ic.invoiceId,
            creditAmount: ic.creditAmount,
            businessId: ic.businessId || null,
          }))
        }
      },
      include: {
        bankAccount: true,
        business: true,
        invoiceCredits: {
          include: {
            invoice: true
          }
        }
      }
    });

    // Update each invoice with payment details
    for (const ic of invoiceCredits) {
      const invoice = await adminPrisma.invoice.findUnique({
        where: { id: ic.invoiceId }
      });

      if (!invoice) continue;

      const roundedAmount = invoice.roundedAmount || Math.round(invoice.grandTotal);
      const currentTotalPaid = invoice.totalPaid || 0;
      // Use the actual balanceAmount from database (it's the source of truth)
      const currentBalanceAmount = invoice.balanceAmount !== null && invoice.balanceAmount !== undefined
        ? invoice.balanceAmount
        : Math.max(0, roundedAmount - currentTotalPaid);
      
      // Calculate new amounts: balance = balance - credit amount
      const newBalanceAmount = Math.max(0, currentBalanceAmount - ic.creditAmount);
      const newTotalPaid = currentTotalPaid + ic.creditAmount;
      
      // Check if this is a full payment by comparing credit amount with rounded amount
      const isFullPayment = ic.creditAmount === roundedAmount;
      
      // Check if invoice is fully paid (balance becomes 0)
      const isFullyPaid = newBalanceAmount === 0;
      
      // Check if this is still a partial payment (if there's still balance remaining)
      const hasRemainingBalance = newBalanceAmount > 0;

      // Create partial payment record ONLY if this is NOT a full payment
      if (!isFullPayment) {
        await adminPrisma.partialPayment.create({
          data: {
            invoiceId: ic.invoiceId,
            paymentAmount: ic.creditAmount,
            paymentDate: creditDateObj,
            bankAccountId: bankAccountId,
            businessId: ic.businessId || null,
            paymentCreditId: paymentCredit.id,
          }
        });
      }

      // Update invoice
      await adminPrisma.invoice.update({
        where: { id: ic.invoiceId },
        data: {
          totalPaid: newTotalPaid, // Add credit amount to total paid
          balanceAmount: newBalanceAmount, // Update balance: balance - credit amount
          partialPayment: hasRemainingBalance, // True if there's still balance remaining
          paid: isFullyPaid, // Only true when balance becomes 0
          paidOn: isFullyPaid ? creditDateObj : invoice.paidOn, // Set paidOn date when fully paid
        }
      });
    }

    return NextResponse.json(paymentCredit, { status: 201 });
  } catch (error) {
    console.error('Error creating credit:', error);
    return NextResponse.json(
      { error: 'Failed to create credit' },
      { status: 500 }
    );
  }
}

