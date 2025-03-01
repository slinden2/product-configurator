"use client";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LogOut } from "lucide-react";
import React from "react";

const Logout = () => {
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogout}>
      <Button type="submit" variant="destructive" size="sm" className="gap-2">
        <>
          {loading ? <Spinner /> : <LogOut className="h-4 w-4" />}
          <span>Esci</span>
        </>
      </Button>
    </form>
  );
};

export default Logout;
