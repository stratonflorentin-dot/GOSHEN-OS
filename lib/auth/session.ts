import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
};

/** Server-side session read (server components, server actions, routes). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: (user as { name?: string | null }).name ?? null,
    emailVerified: Boolean((user as { emailVerified?: boolean }).emailVerified),
  };
}
