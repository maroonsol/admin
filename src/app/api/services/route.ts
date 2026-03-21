import { NextRequest, NextResponse } from 'next/server';
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

// GET - List all services, optionally filter by businessId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    const where = businessId ? { businessId } : {};

    const services = await adminPrisma.service.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST - Create a new service
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      businessId,
      serviceType,
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

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business is required' },
        { status: 400 }
      );
    }

    if (!serviceType || !SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        { error: 'Valid service type is required' },
        { status: 400 }
      );
    }

    const serviceCode = resolveServiceCode(serviceType, rawServiceCode);

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

    let start: Date | undefined;
    let end: Date | undefined;

    if (serviceType === 'GST_SERVICES') {
      const g1 = parseDateInput(gstr1FilingDate);
      const g3 = parseDateInput(gstr3bFilingDate);
      const filingNeedsGstr =
        serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR';
      if (filingNeedsGstr && (!g1 || !g3)) {
        return NextResponse.json(
          { error: 'GSTR-1 and GSTR-3B filing dates are required for GST filing services' },
          { status: 400 }
        );
      }

      if (serviceCode === 'GST_FILING_MON') {
        const y = Number(gstFilingYear);
        const m = Number(gstFilingMonth);
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
        const fyStart = Number(gstFilingYear);
        const q = Number(gstQuarter);
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
        start = parseDateInput(rawStart) ?? undefined;
        end = parseDateInput(rawEnd) ?? undefined;
        if (!start || !end) {
          return NextResponse.json(
            { error: 'Start and end dates are required for GST registration/amendment' },
            { status: 400 }
          );
        }
      }

      if (serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR') {
        if (totalGstPaid == null || totalGstPaid === '') {
          return NextResponse.json(
            { error: 'Total GST paid amount is required for filing records' },
            { status: 400 }
          );
        }
        if (!filledSummaryFileUrl) {
          return NextResponse.json(
            { error: 'Filled summary file is required (upload before saving, or paste URL)' },
            { status: 400 }
          );
        }
      }
    } else {
      start = rawStart ? new Date(rawStart) : undefined;
      end = rawEnd ? new Date(rawEnd) : undefined;
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

    const business = await adminPrisma.businessInfo.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const totalPaid =
      totalGstPaid != null && totalGstPaid !== ''
        ? Number(totalGstPaid)
        : null;

    const service = await adminPrisma.service.create({
      data: {
        businessId,
        serviceType,
        serviceCode,
        domainName:
          serviceType === 'DOMAIN' ? domainName || null : null,
        serverIp:
          serviceType === 'VPS' || serviceType === 'WEB_HOSTING'
            ? serverIp || null
            : null,
        emailName:
          serviceType === 'DOMAIN_EMAIL' ? emailName || null : null,
        startDate: start!,
        endDate: end!,
        planCode: planCode || null,
        invoiceId: invoiceId || null,
        gstFilingYear:
          serviceType === 'GST_SERVICES' &&
          (serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR')
            ? Number(gstFilingYear)
            : null,
        gstFilingMonth:
          serviceType === 'GST_SERVICES' && serviceCode === 'GST_FILING_MON'
            ? Number(gstFilingMonth)
            : null,
        gstQuarter:
          serviceType === 'GST_SERVICES' && serviceCode === 'GST_FILING_QTR'
            ? Number(gstQuarter)
            : null,
        gstr1FilingDate:
          serviceType === 'GST_SERVICES' ? parseDateInput(gstr1FilingDate) : null,
        gstr3bFilingDate:
          serviceType === 'GST_SERVICES' ? parseDateInput(gstr3bFilingDate) : null,
        totalGstPaid:
          serviceType === 'GST_SERVICES' &&
          (serviceCode === 'GST_FILING_MON' || serviceCode === 'GST_FILING_QTR') &&
          totalPaid != null &&
          !isNaN(totalPaid)
            ? totalPaid
            : null,
        filledSummaryFileUrl: filledSummaryFileUrl || null,
        challanFileUrl: challanFileUrl || null,
        gstNotes: serviceType === 'GST_SERVICES' ? gstNotes || null : null,
      },
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

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}
