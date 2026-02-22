import { adminPrisma } from '@/lib/db';

export interface LedgerEntry {
  srNo: number;
  date: Date;
  particulars: string;
  vchType: string;
  vchNo: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerData {
  businessName: string;
  businessAddress?: string;
  businessGstNumber?: string;
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}

export async function calculateLedger(
  businessId: string,
  startDate: Date,
  endDate: Date
): Promise<LedgerData> {
  // Set time to start/end of day for proper date filtering
  const startDateTime = new Date(startDate);
  startDateTime.setHours(0, 0, 0, 0);
  
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  // Fetch business info
  const business = await adminPrisma.businessInfo.findUnique({
    where: { id: businessId }
  });

  if (!business) {
    throw new Error('Business not found');
  }

  // Calculate opening balance
  // Sum of all invoices BEFORE startDate
  const openingInvoices = await adminPrisma.invoice.findMany({
    where: {
      businessId: businessId,
      invoiceDate: {
        lt: startDateTime
      }
    },
    select: {
      grandTotal: true,
      roundedAmount: true
    }
  });

  const openingInvoiceTotal = openingInvoices.reduce(
    (sum, inv) => sum + (inv.roundedAmount ?? inv.grandTotal),
    0
  );

  // Sum of all payment credits BEFORE startDate
  const openingPaymentCredits = await adminPrisma.paymentCredit.findMany({
    where: {
      businessId: businessId,
      creditDate: {
        lt: startDateTime
      }
    },
    select: {
      creditAmount: true
    }
  });

  const openingPaymentCreditTotal = openingPaymentCredits.reduce(
    (sum, pc) => sum + pc.creditAmount,
    0
  );

  // Opening Balance = Invoices - PaymentCredits (only using paymentCredit table)
  const openingBalance = openingInvoiceTotal - openingPaymentCreditTotal;

  // Fetch transactions within date range
  // Fetch invoices
  const invoices = await adminPrisma.invoice.findMany({
    where: {
      businessId: businessId,
      invoiceDate: {
        gte: startDateTime,
        lte: endDateTime
      }
    },
    include: {
      business: true
    },
    orderBy: {
      invoiceDate: 'asc'
    }
  });

  // Fetch payment credits
  const paymentCredits = await adminPrisma.paymentCredit.findMany({
    where: {
      businessId: businessId,
      creditDate: {
        gte: startDateTime,
        lte: endDateTime
      }
    },
    include: {
      bankAccount: true
    },
    orderBy: {
      creditDate: 'asc'
    }
  });

  // Note: Only using paymentCredit table for payment data, not partialPayments

  // Create unified transaction entries
  interface Transaction {
    date: Date;
    type: 'debit' | 'credit';
    amount: number;
    particulars: string;
    vchType: string;
    vchNo: string;
  }

  const transactions: Transaction[] = [];

  // Add invoice entries (debits)
  invoices.forEach(invoice => {
    // Use roundedAmount if available, otherwise fall back to grandTotal
    const amount = invoice.roundedAmount ?? invoice.grandTotal;
    transactions.push({
      date: invoice.invoiceDate,
      type: 'debit',
      amount: amount,
      particulars: '(sale @gst)',
      vchType: 'sale',
      vchNo: invoice.invoiceNumber
    });
  });

  // Add payment credit entries (credits) - only from paymentCredit table
  paymentCredits.forEach(credit => {
    // Get last 5 digits of account number
    const accountNumber = credit.bankAccount.accountNumber;
    const last5Digits = accountNumber.slice(-5);
    
    transactions.push({
      date: credit.creditDate,
      type: 'credit',
      amount: credit.creditAmount,
      particulars: `payment @${credit.bankAccount.bankName} @${last5Digits}`,
      vchType: 'Payment Received',
      vchNo: credit.creditNumber?.toString() ?? '' // Use payment credit ID
    });
  });

  // Sort all transactions by date (ascending)
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate running balance and create ledger entries
  let runningBalance = openingBalance;
  const entries: LedgerEntry[] = [];
  let srNo = 1;

  transactions.forEach(transaction => {
    if (transaction.type === 'debit') {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }

    entries.push({
      srNo: srNo++,
      date: transaction.date,
      particulars: transaction.particulars,
      vchType: transaction.vchType,
      vchNo: transaction.vchNo,
      debit: transaction.type === 'debit' ? transaction.amount : 0,
      credit: transaction.type === 'credit' ? transaction.amount : 0,
      balance: runningBalance
    });
  });

  // Calculate totals
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const closingBalance = runningBalance;

  // Format business address
  const addressParts = [
    business.businessAddress,
    business.businessAddress2,
    business.businessDistrict,
    business.businessState,
    business.businessPincode
  ].filter(Boolean);
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;

  return {
    businessName: business.businessName,
    businessAddress: businessAddress,
    businessGstNumber: business.gstNumber,
    startDate: startDateTime,
    endDate: endDateTime,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    entries
  };
}

