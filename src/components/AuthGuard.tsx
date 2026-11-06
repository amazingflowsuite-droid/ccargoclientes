"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/store";
import { AppUser } from "@/types";

const PUBLIC_PATHS = ["/login", "/definir-senha"];

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const isPublicRoute = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  useEffect(() => {
    const checkAuth = () => {
      const current = getAuthenticatedUser();
      setUser(current);
      setMounted(true);
      if (!current && !isPublicRoute) {
        router.replace("/login");
      }
    };

    checkAuth();
    window.addEventListener("ccargo-auth-changed", checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener("ccargo-auth-changed", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, [pathname, isPublicRoute, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-[#78716C]">
        Carregando ambiente comercial...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-[#78716C]">
        Redirecionando para autenticação...
      </div>
    );
  }

  return <>{children}</>;
};
