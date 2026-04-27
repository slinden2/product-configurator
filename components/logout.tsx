"use client";

import { LogOut } from "lucide-react";
import type React from "react";
import { useTransition } from "react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const Logout = () => {
  const [isPending, startTransition] = useTransition();

  const handleLogout = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await signOut();
      } catch (error) {
        console.error("Logout failed: ", error);
      }
    });
  };

  return (
    <form onSubmit={handleLogout}>
      <Button type="submit" variant="destructive" size="sm" className="gap-2">
        {isPending ? <Spinner /> : <LogOut className="h-4 w-4" />}
        <span>Esci</span>
      </Button>
    </form>
  );
};

export default Logout;
