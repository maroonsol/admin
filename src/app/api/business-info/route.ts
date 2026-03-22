import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';
import { validateGSTNumber } from '@/lib/utils';

const businessInclude = { additionalGstLocations: { orderBy: { createdAt: 'asc' as const } } };

type AdditionalGstInput = {
  id?: string;
  gstNumber?: string;
  businessAddress?: string | null;
  businessAddress2?: string | null;
  businessDistrict?: string | null;
  businessState?: string | null;
  businessStateCode?: string | null;
  businessPincode?: string | null;
};

function cleanGst(g: string) {
  return g.replace(/\s+/g, '').toUpperCase();
}

function validateAdditionalGstList(
  primaryGst: string,
  multipleGst: boolean,
  list: AdditionalGstInput[] | undefined
): string | null {
  if (!multipleGst) return null;
  if (!list || list.length === 0) {
    return 'At least one additional GST registration is required when Multiple GST is enabled';
  }
  const primary = cleanGst(primaryGst);
  for (const row of list) {
    const g = row.gstNumber ? cleanGst(row.gstNumber) : '';
    if (!g || !validateGSTNumber(g)) {
      return 'Each additional GST must be a valid 15-character GST number';
    }
    if (g === primary) {
      return 'Additional GST numbers must be different from the primary GST number';
    }
  }
  const seen = new Set<string>();
  for (const row of list) {
    const g = cleanGst(row.gstNumber!);
    if (seen.has(g)) return 'Duplicate additional GST numbers are not allowed';
    seen.add(g);
  }
  return null;
}

// GET - Search business info by GST number or search by name/GST, or by id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gstNumber = searchParams.get('gstNumber');
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    if (id) {
      const businessInfo = await adminPrisma.businessInfo.findUnique({
        where: { id },
        include: businessInclude,
      });
      if (!businessInfo) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      return NextResponse.json(businessInfo);
    }

    // If search parameter is provided, search by name or GST
    if (search !== null) {
      const searchTerm = search.trim();

      // If search is empty or "all", return all businesses
      if (searchTerm === '' || searchTerm.toLowerCase() === 'all') {
        const allBusinesses = await adminPrisma.businessInfo.findMany({
          orderBy: { businessName: 'asc' },
          include: businessInclude,
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
            { businessName: { contains: searchTerm } },
            { gstNumber: { contains: searchTerm.toUpperCase() } },
          ],
        },
        take: 20,
        orderBy: { businessName: 'asc' },
        include: businessInclude,
      });

      return NextResponse.json(businesses);
    }

    // If gstNumber is provided, find by exact GST number
    if (gstNumber) {
      if (!validateGSTNumber(gstNumber)) {
        return NextResponse.json({ error: 'Invalid GST number format' }, { status: 400 });
      }

      const businessInfo = await adminPrisma.businessInfo.findUnique({
        where: { gstNumber: cleanGst(gstNumber) },
        include: businessInclude,
      });

      if (!businessInfo) {
        return NextResponse.json({ error: 'Business info not found' }, { status: 404 });
      }

      return NextResponse.json(businessInfo);
    }

    return NextResponse.json(
      { error: 'Either gstNumber, search, or id parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching business info:', error);
    return NextResponse.json({ error: 'Failed to fetch business info' }, { status: 500 });
  }
}

