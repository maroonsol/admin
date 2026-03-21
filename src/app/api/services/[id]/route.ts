import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '../../../../../prisma/generated/admin';
import { adminPrisma } from '@/lib/db';
import {
  SERVICE_CODES_BY_TYPE,
  isGstServiceCode,
  monthToDateRange,
  fyQuarterToDateRange,
} from '@/lib/service-codes';

const SERVICE_TYPES = [
  'DOMAIN',
  'VPS',
  'WEB_HOSTING',
  'DOMAIN_EMAIL',
  'GST_SERVICES',
] as const;

function parseDateInput(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function resolveServiceCode(serviceType: string, requested?: string): string {
  if (requested && requested.trim()) return requested.trim();
  return SERVICE_CODES_BY_TYPE[serviceType] ?? '';
}

// GET - Get a single service by id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const service = await adminPrisma.service.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            gstNumber: true,
            businessName: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PUT - Update a service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const {
      businessId,
      serviceType: rawType,
      serviceCode: rawServiceCode,
      domainName,
      serverIp,
      emailName,
      startDate: rawStart,
      endDate: rawEnd,
      planCode,
      invoiceId,
      gstFilingYear,
      gstFilingMonth,
      gstQuarter,
      gstr1FilingDate,
      gstr3bFilingDate,
      totalGstPaid,
      filledSummaryFileUrl,
      challanFileUrl,
      gstNotes,
    } = data;

    const existing = await adminPrisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    const serviceType = rawType ?? existing.serviceType;
    if (!SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        { error: 'Valid service type is required' },
        { status: 400 }
      );
    }

    const serviceCode = resolveServiceCode(serviceType, rawServiceCode ?? existing.serviceCode);

    if (serviceType !== 'GST_SERVICES' && !serviceCode) {
      return NextResponse.json(
        { error: 'serviceCode is required' },
        { status: 400 }
      );
    }

    if (serviceType === 'GST_SERVICES') {
      if (!isGstServiceCode(serviceCode)) {
        return NextResponse.json(
          { error: 'Select a valid GST service code' },
          { status: 400 }
        );
      }
    } else if (isGstServiceCode(serviceCode)) {
      return NextResponse.json(
        { error: 'GST service codes are only valid for GST services type' },
        { status: 400 }
      );
    }

    if (businessId !== undefined && !businessId) {
      return NextResponse.json(
        { error: 'Business is required' },
        { status: 400 }
      );
    }

    let start: Date | undefined;
    let end: Date | undefined;

    if (serviceType === 'GST_SERVICES') {
      const g1 = parseDateInput(gstr1FilingDate ?? existing.gstr1FilingDate);
      const g3 = parseDateInput(gstr3bFilingDate ?? existing.gstr3bFilingDate);
      const filingNeedsGstr =
        serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR';
      if (filingNeedsGstr && (!g1 || !g3)) {
        return NextResponse.json(
          { error: 'GSTR-1 and GSTR-3B filing dates are required for GST filing services' },
          { status: 400 }
        );
      }

      if (serviceCode === 'GST_FILING_MON') {
        const y = Number(gstFilingYear ?? existing.gstFilingYear);
        const m = Number(gstFilingMonth ?? existing.gstFilingMonth);
        if (!y || !m || m < 1 || m > 12) {
          return NextResponse.json(
            { error: 'Calendar year and month (1–12) are required for monthly GST filing' },
            { status: 400 }
          );
        }
        const range = monthToDateRange(y, m);
        start = range.start;
        end = range.end;
      } else if (serviceCode === 'GST_FILING_QTR') {
        const fyStart = Number(gstFilingYear ?? existing.gstFilingYear);
        const q = Number(gstQuarter ?? existing.gstQuarter);
        if (!fyStart || !q || q < 1 || q > 4) {
          return NextResponse.json(
            { error: 'Financial year start (April year) and quarter (1–4) are required for quarterly GST filing' },
            { status: 400 }
          );
        }
        const range = fyQuarterToDateRange(fyStart, q);
        start = range.start;
        end = range.end;
      } else {
        start =
          parseDateInput(rawStart) ??
          (existing.startDate ? new Date(existing.startDate) : null) ??
          undefined;
        end =
          parseDateInput(rawEnd) ??
          (existing.endDate ? new Date(existing.endDate) : null) ??
          undefined;
        if (!start || !end) {
          return NextResponse.json(
            { error: 'Start and end dates are required for GST registration/amendment' },
            { status: 400 }
          );
        }
      }

      if (serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR') {
        const tp =
          totalGstPaid !== undefined ? totalGstPaid : existing.totalGstPaid;
        if (tp == null || tp === '') {
          return NextResponse.json(
            { error: 'Total GST paid amount is required for filing records' },
            { status: 400 }
          );
        }
        const summary =
          filledSummaryFileUrl !== undefined
            ? filledSummaryFileUrl
            : existing.filledSummaryFileUrl;
        if (!summary) {
          return NextResponse.json(
            { error: 'Filled summary file is required (upload or existing URL)' },
            { status: 400 }
          );
        }
      }
    } else {
      start = rawStart ? new Date(rawStart) : new Date(existing.startDate);
      end = rawEnd ? new Date(rawEnd) : new Date(existing.endDate);
      if (!start || isNaN(start.getTime())) {
        return NextResponse.json(
          { error: 'Valid start date is required' },
          { status: 400 }
        );
      }
      if (!end || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Valid end date is required' },
          { status: 400 }
        );
      }
    }

    const totalPaidRaw =
      totalGstPaid !== undefined ? totalGstPaid : existing.totalGstPaid;
    const totalPaid =
      totalPaidRaw != null && totalPaidRaw !== ''
        ? Number(totalPaidRaw)
        : null;

    const updateData: Prisma.ServiceUncheckedUpdateInput = {
      businessId: businessId ?? existing.businessId,
      serviceType,
      serviceCode,
      domainName:
        serviceType === 'DOMAIN'
          ? domainName !== undefined
            ? domainName || null
            : existing.domainName
          : null,
      serverIp:
        serviceType === 'VPS' || serviceType === 'WEB_HOSTING'
          ? serverIp !== undefined
            ? serverIp || null
            : existing.serverIp
          : null,
      emailName:
        serviceType === 'DOMAIN_EMAIL'
          ? emailName !== undefined
            ? emailName || null
            : existing.emailName
          : null,
      startDate: start!,
      endDate: end!,
      planCode: planCode !== undefined ? planCode || null : existing.planCode,
      invoiceId:
        invoiceId !== undefined ? invoiceId || null : existing.invoiceId,
      gstFilingYear:
        serviceType === 'GST_SERVICES' &&
        (serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR')
          ? Number(gstFilingYear ?? existing.gstFilingYear)
          : null,
      gstFilingMonth:
        serviceType === 'GST_SERVICES' && serviceCode === 'GST_FILING_MON'
          ? Number(gstFilingMonth ?? existing.gstFilingMonth)
          : null,
      gstQuarter:
        serviceType === 'GST_SERVICES' && serviceCode === 'GST_FILING_QTR'
          ? Number(gstQuarter ?? existing.gstQuarter)
          : null,
      gstr1FilingDate:
        serviceType === 'GST_SERVICES'
          ? parseDateInput(gstr1FilingDate) ?? existing.gstr1FilingDate
          : null,
      gstr3bFilingDate:
        serviceType === 'GST_SERVICES'
          ? parseDateInput(gstr3bFilingDate) ?? existing.gstr3bFilingDate
          : null,
      totalGstPaid:
        serviceType === 'GST_SERVICES' &&
        (serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR') &&
        totalPaid != null &&
        !isNaN(totalPaid)
          ? totalPaid
          : null,
      filledSummaryFileUrl:
        filledSummaryFileUrl !== undefined
          ? filledSummaryFileUrl || null
          : existing.filledSummaryFileUrl,
      challanFileUrl:
        challanFileUrl !== undefined
          ? challanFileUrl || null
          : existing.challanFileUrl,
      gstNotes:
        gstNotes !== undefined
          ? gstNotes || null
          : existing.gstNotes,
    };

    if (serviceType !== 'GST_SERVICES') {
      updateData.gstFilingYear = null;
      updateData.gstFilingMonth = null;
      updateData.gstQuarter = null;
      updateData.gstr1FilingDate = null;
      updateData.gstr3bFilingDate = null;
      updateData.totalGstPaid = null;
      updateData.filledSummaryFileUrl = null;
      updateData.challanFileUrl = null;
      updateData.gstNotes = null;
    } else if (
      serviceCode === 'GST_REGISTRATION' ||
      serviceCode === 'GST_AMENDMENT'
    ) {
      updateData.gstFilingYear = null;
      updateData.gstFilingMonth = null;
      updateData.gstQuarter = null;
      updateData.gstr1FilingDate = null;
      updateData.gstr3bFilingDate = null;
      updateData.totalGstPaid = null;
    }

    const businessIdToCheck = (businessId ?? existing.businessId) as string;
    const business = await adminPrisma.businessInfo.findUnique({
      where: { id: businessIdToCheck },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const service = await adminPrisma.service.update({
      where: { id },
      data: updateData,
      include: {
        business: {
          select: {
            id: true,
            gstNumber: true,
            businessName: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
          },
        },
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await adminPrisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    await adminPrisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
