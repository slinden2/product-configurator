"use client";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
      <Button type="submit" variant="destructive" title="Esci">
        {loading ? <Spinner /> : "Esci"}
      </Button>
    </form>
  );
};

export default Logout;
