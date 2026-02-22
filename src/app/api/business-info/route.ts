import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';
import { validateGSTNumber } from '@/lib/utils';

// GET - Search business info by GST number or search by name/GST
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gstNumber = searchParams.get('gstNumber');
    const search = searchParams.get('search');

    // If search parameter is provided, search by name or GST
    if (search !== null) {
      const searchTerm = search.trim();
      
      // If search is empty or "all", return all businesses
      if (searchTerm === '' || searchTerm.toLowerCase() === 'all') {
        const allBusinesses = await adminPrisma.businessInfo.findMany({
          orderBy: {
            businessName: 'asc'
          }
        });
        return NextResponse.json(allBusinesses);
      }
      
      if (searchTerm.length < 2) {
        return NextResponse.json(
          { error: 'Search term must be at least 2 characters' },
          { status: 400 }
        );
      }

      const businesses = await adminPrisma.businessInfo.findMany({
        where: {
          OR: [
            {
              businessName: {
                contains: searchTerm
              }
            },
            {
              gstNumber: {
                contains: searchTerm.toUpperCase()
              }
            }
          ]
        },
        take: 20,
        orderBy: {
          businessName: 'asc'
        }
      });

      return NextResponse.json(businesses);
    }

    // If gstNumber is provided, find by exact GST number
    if (gstNumber) {
      // Validate GST number format
      if (!validateGSTNumber(gstNumber)) {
        return NextResponse.json(
          { error: 'Invalid GST number format' },
          { status: 400 }
        );
      }

      // Search for business info
      const businessInfo = await adminPrisma.businessInfo.findUnique({
        where: {
          gstNumber: gstNumber.replace(/\s+/g, '').toUpperCase(),
        },
      });

      if (!businessInfo) {
        return NextResponse.json(
          { error: 'Business info not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(businessInfo);
    }

    return NextResponse.json(
      { error: 'Either gstNumber or search parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching business info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business info' },
      { status: 500 }
    );
  }
}

// POST - Create or update business info
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { gstNumber, ...businessData } = data;

    if (!gstNumber) {
      return NextResponse.json(
        { error: 'GST number is required' },
        { status: 400 }
      );
    }

    // Validate GST number format
    if (!validateGSTNumber(gstNumber)) {
      return NextResponse.json(
        { error: 'Invalid GST number format' },
        { status: 400 }
      );
    }

    const cleanedGST = gstNumber.replace(/\s+/g, '').toUpperCase();

    // Check if business info exists
    const existing = await adminPrisma.businessInfo.findUnique({
      where: { gstNumber: cleanedGST },
    });

    let businessInfo;
    if (existing) {
      // Update existing business info
      businessInfo = await adminPrisma.businessInfo.update({
        where: { gstNumber: cleanedGST },
        data: {
          businessName: businessData.businessName,
          businessPhone: businessData.businessPhone,
          businessEmail: businessData.businessEmail,
          businessAddress: businessData.businessAddress,
          businessAddress2: businessData.businessAddress2,
          businessDistrict: businessData.businessDistrict,
          businessState: businessData.businessState,
          businessStateCode: businessData.businessStateCode,
          businessPincode: businessData.businessPincode,
        },
      });
    } else {
      // Create new business info
      businessInfo = await adminPrisma.businessInfo.create({
        data: {
          gstNumber: cleanedGST,
          businessName: businessData.businessName,
          businessPhone: businessData.businessPhone,
          businessEmail: businessData.businessEmail,
          businessAddress: businessData.businessAddress,
          businessAddress2: businessData.businessAddress2,
          businessDistrict: businessData.businessDistrict,
          businessState: businessData.businessState,
          businessStateCode: businessData.businessStateCode,
          businessPincode: businessData.businessPincode,
        },
      });
    }

    return NextResponse.json(businessInfo, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error creating/updating business info:', error);
    return NextResponse.json(
      { error: 'Failed to create/update business info' },
      { status: 500 }
    );
  }
}

// PUT - Update business info by ID
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, gstNumber, ...businessData } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!gstNumber) {
      return NextResponse.json(
        { error: 'GST number is required' },
        { status: 400 }
      );
    }

    // Validate GST number format
    if (!validateGSTNumber(gstNumber)) {
      return NextResponse.json(
        { error: 'Invalid GST number format' },
        { status: 400 }
      );
    }

    const cleanedGST = gstNumber.replace(/\s+/g, '').toUpperCase();

    // Check if GST number is being changed and if it conflicts with another business
    const existingBusiness = await adminPrisma.businessInfo.findUnique({
      where: { id },
    });

    if (!existingBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // If GST number is being changed, check for conflicts
    if (existingBusiness.gstNumber !== cleanedGST) {
      const gstConflict = await adminPrisma.businessInfo.findUnique({
        where: { gstNumber: cleanedGST },
      });

      if (gstConflict) {
        return NextResponse.json(
          { error: 'GST number already exists for another business' },
          { status: 400 }
        );
      }
    }

    // Update business info
    const businessInfo = await adminPrisma.businessInfo.update({
      where: { id },
      data: {
        gstNumber: cleanedGST,
        businessName: businessData.businessName,
        businessPhone: businessData.businessPhone,
        businessEmail: businessData.businessEmail,
        businessAddress: businessData.businessAddress,
        businessAddress2: businessData.businessAddress2,
        businessDistrict: businessData.businessDistrict,
        businessState: businessData.businessState,
        businessStateCode: businessData.businessStateCode,
        businessPincode: businessData.businessPincode,
      },
    });

    return NextResponse.json(businessInfo, { status: 200 });
  } catch (error) {
    console.error('Error updating business info:', error);
    return NextResponse.json(
      { error: 'Failed to update business info' },
      { status: 500 }
    );
  }
}

