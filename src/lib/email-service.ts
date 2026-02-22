import nodemailer from 'nodemailer';

// Email service configuration for Hostinger SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // Your Hostinger email address
      pass: process.env.SMTP_PASSWORD, // Your Hostinger email password
    },
  });
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Hostinger SMTP
 * @param options Email options (to, subject, html, text)
 * @returns Promise<boolean> Success status
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Plain text version
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send OTP email to user
 * @param email User email address
 * @param otpCode OTP code to send
 * @returns Promise<boolean> Success status
 */
export async function sendOtpEmail(email: string, otpCode: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login OTP</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #2563eb; margin-top: 0;">Login Verification Code</h2>
        <p>Hello,</p>
        <p>You have requested to login to your account. Please use the following OTP code to complete your login:</p>
        <div style="background-color: #ffffff; border: 2px dashed #2563eb; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0;">${otpCode}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Login Verification Code
    
    You have requested to login to your account. Please use the following OTP code to complete your login:
    
    ${otpCode}
    
    This code will expire in 10 minutes.
    
    If you did not request this code, please ignore this email.
  `;

  return await sendEmail({
    to: email,
    subject: 'Your Login OTP Code',
    html,
    text,
  });
}

