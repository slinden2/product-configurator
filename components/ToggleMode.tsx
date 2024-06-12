"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ToggleMode = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="outline" size="icon" disabled />;
  }

  const isDark = theme === "dark";

  return (
    <Button
      className="hover:text-primary"
      variant="outline"
      size="icon"
      onClick={() => setTheme(`${isDark ? "light" : "dark"}`)}>
      {isDark ? (
        <Sun className="hover:cursor-pointer" />
      ) : (
        <Moon className="hover:cursor-pointer" />
      )}
    </Button>
  );
};

export default ToggleMode;
