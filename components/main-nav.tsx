"use client";

import Logout from "@/components/logout";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

interface MainNavProps {
  user: User | null;
}

const MainNav = ({ user }: MainNavProps) => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  ];

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left side: Standard Nav for Medium+ screens */}
      <nav className="hidden sm:flex items-center space-x-6">
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

      {/* Left side: Mobile Menu Button for Small screens */}
      <div className="flex sm:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Apri menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="mb-4 border-b pb-4">
              {/* TODO: Add logo */}
              <SheetTitle className="text-left">Menu</SheetTitle>
              <SheetDescription className="text-left">
                Product Configurator
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col space-y-3">
              {routes.map((route) => (
                <SheetClose asChild key={route.href}>
                  <Link
                    href={route.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-base font-medium transition-colors hover:text-primary p-2 rounded-md",
                      route.active
                        ? "text-primary bg-muted"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}>
                    {route.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <p className="hidden xs:block text-sm text-muted-foreground">
            {user.email}
          </p>
        )}
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
