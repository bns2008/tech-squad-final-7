"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { seedSuperAdmin } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useStore();

  useEffect(() => {
    seedSuperAdmin();
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
