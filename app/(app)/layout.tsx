import { redirect } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { getSessionUser } from "@/lib/auth/server";
import { ensureProfile } from "@/services/profileService";
import { listMemberships } from "@/services/orgService";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [profile, memberships] = await Promise.all([
    ensureProfile(user.id, user.name),
    listMemberships(user.id),
  ]);

  return (
    <Shell userName={profile.fullName || user.name || "User"} orgName={memberships[0]?.organization.name ?? null}>
      {children}
    </Shell>
  );
}
