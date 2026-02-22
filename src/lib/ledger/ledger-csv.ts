import { LedgerData } from './ledger-calculation';

export function generateLedgerCSV(ledgerData: LedgerData): string {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: number): string => {
    return amount.toFixed(2);
  };

  const rows: string[] = [];

  // Header row
  rows.push('Sr No.,Date,Particulars,Vch Type,Vch No,Debit (₹),Credit (₹),Balance (₹)');

  // Opening Balance row
  rows.push(
    `Opening Balance,,,,,,"${formatCurrency(ledgerData.openingBalance)}","${formatCurrency(ledgerData.openingBalance)}"`
  );

  // Transaction entries
  ledgerData.entries.forEach(entry => {
    rows.push(
      `${entry.srNo},"${formatDate(entry.date)}","${entry.particulars.replace(/"/g, '""')}","${entry.vchType}","${entry.vchNo}",` +
      `"${entry.debit > 0 ? formatCurrency(entry.debit) : ''}","${entry.credit > 0 ? formatCurrency(entry.credit) : ''}","${formatCurrency(entry.balance)}"`
    );
  });

  // Closing Balance row
  rows.push(
    `Closing Balance,,,,,,"${formatCurrency(ledgerData.closingBalance)}","${formatCurrency(ledgerData.closingBalance)}"`
  );

  // Total row
  rows.push(
    `Total,,,,,"${formatCurrency(ledgerData.totalDebit)}","${formatCurrency(ledgerData.totalCredit)}","${formatCurrency(ledgerData.closingBalance)}"`
  );

  return rows.join('\n');
}

