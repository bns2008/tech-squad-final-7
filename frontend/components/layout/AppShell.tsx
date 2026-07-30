"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { seedSuperAdmin } from "@/lib/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useStore();

  useEffect(() => {
    seedSuperAdmin();
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <>{children}</>;
}
