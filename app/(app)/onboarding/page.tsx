import { redirect } from "next/navigation";
import { Leaf, Building2, ArrowRight, TriangleAlert } from "lucide-react";
import { getSessionUser } from "@/lib/auth/server";
import { listMemberships } from "@/services/orgService";
import { createOrganizationAction } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships(user.id);
  if (memberships.length > 0) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white">
            <Leaf className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">Set up your organization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your organization groups your farms, team, and records. One platform, fully
            isolated data.
          </p>
        </div>

        {error && (
          <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4" /> {error}
          </p>
        )}

        <form action={createOrganizationAction} className="card space-y-4 p-6">
          <div>
            <label htmlFor="name" className="field-label">
              Organization name
            </label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Tesha Family Agriculture"
              className="field-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="field-label">
                Country
              </label>
              <input
                id="country"
                name="country"
                defaultValue="TZ"
                maxLength={2}
                className="field-input uppercase"
              />
            </div>
            <div>
              <label htmlFor="currency" className="field-label">
                Currency
              </label>
              <input
                id="currency"
                name="currency"
                defaultValue="TZS"
                maxLength={3}
                className="field-input uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            <Building2 className="h-4 w-4" />
            Create organization
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