// POST - Create or update business info
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { gstNumber, multipleGst, additionalGstLocations, ...businessData } = data;

    if (!gstNumber) {
      return NextResponse.json({ error: 'GST number is required' }, { status: 400 });
    }

    if (!validateGSTNumber(gstNumber)) {
      return NextResponse.json({ error: 'Invalid GST number format' }, { status: 400 });
    }

    const cleanedGST = cleanGst(gstNumber);
    const existing = await adminPrisma.businessInfo.findUnique({
      where: { gstNumber: cleanedGST },
    });

    const mGst =
      multipleGst !== undefined
        ? Boolean(multipleGst)
        : (existing?.multipleGst ?? false);
    const addList = (additionalGstLocations as AdditionalGstInput[] | undefined) ?? [];
    const replaceAdditional =
      multipleGst !== undefined || additionalGstLocations !== undefined;

    const addErr = replaceAdditional
      ? validateAdditionalGstList(cleanedGST, mGst, mGst ? addList : [])
      : null;
    if (addErr) {
      return NextResponse.json({ error: addErr }, { status: 400 });
    }

    const baseData = {
      businessName: businessData.businessName,
      businessPhone: businessData.businessPhone,
      businessEmail: businessData.businessEmail,
      businessAddress: businessData.businessAddress,
      businessAddress2: businessData.businessAddress2,
      businessDistrict: businessData.businessDistrict,
      businessState: businessData.businessState,
      businessStateCode: businessData.businessStateCode,
      businessPincode: businessData.businessPincode,
      multipleGst: mGst,
    };

    let businessInfo;
    if (existing) {
      if (replaceAdditional) {
        businessInfo = await adminPrisma.$transaction(async (tx) => {
          await tx.businessAdditionalGst.deleteMany({ where: { businessId: existing.id } });
          const updated = await tx.businessInfo.update({
            where: { gstNumber: cleanedGST },
            data: {
              ...baseData,
              ...(mGst && addList.length > 0
                ? {
                    additionalGstLocations: {
                      create: addList.map((row) => ({
                        gstNumber: cleanGst(row.gstNumber!),
                        businessAddress: row.businessAddress ?? null,
                        businessAddress2: row.businessAddress2 ?? null,
                        businessDistrict: row.businessDistrict ?? null,
                        businessState: row.businessState ?? null,
                        businessStateCode: row.businessStateCode ?? null,
                        businessPincode: row.businessPincode ?? null,
                      })),
                    },
                  }
                : {}),
            },
            include: businessInclude,
          });
          return updated;
        });
      } else {
        businessInfo = await adminPrisma.businessInfo.update({
          where: { gstNumber: cleanedGST },
          data: baseData,
          include: businessInclude,
        });
      }
    } else {
      const createM = Boolean(multipleGst);
      const createList = createM ? addList : [];
      const createErr = validateAdditionalGstList(cleanedGST, createM, createList);
      if (createErr) {
        return NextResponse.json({ error: createErr }, { status: 400 });
      }
      businessInfo = await adminPrisma.businessInfo.create({
        data: {
          gstNumber: cleanedGST,
          ...baseData,
          multipleGst: createM,
          ...(createM && createList.length > 0
            ? {
                additionalGstLocations: {
                  create: createList.map((row) => ({
                    gstNumber: cleanGst(row.gstNumber!),
                    businessAddress: row.businessAddress ?? null,
                    businessAddress2: row.businessAddress2 ?? null,
                    businessDistrict: row.businessDistrict ?? null,
                    businessState: row.businessState ?? null,
                    businessStateCode: row.businessStateCode ?? null,
                    businessPincode: row.businessPincode ?? null,
                  })),
                },
              }
            : {}),
        },
        include: businessInclude,
      });
    }

    return NextResponse.json(businessInfo, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error creating/updating business info:', error);
    return NextResponse.json({ error: 'Failed to create/update business info' }, { status: 500 });
  }
}

// PUT - Update business info by ID
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, gstNumber, multipleGst, additionalGstLocations, ...businessData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    if (!gstNumber) {
      return NextResponse.json({ error: 'GST number is required' }, { status: 400 });
    }

    if (!validateGSTNumber(gstNumber)) {
      return NextResponse.json({ error: 'Invalid GST number format' }, { status: 400 });
    }

    const cleanedGST = cleanGst(gstNumber);
    const mGst = Boolean(multipleGst);
    const addList = (additionalGstLocations as AdditionalGstInput[] | undefined) ?? [];

    const addErr = validateAdditionalGstList(cleanedGST, mGst, addList);
    if (addErr) {
      return NextResponse.json({ error: addErr }, { status: 400 });
    }

    const existingBusiness = await adminPrisma.businessInfo.findUnique({
      where: { id },
    });

    if (!existingBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

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

    // Ensure new additional GST numbers are not used as another business primary or additional
    for (const row of addList) {
      const g = cleanGst(row.gstNumber!);
      const asPrimary = await adminPrisma.businessInfo.findUnique({
        where: { gstNumber: g },
        select: { id: true },
      });
      if (asPrimary && asPrimary.id !== id) {
        return NextResponse.json(
          { error: `GST ${g} is already registered as another business` },
          { status: 400 }
        );
      }
      const asOtherAdditional = await adminPrisma.businessAdditionalGst.findUnique({
        where: { gstNumber: g },
        select: { businessId: true },
      });
      if (asOtherAdditional && asOtherAdditional.businessId !== id) {
        return NextResponse.json(
          { error: `GST ${g} is already used as an additional registration` },
          { status: 400 }
        );
      }
    }

    const businessInfo = await adminPrisma.$transaction(async (tx) => {
      await tx.businessAdditionalGst.deleteMany({ where: { businessId: id } });
      return tx.businessInfo.update({
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
          multipleGst: mGst,
          ...(mGst && addList.length > 0
            ? {
                additionalGstLocations: {
                  create: addList.map((row) => ({
                    gstNumber: cleanGst(row.gstNumber!),
                    businessAddress: row.businessAddress ?? null,
                    businessAddress2: row.businessAddress2 ?? null,
                    businessDistrict: row.businessDistrict ?? null,
                    businessState: row.businessState ?? null,
                    businessStateCode: row.businessStateCode ?? null,
                    businessPincode: row.businessPincode ?? null,
                  })),
                },
              }
            : {}),
        },
        include: businessInclude,
      });
    });

    return NextResponse.json(businessInfo, { status: 200 });
  } catch (error) {
    console.error('Error updating business info:', error);
    return NextResponse.json({ error: 'Failed to update business info' }, { status: 500 });
  }
}
