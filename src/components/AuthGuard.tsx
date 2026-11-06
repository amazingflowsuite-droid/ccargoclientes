"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/store";
import { AppUser } from "@/types";

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const current = getAuthenticatedUser();
      setUser(current);
      if (!current && pathname !== "/login") {
        router.replace("/login");
      } else {
        setChecked(true);
      }
    };

    checkAuth();
    window.addEventListener("ccargo-auth-changed", checkAuth);
    return () => window.removeEventListener("ccargo-auth-changed", checkAuth);
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!checked || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-[#78716C]">
        Verificando credenciais de acesso...
      </div>
    );
  }

  return <>{children}</>;
};

