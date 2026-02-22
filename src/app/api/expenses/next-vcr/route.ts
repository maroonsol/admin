import { NextResponse } from 'next/server';
import { getNextVCRNumber } from '@/lib/vcr-generator';

export async function GET() {
  try {
    const vcrNumber = await getNextVCRNumber();
    return NextResponse.json({ vcrNumber });
  } catch (error) {
    console.error('Error generating VCR number:', error);
    return NextResponse.json(
      { error: 'Failed to generate VCR number' },
      { status: 500 }
    );
  }
}

