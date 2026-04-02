import MainNav from "@/components/main-nav";
import { getUserData } from "@/db/queries";
import { createClient } from "@/utils/supabase/server";

const MainNavServer = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return <MainNav user={null} role={null} />;
  }

  const userData = await getUserData();

  return <MainNav user={data.user} role={userData?.role ?? null} />;
};

export default MainNavServer;
