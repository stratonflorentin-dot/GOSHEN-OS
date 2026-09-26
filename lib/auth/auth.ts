import { betterAuth } from "better-auth";
import { PostgresJSDialect } from "kysely-postgres-js";
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
 * Auth records live in the dedicated `auth` schema. Postgres.js is the app's
 * driver, so Better Auth needs its Kysely dialect rather than the raw SQL tag.
 */
export const auth = betterAuth({
  database: {
    dialect: new PostgresJSDialect({ postgres: sql }),
    type: "postgres",
    schemaName: "auth",
  },
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable email verification for now
  },
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    fields: {
      accountId: "account_id",
      providerId: "provider",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});

export type Session = typeof auth.$Infer.Session;
