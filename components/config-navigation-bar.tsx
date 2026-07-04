import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  canManageStandaloneConfigs,
  canViewBom,
  canViewMarginReview,
} from "@/lib/access";
import type { Role } from "@/types";

interface ConfigNavigationBarProps {
  confId: number;
  activePage: "config" | "bom" | "marginalita";
  role: Role;
  /**
   * The owning offer, for OFFER-origin configs viewed by an offer-access role.
   * When set, a "← Offerta {number}" back-link is shown. `null` for standalone
   * configs or roles without offer access (ENGINEER).
   */
  offer?: { offerId: number; offerNumber: string } | null;
}

const ALL_NAV_ITEMS = [
  {
    key: "config" as const,
    label: "Configurazione",
    path: (id: number) => `/configurazioni/visualizza/${id}`,
    canView: (_role: Role) => true,
  },
  {
    key: "bom" as const,
    label: "Distinta",
    path: (id: number) => `/configurazioni/bom/${id}`,
    canView: canViewBom,
  },
  {
    key: "marginalita" as const,
    label: "Marginalità",
    path: (id: number) => `/configurazioni/marginalita/${id}`,
    canView: canViewMarginReview,
  },
];

export default function ConfigNavigationBar({
  confId,
  activePage,
  role,
  offer,
}: ConfigNavigationBarProps) {
  const visibleItems = ALL_NAV_ITEMS.filter((item) => item.canView(role));

  return (
    <nav className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between mb-6">
      <div className="flex items-center gap-4">
        {/* The configurations list is the workspace of engineering roles
            (ENGINEER/ADMIN); sales roles work from offers and never see it, so
            they get only the offer back-link below. */}
        {canManageStandaloneConfigs(role) && (
          <Link
            href="/configurazioni"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Configurazioni</span>
          </Link>
        )}
        {offer && (
          <Link
            href={`/offerte/${offer.offerId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Offerta {offer.offerNumber}</span>
          </Link>
        )}
      </div>

      <div className="flex items-center rounded-md border bg-muted p-0.5 w-full xs:w-auto">
        {visibleItems.map((item) => (
          <Link
            key={item.key}
            href={item.path(confId)}
            className={`flex-1 text-center xs:flex-none xs:text-left px-3 py-1.5 text-sm rounded-sm transition-colors ${
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
