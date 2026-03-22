import { adminPrisma } from './db';
import { generateInvoiceNumber } from './pdf-generator';

export interface CreateInvoiceData {
  invoiceType: 'B2B' | 'B2C' | 'EXPORT';
  invoiceDate: string;
  isExport: boolean;
  currency: string;
  exchangeRate: number;
  lutNumber?: string;
  
  // Business ID (for B2B invoices)
  businessId?: string;
  /** B2B: billing uses an additional GST registration */
  differentGst?: boolean;
  businessAdditionalGstId?: string | null;

  // Customer details (B2C, EXPORT, and B2B billing snapshot)
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerAddress2?: string;
  customerDistrict?: string;
  customerState?: string;
  customerStateCode?: string;
  customerPincode?: string;
  customerGst?: string;
  
  // Financial details
  subtotal: number;
  totalTax: number;
  discount: number;
  totalPaid: number;
  grandTotal: number;
  roundedAmount?: number;
  roundedDifference?: number;
  balanceAmount: number;
  
  items: Array<{
    hsnSac: string;
    description: string;
    qty: number;
    rate: number;
    taxableAmount: number;
    gstRate: number;
    igstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    totalAmount: number;
  }>;

  /** Optional: service IDs to link to this invoice (B2B, "invoice includes services period") */
  serviceIds?: string[];
}

