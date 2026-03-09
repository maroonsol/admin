import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

const SERVICE_TYPES = ['DOMAIN', 'VPS', 'WEB_HOSTING', 'DOMAIN_EMAIL'] as const;

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
      domainName,
      serverIp,
      emailName,
      startDate,
      endDate,
      planCode,
    } = data;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business is required' },
        { status: 400 }
      );
    }

    if (!serviceType || !SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        { error: 'Valid service type is required (DOMAIN, VPS, WEB_HOSTING, DOMAIN_EMAIL)' },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
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

    // Optional validation for type-specific fields (can be enforced in UI)
    const business = await adminPrisma.businessInfo.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const service = await adminPrisma.service.create({
      data: {
        businessId,
        serviceType,
        domainName: domainName || null,
        serverIp: serverIp || null,
        emailName: emailName || null,
        startDate: start,
        endDate: end,
        planCode: planCode || null,
      },
      include: {
        business: {
          select: {
            id: true,
            gstNumber: true,
            businessName: true,
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
