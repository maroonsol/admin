import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    const where = search
      ? {
          OR: [
            { vendorName: { contains: search } },
            { gstNumber: { contains: search } },
          ],
        }
      : {};
    
    const vendors = await adminPrisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10, // Limit results for dropdown
    });
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.vendorName) {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      );
    }
    
    // Check if GST number is unique if provided
    if (data.gstNumber) {
      const existing = await adminPrisma.vendor.findUnique({
        where: { gstNumber: data.gstNumber },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'GST number already exists' },
          { status: 400 }
        );
      }
    }
    
    const vendor = await adminPrisma.vendor.create({
      data: {
        vendorName: data.vendorName,
        additionalName: data.additionalName || null,
        gstNumber: data.gstNumber || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        state: data.state || null,
        stateCode: data.stateCode || null,
        country: data.country || 'India',
        pincode: data.pincode || null,
      },
    });
    
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}

