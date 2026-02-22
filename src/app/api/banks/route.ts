import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function GET() {
  try {
    const banks = await adminPrisma.bankAccount.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { bankName, accountNumber, ifscCode, branch, accountHolderName } = data;

    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      return NextResponse.json(
        { error: 'Bank name, account number, IFSC code, and account holder name are required' },
        { status: 400 }
      );
    }

    const bank = await adminPrisma.bankAccount.create({
      data: {
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        branch: branch || null,
        accountHolderName,
      },
    });

    return NextResponse.json(bank, { status: 201 });
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 }
    );
  }
}

