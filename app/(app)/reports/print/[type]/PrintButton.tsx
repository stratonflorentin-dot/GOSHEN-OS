"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-white"
    >
      <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
    </button>
  );
}
