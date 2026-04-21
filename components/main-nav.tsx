"use client";

import type { User } from "@supabase/supabase-js";
import { Menu, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Logout from "@/components/logout";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

interface MainNavProps {
  user: User | null;
  role: Role | null;
}

const MainNav = ({ user, role }: MainNavProps) => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const routes = [
    {
      label: "Home",
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Configurazioni",
      href: "/configurazioni",
      active: pathname.startsWith("/configurazioni"),
    },
    ...(role === "ADMIN"
      ? [
          {
            label: "Gestione",
            href: "/gestione/utenti",
            active: pathname.startsWith("/gestione"),
          },
        ]
      : []),
  ];

  return (
    <div className="relative flex items-center justify-between w-full">
      {/* Desktop: Logo + Nav */}
      <div className="hidden sm:flex items-center gap-8">
        <Link href="/">
          <Image
            src="/iteco-logo.svg"
            alt="Iteco Logo"
            width={278}
            height={96}
            className="h-12 w-auto"
            loading="eager"
          />
        </Link>
        <nav className="flex items-center space-x-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                route.active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile: Hamburger (left) */}
      <div className="flex sm:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Apri menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="mb-4 border-b pb-4">
              <Image
                src="/iteco-logo.svg"
                alt="Iteco Logo"
                width={278}
                height={96}
                className="h-10 w-auto"
                loading="eager"
              />
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
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {route.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto border-t pt-4">
              {user ? (
                <Logout />
              ) : (
                <Button asChild className="w-full">
                  <Link href="/signup">Registrati</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile: Centered Logo */}
      <Link href="/" className="absolute left-1/2 -translate-x-1/2 sm:hidden">
        <Image
          src="/iteco-logo.svg"
          alt="Iteco Logo"
          width={278}
          height={96}
          className="h-10 w-auto"
          loading="eager"
        />
      </Link>

      <div className="flex items-center space-x-4">
        {user && (
          <p className="hidden md:block text-sm text-muted-foreground">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {mounted ? (
            resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          ) : (
            <span className="h-5 w-5" />
          )}
        </Button>
        <div className="hidden sm:block">
          {user ? (
            <Logout />
          ) : (
            <Button asChild>
              <Link href="/signup">Registrati</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainNav;