export async function getNextInvoiceNumber(invoiceType: 'B2B' | 'B2C' | 'EXPORT', invoiceDate?: string): Promise<string> {
  const date = invoiceDate ? new Date(invoiceDate) : new Date();
  const dateYear = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Determine financial year for the invoice date
  let financialYearStart: number;
  if (month >= 4) {
    financialYearStart = dateYear;
  } else {
    financialYearStart = dateYear - 1;
  }
  
  // Format: Full year for start, last 2 digits for end (e.g., 2025-26)
  const financialYear = `${financialYearStart}-${(financialYearStart + 1).toString().slice(-2)}`;
  
  // Get the last invoice for this type and financial year
  const lastInvoice = await adminPrisma.invoice.findFirst({
    where: {
      invoiceType: invoiceType,
      invoiceNumber: {
        contains: financialYear
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  let sequenceNumber = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('/').pop() || '0');
    sequenceNumber = lastSequence + 1;
  }
  
  return generateInvoiceNumber(invoiceType, sequenceNumber, date);
}

export async function getNextCreditNumber(creditDate?: string): Promise<number> {
  const date = creditDate ? new Date(creditDate) : new Date();
  const dateYear = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Determine financial year for the credit date
  // Financial year runs from April to March
  let financialYearStart: number;
  let financialYearEnd: number;
  
  if (month >= 4) {
    // April onwards - use current year to next year
    financialYearStart = dateYear;
    financialYearEnd = dateYear + 1;
  } else {
    // January to March - use previous year to current year
    financialYearStart = dateYear - 1;
    financialYearEnd = dateYear;
  }
  
  // Calculate the start date of the financial year (April 1st)
  const financialYearStartDate = new Date(financialYearStart, 3, 1); // Month 3 = April (0-indexed)
  const financialYearEndDate = new Date(financialYearEnd, 2, 31, 23, 59, 59, 999); // Month 2 = March (0-indexed)
  
  // Get the last credit for this financial year
  const lastCredit = await adminPrisma.paymentCredit.findFirst({
    where: {
      creditDate: {
        gte: financialYearStartDate,
        lte: financialYearEndDate
      }
    },
    orderBy: {
      creditNumber: 'desc'
    }
  });
  
  let nextCreditNumber = 1;
  if (lastCredit && lastCredit.creditNumber !== null) {
    nextCreditNumber = lastCredit.creditNumber + 1;
  }
  
  return nextCreditNumber;
}

function normalizeGstNumber(g: string) {
  return g.replace(/\s+/g, '').toUpperCase();
}

/**
 * After business PUT, additional-GST row ids change. Resolve a valid FK from businessId + billing GST,
 * or clear when billing matches the primary registration.
 */
async function resolveB2bAdditionalGstForInvoice(data: {
  businessId?: string;
  businessAdditionalGstId?: string | null;
  customerGst?: string;
}): Promise<{ businessAdditionalGstId: string | null; differentGst: boolean }> {
  if (!data.businessId) {
    return { businessAdditionalGstId: null, differentGst: false };
  }

  const clientId = data.businessAdditionalGstId || null;
  if (clientId) {
    const valid = await adminPrisma.businessAdditionalGst.findFirst({
      where: { id: clientId, businessId: data.businessId },
    });
    if (valid) {
      return { businessAdditionalGstId: valid.id, differentGst: true };
    }
  }

  if (!data.customerGst?.trim()) {
    return { businessAdditionalGstId: null, differentGst: false };
  }

  const biz = await adminPrisma.businessInfo.findUnique({
    where: { id: data.businessId },
    select: { gstNumber: true },
  });
  if (!biz) {
    return { businessAdditionalGstId: null, differentGst: false };
  }

  const billing = normalizeGstNumber(data.customerGst);
  if (normalizeGstNumber(biz.gstNumber) === billing) {
    return { businessAdditionalGstId: null, differentGst: false };
  }

  const alt = await adminPrisma.businessAdditionalGst.findFirst({
    where: { businessId: data.businessId, gstNumber: billing },
  });
  if (alt) {
    return { businessAdditionalGstId: alt.id, differentGst: true };
  }

  return { businessAdditionalGstId: null, differentGst: false };
}

export async function createInvoice(data: CreateInvoiceData) {
  try {
    const gstLink =
      data.invoiceType === 'B2B' && data.businessId
        ? await resolveB2bAdditionalGstForInvoice(data)
        : { businessAdditionalGstId: null as string | null, differentGst: false };

    // Get the next invoice number based on invoice date
    const invoiceNumber = await getNextInvoiceNumber(data.invoiceType, data.invoiceDate);
    
    // Calculate rounded amounts
    const roundedAmount = data.roundedAmount ?? Math.round(data.grandTotal);
    const roundedDifference = data.roundedDifference ?? (roundedAmount - data.grandTotal);
    
    // Calculate balance amount as: roundedAmount - totalPaid
    const balanceAmount = roundedAmount - (data.totalPaid || 0);
    
    // Create the invoice with items
    const invoice = await adminPrisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: data.invoiceType,
        invoiceDate: new Date(data.invoiceDate),
        isExport: data.isExport,
        currency: data.currency,
        exchangeRate: data.exchangeRate,
        lutNumber: data.lutNumber,

        // Business ID (for B2B invoices)
        businessId: data.businessId,
        differentGst: gstLink.differentGst,
        businessAdditionalGstId: gstLink.businessAdditionalGstId,

        // Customer / billing snapshot
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAddress: data.customerAddress,
        customerAddress2: data.customerAddress2,
        customerDistrict: data.customerDistrict,
        customerState: data.customerState,
        customerStateCode: data.customerStateCode,
        customerPincode: data.customerPincode,
        customerGst: data.customerGst,

        // Financial details
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        totalPaid: data.totalPaid,
        grandTotal: data.grandTotal,
        roundedAmount: roundedAmount,
        roundedDifference: roundedDifference,
        balanceAmount: Math.max(0, balanceAmount), // Ensure non-negative

        // Items
        items: {
          create: data.items.map(item => ({
            hsnSac: item.hsnSac,
            description: item.description,
            qty: item.qty,
            rate: item.rate,
            taxableAmount: item.taxableAmount,
            gstRate: item.gstRate,
            igstAmount: item.igstAmount,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            totalAmount: item.totalAmount,
          }))
        }
      },
      include: {
        items: true,
        business: { include: { additionalGstLocations: true } },
        businessAdditionalGst: true,
      }
    });

    // Link selected services to this invoice (only for B2B with businessId)
    if (data.serviceIds && data.serviceIds.length > 0 && invoice.id && invoice.businessId) {
      await adminPrisma.service.updateMany({
        where: {
          id: { in: data.serviceIds },
          businessId: invoice.businessId
        },
        data: { invoiceId: invoice.id }
      });
    }

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }
}

