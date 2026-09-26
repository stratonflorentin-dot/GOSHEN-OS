import { betterAuth } from "better-auth";
import { sql } from "@/lib/db";
import { createTransport } from "nodemailer";

const smtp = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
});

const mailFrom = process.env.MAIL_FROM ?? "GOSHEN OS <no-reply@goshen-os.local>";

/**
 * Identity provider only. Organization / membership domain is owned by the
 * application (public.organizations, organization_members, RPC invitations)
 * — do not add Better Auth plugins that would parallel it.
 *
 * Sessions live in neon_auth (Managed Better Auth layout) so existing
 * accounts stay valid. Email verification requires SMTP; without SMTP env
 * verification is skipped (dev mode logs the verification URL instead).
 */
export const auth = betterAuth({
  database: sql,
  databaseSchema: "auth",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable email verification for now
  },
});

export type Session = typeof auth.$Infer.Session;
