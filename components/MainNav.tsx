import MainNavLinks from "@/components/MainNavLinks";
import ToggleMode from "@/components/ToggleMode";
import Link from "next/link";
import React from "react";
const MainNav = () => {
  return (
    <div className="flex justify-between">
      <MainNavLinks />
      <div className="flex items-center gap-2">
        <Link href="/">Logout</Link>
        <ToggleMode />
      </div>
    </div>
  );
};

export default MainNav;
