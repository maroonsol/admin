import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';
import type { Invoice, InvoiceItem } from '../../../../../prisma/generated/admin';

type InvoiceForAnalysis = Invoice & {
  items: InvoiceItem[];
  business: { businessState: string | null } | null;
  businessAdditionalGst: { businessState: string | null } | null;
};

function normState(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/** When line-level IGST/CGST/SGST were never stored (legacy rows), derive from totals and place of supply. */
function splitGstForAnalysisLine(
  invoice: InvoiceForAnalysis,
  item: InvoiceItem
): { igst: number; cgst: number; sgst: number } {
  const igstDb = Number(item.igstAmount ?? 0);
  const cgstDb = Number(item.cgstAmount ?? 0);
  const sgstDb = Number(item.sgstAmount ?? 0);
  const stored = igstDb + cgstDb + sgstDb;
  if (stored > 0.005) {
    return { igst: igstDb, cgst: cgstDb, sgst: sgstDb };
  }

  const taxable = Number(item.taxableAmount ?? 0);
  const rate = Number(item.gstRate ?? 0);
  const total = Number(item.totalAmount ?? 0);
  let lineTax = total - taxable;
  if (lineTax < 0.01) {
    lineTax = (taxable * rate) / 100;
  }
  if (lineTax < 0.005) {
    return { igst: 0, cgst: 0, sgst: 0 };
  }

  const buyer = normState(invoice.customerState);
  const seller =
    normState(invoice.businessAdditionalGst?.businessState) ||
    normState(invoice.business?.businessState);

  // Intrastate: CGST + SGST (half each). Prefer seller vs buyer when both are known.
  const intrastate =
    seller && buyer
      ? seller === buyer
      : buyer === 'bihar'; // legacy create/edit UI assumed seller in Bihar

  if (intrastate) {
    const half = lineTax / 2;
    return { igst: 0, cgst: half, sgst: half };
  }
  return { igst: lineTax, cgst: 0, sgst: 0 };
}

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

    // Fetch all invoices for the month with their items (business needed to derive IGST vs CGST/SGST when line tax columns are empty)
    const invoices = (await adminPrisma.invoice.findMany({
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
        items: true,
        business: { select: { businessState: true } },
        businessAdditionalGst: { select: { businessState: true } },
      }
    })) as InvoiceForAnalysis[];

    // Group items by HSN/SAC code and invoice type.
    // IGST = interstate; CGST + SGST = intrastate (each is typically half of total GST).
    const b2bAnalysis: Record<string, {
      hsnSac: string;
      taxableAmount: number;
      gstRate: number;
      igstAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      gstAmount: number;
      totalQuantity: number;
    }> = {};

    const b2cAnalysis: Record<string, {
      hsnSac: string;
      taxableAmount: number;
      gstRate: number;
      igstAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      gstAmount: number;
      totalQuantity: number;
    }> = {};

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const key = item.hsnSac;
        const { igst, cgst, sgst } = splitGstForAnalysisLine(invoice, item);
        const gstAmount = igst + cgst + sgst;

        if (invoice.invoiceType === 'B2B') {
          if (!b2bAnalysis[key]) {
            b2bAnalysis[key] = {
              hsnSac: key,
              taxableAmount: 0,
              gstRate: item.gstRate,
              igstAmount: 0,
              cgstAmount: 0,
              sgstAmount: 0,
              gstAmount: 0,
              totalQuantity: 0,
            };
          }
          b2bAnalysis[key].taxableAmount += item.taxableAmount;
          b2bAnalysis[key].igstAmount += igst;
          b2bAnalysis[key].cgstAmount += cgst;
          b2bAnalysis[key].sgstAmount += sgst;
          b2bAnalysis[key].gstAmount += gstAmount;
          b2bAnalysis[key].totalQuantity += item.qty;
        } else if (invoice.invoiceType === 'B2C') {
          if (!b2cAnalysis[key]) {
            b2cAnalysis[key] = {
              hsnSac: key,
              taxableAmount: 0,
              gstRate: item.gstRate,
              igstAmount: 0,
              cgstAmount: 0,
              sgstAmount: 0,
              gstAmount: 0,
              totalQuantity: 0,
            };
          }
          b2cAnalysis[key].taxableAmount += item.taxableAmount;
          b2cAnalysis[key].igstAmount += igst;
          b2cAnalysis[key].cgstAmount += cgst;
          b2cAnalysis[key].sgstAmount += sgst;
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



