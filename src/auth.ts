import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { adminPrisma } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "OTP",
      credentials: {
        emailOrPhone: { label: "Email or Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.emailOrPhone || !credentials?.otp) {
          return null
        }

        try {
          const emailOrPhone = credentials.emailOrPhone as string
          const otp = credentials.otp as string

          // Determine if input is email or phone
          const isEmail = emailOrPhone.includes('@')

          // Find user
          const user = await adminPrisma.user.findFirst({
            where: isEmail
              ? { email: emailOrPhone }
              : { phone: emailOrPhone },
          })

          if (!user) {
            return null
          }

          // Find valid OTP
          const otpRecord = await adminPrisma.otp.findFirst({
            where: {
              OR: [
                { email: user.email },
                ...(user.phone ? [{ phone: user.phone }] : []),
              ],
              code: otp,
              expiresAt: {
                gt: new Date(), // OTP must not be expired
              },
            },
            orderBy: {
              createdAt: 'desc', // Get the most recent OTP
            },
          })

          if (!otpRecord) {
            return null
          }

          // Delete the used OTP
          await adminPrisma.otp.delete({
            where: { id: otpRecord.id },
          })

          // Return user object for session
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role,
          }
        } catch (error) {
          console.error('Error in authorize:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.phone = (user as any).phone
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.phone = token.phone as string | null
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
})