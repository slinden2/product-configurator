import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { canViewBom, canViewOffer } from "@/lib/access";
import type { Role } from "@/types";

interface ConfigNavigationBarProps {
  confId: number;
  activePage: "edit" | "bom" | "offerta";
  role: Role;
}

const ALL_NAV_ITEMS = [
  {
    key: "edit" as const,
    label: "Configurazione",
    path: (id: number) => `/configurazioni/modifica/${id}`,
    canView: (_role: Role) => true,
  },
  {
    key: "bom" as const,
    label: "Distinta",
    path: (id: number) => `/configurazioni/bom/${id}`,
    canView: canViewBom,
  },
  {
    key: "offerta" as const,
    label: "Offerta",
    path: (id: number) => `/configurazioni/offerta/${id}`,
    canView: canViewOffer,
  },
];

export default function ConfigNavigationBar({
  confId,
  activePage,
  role,
}: ConfigNavigationBarProps) {
  const visibleItems = ALL_NAV_ITEMS.filter((item) => item.canView(role));

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
        {visibleItems.map((item) => (
          <Link
            key={item.key}
            href={item.path(confId)}
            className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
              activePage === item.key
                ? "bg-background text-foreground shadow-xs font-medium"
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
