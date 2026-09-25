import { withUser } from "@/lib/db";

export type Profile = {
  id: string;
  fullName: string;
  phone: string | null;
  locale: string;
  avatarUrl: string | null;
};

/**
 * Ensures a public.profiles row exists for the authenticated user.
 * Called on every authenticated page load (idempotent).
 */
export async function ensureProfile(
  userId: string,
  fallbackName: string | null,
): Promise<Profile> {
  return withUser(userId, async (db) => {
    const rows = await db`
      insert into public.profiles (id, full_name)
      values (${userId}, ${fallbackName ?? ""})
      on conflict (id) do update set updated_at = now()
      returning id, full_name, phone, locale, avatar_url
    `;
    const r = rows[0];
    return {
      id: r.id as string,
      fullName: r.full_name as string,
      phone: (r.phone as string | null) ?? null,
      locale: r.locale as string,
      avatarUrl: (r.avatar_url as string | null) ?? null,
    };
  });
}
