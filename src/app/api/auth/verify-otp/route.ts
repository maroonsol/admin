import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { emailOrPhone, otp } = await request.json();

    if (!emailOrPhone || !otp) {
      return NextResponse.json(
        { error: 'Email/phone and OTP are required' },
        { status: 400 }
      );
    }

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');

    // Find user
    const user = await adminPrisma.user.findFirst({
      where: isEmail
        ? { email: emailOrPhone }
        : { phone: emailOrPhone },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find valid OTP
    const otpRecord = await adminPrisma.otp.findFirst({
      where: {
        OR: [
          { email: user.email },
          { phone: user.phone || undefined },
        ],
        code: otp,
        expiresAt: {
          gt: new Date(), // OTP must not be expired
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent OTP
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Delete the used OTP
    await adminPrisma.otp.delete({
      where: { id: otpRecord.id },
    });

    // Return user info (will be used by Auth.js to create session)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}

