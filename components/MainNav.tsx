import Logout from "@/components/Logout";
import MainNavLinks from "@/components/MainNavLinks";
import ToggleMode from "@/components/ToggleMode";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import React from "react";
const MainNav = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex justify-between">
      <MainNavLinks />
      <div className="flex items-center gap-2">
        {!user ? (
          <Link href="/login" className="ml-2 font-bold">
            <Button variant="default">Accedi</Button>
          </Link>
        ) : (
          <>
            <span>{user.email}</span>
            <Logout />
          </>
        )}

        <ToggleMode />
      </div>
    </div>
  );
};

export default MainNav;
