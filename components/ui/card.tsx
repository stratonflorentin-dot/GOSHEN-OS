import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[15px] font-semibold", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex items-start justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="stat-value mt-1">{value}</p>
        {delta ? (
          <span className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            {delta}
          </span>
        ) : null}
      </div>
      {icon ? (
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-600">
          {icon}
        </div>
      ) : null}
    </div>
  );
}
