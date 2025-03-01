import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import React from "react";

const useUser = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        console.log("User doesn't exist");
        setUser(null);
      } else {
        setUser(data.user);
      }

      setLoading(false);
    }

    getUser();
  }, []);

  return { user, loading };
};

export default useUser;
