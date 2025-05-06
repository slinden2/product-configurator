import MainNav from "@/components/main-nav";
import { createClient } from "@/utils/supabase/server";
import React from "react";

const MainNavServer = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return <MainNav user={null} />;
  }

  return <MainNav user={data.user} />;
};

export default MainNavServer;
