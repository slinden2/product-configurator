"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface UserProviderProps {
  children: ReactNode;
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const defaultContextValue: UserContextType = {
  user: null,
  setUser: () => {},
  loading: false,
  setLoading: () => {},
};

const UserContext = createContext<UserContextType>(defaultContextValue);

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        setUser(null);
      } else {
        setUser(data.user);
      }

      setLoading(false);
    }

    getUser();
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser, loading, setLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  return useContext(UserContext);
};
