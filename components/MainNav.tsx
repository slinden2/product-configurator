import Link from "next/link";
import React from "react";

const MainNav = () => {
  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        <Link href="/">Home</Link>
        <Link href="/configurazioni">Configurazioni</Link>
        <Link href="/utenti">Utenti</Link>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/">Logout</Link>
        <Link href="/">Dark</Link>
      </div>
    </div>
  );
};

export default MainNav;
