import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '../../../../../prisma/generated/admin';
import { adminPrisma } from '@/lib/db';

const SERVICE_TYPES = ['DOMAIN', 'VPS', 'WEB_HOSTING', 'DOMAIN_EMAIL'] as const;

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
      serviceType,
      domainName,
      serverIp,
      emailName,
      startDate,
      endDate,
      planCode,
      invoiceId,
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

    if (businessId !== undefined && !businessId) {
      return NextResponse.json(
        { error: 'Business is required' },
        { status: 400 }
      );
    }

    if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        { error: 'Valid service type is required (DOMAIN, VPS, WEB_HOSTING, DOMAIN_EMAIL)' },
        { status: 400 }
      );
    }

    const updateData: {
      businessId?: string;
      serviceType?: string;
      domainName?: string | null;
      serverIp?: string | null;
      emailName?: string | null;
      startDate?: Date;
      endDate?: Date;
      planCode?: string | null;
      invoiceId?: string | null;
    } = {};

    if (businessId != null) updateData.businessId = businessId;
    if (serviceType != null) updateData.serviceType = serviceType;
    if (domainName !== undefined) updateData.domainName = domainName || null;
    if (serverIp !== undefined) updateData.serverIp = serverIp || null;
    if (emailName !== undefined) updateData.emailName = emailName || null;
    if (planCode !== undefined) updateData.planCode = planCode || null;
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId || null;
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) updateData.startDate = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) updateData.endDate = end;
    }

    const service = await adminPrisma.service.update({
      where: { id },
      data: updateData as Prisma.ServiceUncheckedUpdateInput,
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
