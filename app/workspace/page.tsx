import Link from "next/link";
import Workspace from "@/components/workspace/Workspace";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LocalWorkspacePage() {
  return (
    <>
      <div className="flex items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <span>Local demo: records stay in this browser and do not sync to your organization.{" "}
          <Link href="/register" className="font-semibold underline underline-offset-2">Create a cloud account</Link>
        </span>
        <ThemeToggle />
      </div>
      <Workspace />
    </>
  );
}
