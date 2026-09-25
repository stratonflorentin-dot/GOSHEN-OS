import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "gray" | "blue" | "red";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  gray: "bg-black/5 text-muted-foreground",
  blue: "bg-sky-50 text-sky-700",
  red: "bg-red-50 text-red-600",
};

export function Badge({
  tone = "gray",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
