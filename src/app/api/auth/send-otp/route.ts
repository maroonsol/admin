import { NextRequest, NextResponse } from 'next/server';
import { adminPrisma } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email-service';

/**
 * Generate a random 6-digit OTP code
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { emailOrPhone } = await request.json();

    if (!emailOrPhone) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    const isPhone = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(emailOrPhone);

    // Find user by email or phone
    const user = await adminPrisma.user.findFirst({
      where: isEmail
        ? { email: emailOrPhone }
        : { phone: emailOrPhone },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please check your email or phone number.' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes

    // Delete any existing OTPs for this email/phone
    await adminPrisma.otp.deleteMany({
      where: {
        OR: [
          { email: user.email },
          { phone: user.phone || undefined },
        ],
      },
    });

    // Create new OTP
    await adminPrisma.otp.create({
      data: {
        email: user.email,
        phone: user.phone,
        code: otpCode,
        expiresAt,
      },
    });

    // Send OTP via email
    const emailSent = await sendOtpEmail(user.email, otpCode);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully to your email',
      // In production, don't send email in response for security
      // email: user.email, // Only for development
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

