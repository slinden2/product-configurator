"use client";

import Logout from "@/components/logout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/state/user-context";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const MainNav = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();

  const routes = [
    {
      label: "Home",
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Configurazioni",
      href: "/configurations",
      active: pathname === "/configurations",
    },
    {
      label: "Utenti",
      href: "/users",
      active: pathname === "/users",
    },
  ];

  return (
    <div className="flex items-center justify-between w-full">
      <nav className="flex items-center space-x-6">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              route.active
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            )}>
            {route.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center space-x-4">
        {user && <p className="text-sm text-muted-foreground">{user.email}</p>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme">
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        {user ? (
          <Logout />
        ) : (
          <Button asChild>
            <Link href="/signup">Registrati</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default MainNav;
