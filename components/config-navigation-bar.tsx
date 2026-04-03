import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ConfigNavigationBarProps {
  confId: number;
  activePage: "edit" | "bom";
}

const NAV_ITEMS = [
  {
    key: "edit" as const,
    label: "Configurazione",
    path: (id: number) => `/configurazioni/modifica/${id}`,
  },
  {
    key: "bom" as const,
    label: "Distinta",
    path: (id: number) => `/configurazioni/bom/${id}`,
  },
];

export default function ConfigNavigationBar({
  confId,
  activePage,
}: ConfigNavigationBarProps) {
  return (
    <nav className="flex items-center justify-between mb-6">
      <Link
        href="/configurazioni"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Configurazioni</span>
      </Link>

      <div className="flex items-center rounded-md border bg-muted p-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.path(confId)}
            className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
              activePage === item.key
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
