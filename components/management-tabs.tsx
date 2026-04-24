"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TAB_ITEMS = [
  { label: "Utenti", href: "/gestione/utenti" },
  { label: "Coefficienti", href: "/gestione/coefficienti" },
];

export default function ManagementTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sezioni gestione"
      className="flex items-center gap-1 border-b pb-2"
    >
      {TAB_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
