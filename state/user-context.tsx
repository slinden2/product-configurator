"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface UserProviderProps {
  children: ReactNode;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const defaultContextValue: UserContextType = {
  user: null,
  loading: false,
};

const UserContext = createContext<UserContextType>(defaultContextValue);

const supabase = createClient();

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // This flag helps ensure setLoading(false) happens only once after the initial check
    let initialCheckCompleted = false;

    // Fetch initial session *AND* listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      console.log(`Supabase auth event: ${event}`, session); // DEBUG
      setUser(session?.user ?? null);

      // Set loading to false after the first auth event is received (initial state determined)
      if (!initialCheckCompleted) {
        setLoading(false);
        initialCheckCompleted = true;
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
