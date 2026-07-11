"use client";

import { LogOut } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import type React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MSG } from "@/lib/messages";

const Logout = () => {
  const [isPending, startTransition] = useTransition();

  const handleLogout = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await signOut();
      } catch (error) {
        // signOut() always ends in a redirect, which surfaces here as a Next
        // control-flow error. Rethrow it so the navigation proceeds — only a
        // genuine failure should reach the toast.
        unstable_rethrow(error);
        toast.error(MSG.toast.logoutError);
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
