import Link from "next/link";
import Workspace from "@/components/workspace/Workspace";

export default function LocalWorkspacePage() {
  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900">
        Local demo: records stay in this browser and do not sync to your organization. {" "}
        <Link href="/register" className="font-semibold underline underline-offset-2">Create a cloud account</Link>
      </div>
      <Workspace />
    </>
  );
}
