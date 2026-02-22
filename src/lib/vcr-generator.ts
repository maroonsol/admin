import { adminPrisma } from '@/lib/db';

/**
 * Get current financial year in format YYYY-YY
 * Example: 2025-26, 2026-27
 */
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

/**
 * Get financial year in format YYYY-YY for VCR number
 * Example: 202526, 202627
 */
export function getFinancialYearForVCR(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (month >= 4) {
    return `${year}${(year + 1).toString().slice(-2)}`;
  } else {
    return `${(year - 1)}${year.toString().slice(-2)}`;
  }
}

/**
 * Generate the next VCR number
 * Format: {financial_year}{sequence}
 * Example: 2025261, 2025262, etc.
 * Resets to 2026271 on April 1, 2026
 */
export async function getNextVCRNumber(): Promise<string> {
  const financialYear = getFinancialYearForVCR();
  
  // Find the highest VCR number for the current financial year
  const expenses = await adminPrisma.expense.findMany({
    where: {
      vcrNumber: {
        startsWith: financialYear,
      },
    },
    orderBy: {
      vcrNumber: 'desc',
    },
    take: 1,
  });
  
  let sequence = 1;
  
  if (expenses.length > 0 && expenses[0].vcrNumber) {
    // Extract sequence number from the last VCR number
    const lastVCR = expenses[0].vcrNumber;
    const lastSequence = parseInt(lastVCR.substring(financialYear.length));
    
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  return `${financialYear}${sequence}`;
}

