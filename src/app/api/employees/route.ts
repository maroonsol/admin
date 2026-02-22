import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    const where = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { employeeId: { contains: search } },
          ],
        }
      : {};
    
    const employees = await adminPrisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.firstName) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }
    
    // Check if email is unique if provided
    if (data.email) {
      const existing = await adminPrisma.employee.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }
    
    const employee = await adminPrisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
        designation: data.designation || null,
        department: data.department || null,
        salary: data.salary ? parseFloat(data.salary) : null,
        status: data.status || 'active',
        employeeId: data.employeeId || null,
      },
    });
    
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}