export async function getAllInvoices() {
  try {
    const invoices = await adminPrisma.invoice.findMany({
      include: {
        items: true,
        business: { include: { additionalGstLocations: true } },
        businessAdditionalGst: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw new Error('Failed to fetch invoices');
  }
}

export async function getInvoiceById(id: string) {
  try {
    const invoice = await adminPrisma.invoice.findUnique({
      where: {
        id
      },
      include: {
        items: true,
        business: { include: { additionalGstLocations: true } },
        businessAdditionalGst: true,
        services: true
      }
    });

    return invoice;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw new Error('Failed to fetch invoice');
  }
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceData>) {
  try {
    // First, delete existing items if new items are provided
    if (data.items) {
      await adminPrisma.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });
    }

    // Prepare update data
    const updateData: {
      invoiceType?: string;
      invoiceDate?: Date;
      isExport?: boolean;
      currency?: string;
      exchangeRate?: number;
      lutNumber?: string;
      businessId?: string | null;
      differentGst?: boolean;
      businessAdditionalGstId?: string | null;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      customerAddress2?: string;
      customerDistrict?: string;
      customerState?: string;
      customerStateCode?: string;
      customerPincode?: string;
      customerGst?: string;
      subtotal?: number;
      totalTax?: number;
      discount?: number;
      totalPaid?: number;
      grandTotal?: number;
      roundedAmount?: number;
      roundedDifference?: number;
      balanceAmount?: number;
    } = {};
    
    if (data.invoiceType !== undefined) updateData.invoiceType = data.invoiceType;
    if (data.invoiceDate !== undefined) updateData.invoiceDate = new Date(data.invoiceDate);
    if (data.isExport !== undefined) updateData.isExport = data.isExport;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.exchangeRate !== undefined) updateData.exchangeRate = data.exchangeRate;
    if (data.lutNumber !== undefined) updateData.lutNumber = data.lutNumber;
    
    // Business ID (for B2B invoices)
    if (data.businessId !== undefined) updateData.businessId = data.businessId;
    if (data.differentGst !== undefined) updateData.differentGst = data.differentGst;
    if (data.businessAdditionalGstId !== undefined) {
      updateData.businessAdditionalGstId = data.businessAdditionalGstId;
    }

    // Customer / billing snapshot
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;
    if (data.customerEmail !== undefined) updateData.customerEmail = data.customerEmail;
    if (data.customerAddress !== undefined) updateData.customerAddress = data.customerAddress;
    if (data.customerAddress2 !== undefined) updateData.customerAddress2 = data.customerAddress2;
    if (data.customerDistrict !== undefined) updateData.customerDistrict = data.customerDistrict;
    if (data.customerState !== undefined) updateData.customerState = data.customerState;
    if (data.customerStateCode !== undefined) updateData.customerStateCode = data.customerStateCode;
    if (data.customerPincode !== undefined) updateData.customerPincode = data.customerPincode;
    if (data.customerGst !== undefined) updateData.customerGst = data.customerGst;
    
    // Financial details
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.totalTax !== undefined) updateData.totalTax = data.totalTax;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.totalPaid !== undefined) updateData.totalPaid = data.totalPaid;
    if (data.grandTotal !== undefined) updateData.grandTotal = data.grandTotal;
    
    // Calculate rounded amounts if grandTotal is being updated
    if (data.grandTotal !== undefined) {
      const roundedAmount = data.roundedAmount ?? Math.round(data.grandTotal);
      const roundedDifference = data.roundedDifference ?? (roundedAmount - data.grandTotal);
      updateData.roundedAmount = roundedAmount;
      updateData.roundedDifference = roundedDifference;
      
      // Calculate balance amount as: roundedAmount - totalPaid
      const currentTotalPaid = data.totalPaid !== undefined ? data.totalPaid : (await adminPrisma.invoice.findUnique({ where: { id } }))?.totalPaid || 0;
      updateData.balanceAmount = Math.max(0, roundedAmount - currentTotalPaid);
    } else if (data.totalPaid !== undefined || data.roundedAmount !== undefined) {
      // If only totalPaid or roundedAmount is being updated, recalculate balance
      const invoice = await adminPrisma.invoice.findUnique({ where: { id } });
      if (invoice) {
        const roundedAmount = data.roundedAmount ?? invoice.roundedAmount ?? Math.round(invoice.grandTotal);
        const totalPaid = data.totalPaid ?? invoice.totalPaid ?? 0;
        updateData.balanceAmount = Math.max(0, roundedAmount - totalPaid);
        
        if (data.roundedAmount !== undefined) {
          updateData.roundedAmount = roundedAmount;
          updateData.roundedDifference = roundedAmount - invoice.grandTotal;
        }
      }
    } else if (data.balanceAmount !== undefined) {
      updateData.balanceAmount = data.balanceAmount;
    }
    
    if (data.roundedAmount !== undefined) updateData.roundedAmount = data.roundedAmount;
    if (data.roundedDifference !== undefined) updateData.roundedDifference = data.roundedDifference;

    const invBefore = await adminPrisma.invoice.findUnique({
      where: { id },
      select: {
        invoiceType: true,
        businessId: true,
        customerGst: true,
        businessAdditionalGstId: true,
      },
    });

    const effectiveType =
      (updateData.invoiceType as string | undefined) ?? invBefore?.invoiceType;
    const mergedBusinessId =
      updateData.businessId !== undefined ? updateData.businessId : invBefore?.businessId;
    const mergedCustomerGst =
      updateData.customerGst !== undefined ? updateData.customerGst : invBefore?.customerGst;
    const mergedAdditionalId =
      updateData.businessAdditionalGstId !== undefined
        ? updateData.businessAdditionalGstId
        : invBefore?.businessAdditionalGstId;

    if (effectiveType === 'B2B' && mergedBusinessId) {
      const gstLink = await resolveB2bAdditionalGstForInvoice({
        businessId: mergedBusinessId,
        customerGst: mergedCustomerGst ?? undefined,
        businessAdditionalGstId: mergedAdditionalId,
      });
      updateData.differentGst = gstLink.differentGst;
      updateData.businessAdditionalGstId = gstLink.businessAdditionalGstId;
    }

    // Update invoice
    await adminPrisma.invoice.update({
      where: { id },
      data: updateData as Parameters<typeof adminPrisma.invoice.update>[0]['data'],
      include: { items: true, business: { include: { additionalGstLocations: true } }, businessAdditionalGst: true }
    });

    // Create new items if provided
    if (data.items && data.items.length > 0) {
      await adminPrisma.invoiceItem.createMany({
        data: data.items.map(item => ({
          invoiceId: id,
          hsnSac: item.hsnSac,
          description: item.description,
          qty: item.qty,
          rate: item.rate,
          taxableAmount: item.taxableAmount,
          gstRate: item.gstRate,
          igstAmount: item.igstAmount,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          totalAmount: item.totalAmount,
        }))
      });
    }

    // Update service links: unlink all services currently linked to this invoice, then link selected ones
    if (data.serviceIds !== undefined) {
      await adminPrisma.service.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null }
      });
      if (data.serviceIds.length > 0) {
        const invoice = await adminPrisma.invoice.findUnique({ where: { id }, select: { businessId: true } });
        if (invoice?.businessId) {
          await adminPrisma.service.updateMany({
            where: {
              id: { in: data.serviceIds },
              businessId: invoice.businessId
            },
            data: { invoiceId: id }
          });
        }
      }
    }

    // Fetch updated invoice with items and services
    const updatedInvoice = await adminPrisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: { include: { additionalGstLocations: true } }, businessAdditionalGst: true, services: true }
    });

    return updatedInvoice;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw new Error('Failed to update invoice');
  }
}

export async function deleteInvoice(id: string) {
  try {
    await adminPrisma.invoice.delete({
      where: {
        id
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw new Error('Failed to delete invoice');
  }
}
