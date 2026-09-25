import { Construction } from "lucide-react";

const TITLES: Record<string, { title: string; phase: number }> = {
  crops: { title: "Crops", phase: 3 },
  livestock: { title: "Livestock", phase: 3 },
  inventory: { title: "Inventory", phase: 4 },
  procurement: { title: "Procurement", phase: 4 },
  finance: { title: "Finance", phase: 5 },
  production: { title: "Production", phase: 6 },
  labor: { title: "Labor", phase: 6 },
  equipment: { title: "Equipment", phase: 6 },
  irrigation: { title: "Irrigation", phase: 6 },
  weather: { title: "Weather", phase: 7 },
  analytics: { title: "Analytics", phase: 7 },
  reports: { title: "Reports", phase: 11 },
  assistant: { title: "AI Assistant", phase: 10 },
  tasks: { title: "Tasks", phase: 6 },
  documents: { title: "Documents", phase: 6 },
  team: { title: "Team", phase: 12 },
  settings: { title: "Settings", phase: 12 },
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((section) => ({ section }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = TITLES[section] ?? { title: section, phase: 0 };

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700">
          <Construction className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta.phase > 0
            ? `This module arrives in Phase ${meta.phase} of the development roadmap. The interface is specified in the wireframes; the module is not yet implemented.`
            : "This module is not yet implemented."}
        </p>
      </div>
    </div>
  );
}
