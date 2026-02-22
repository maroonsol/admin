# Authentication Setup Guide

This document explains the OTP-based authentication system implemented using Auth.js v5 (NextAuth).

## Overview

The authentication system uses:
- **OTP (One-Time Password)** sent via email
- **Email or Phone Number** for user identification
- **Hostinger SMTP** for sending emails
- **Auth.js v5** for session management

## Features

1. ✅ Users can login with email or phone number
2. ✅ OTP is sent to user's email address
3. ✅ OTP expires in 10 minutes
4. ✅ All routes are protected except `/login` and `/api/auth/*`
5. ✅ Session management with JWT
6. ✅ Logout functionality

## Environment Variables

Add these to your `.env` or `.env.local` file:

```env
# Auth.js Secret (required)
# Generate with: npx auth secret
AUTH_SECRET=your-secret-key-here

# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=your-email@yourdomain.com
```

### Generating AUTH_SECRET

Run this command to generate a secure secret:
```bash
npx auth secret
```

This will automatically add it to your `.env.local` file.

## Database Migration

After adding the OTP model to the schema, run:

```bash
npx prisma migrate dev --name add_otp_model --schema=prisma/admin.schema.prisma
```

Or if you want to push without creating a migration:

```bash
npx prisma db push --schema=prisma/admin.schema.prisma
```

## File Structure

```
src/
├── auth.ts                          # Auth.js configuration with OTP provider
├── middleware.ts                    # Route protection middleware
├── types/
│   └── next-auth.d.ts              # TypeScript type definitions
├── lib/
│   └── email-service.ts            # Email service for Hostinger SMTP
├── app/
│   ├── login/
│   │   └── page.tsx                # Login page UI
│   └── api/
│       └── auth/
│           ├── [...nextauth]/
│           │   └── route.ts        # Auth.js API route handler
│           ├── send-otp/
│           │   └── route.ts        # API to send OTP
│           └── verify-otp/
│               └── route.ts         # API to verify OTP (optional, used by custom flow)
└── components/
    └── section-header.tsx           # Updated with logout button
```

## How It Works

### 1. User Login Flow

1. User visits any protected route → Redirected to `/login`
2. User enters email or phone number
3. System finds user in database
4. OTP is generated and sent to user's email
5. User enters OTP code
6. System verifies OTP and creates session
7. User is redirected to the original page

### 2. OTP Generation

- 6-digit random code
- Stored in database with expiration (10 minutes)
- One OTP per email/phone at a time
- OTP is deleted after successful verification

### 3. Session Management

- Uses JWT strategy
- Session includes: `id`, `name`, `email`, `phone`, `role`
- Session persists across page refreshes

### 4. Route Protection

- All routes are protected by default
- Public routes: `/login`, `/api/auth/*`
- Unauthenticated users are redirected to `/login`
- Authenticated users accessing `/login` are redirected to `/`

## Usage

### Creating Users

Users must be created through the `/users` page (requires authentication) or directly in the database.

### Login

1. Navigate to any protected route
2. You'll be redirected to `/login`
3. Enter your email or phone number
4. Check your email for OTP
5. Enter the 6-digit OTP
6. You'll be logged in and redirected

### Logout

Click the "Logout" button in the header to sign out.

## API Endpoints

### POST `/api/auth/send-otp`
Send OTP to user's email.

**Request:**
```json
{
  "emailOrPhone": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email"
}
```

### POST `/api/auth/verify-otp`
Verify OTP (used internally by Auth.js, but available for custom flows).

**Request:**
```json
{
  "emailOrPhone": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "phone": "...",
    "role": "..."
  }
}
```

## Troubleshooting

### Email Not Sending

1. Check SMTP credentials in `.env`
2. Verify Hostinger email account is active
3. Check if port 465 is open (or use 587 with `secure: false`)
4. Check server logs for SMTP errors

### OTP Not Working

1. Check database connection
2. Verify OTP table exists (run migrations)
3. Check OTP expiration (10 minutes)
4. Verify user exists in database

### Session Issues

1. Check `AUTH_SECRET` is set
2. Clear browser cookies
3. Check middleware configuration
4. Verify JWT strategy is enabled

## Security Notes

- OTPs expire after 10 minutes
- OTPs are single-use (deleted after verification)
- Only one active OTP per email/phone
- Sessions use secure JWT tokens
- All routes are protected by default

## Next Steps

1. Set up environment variables
2. Run database migration
3. Create at least one user in the database
4. Test the login flow
5. Configure email settings if needed

