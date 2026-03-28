"use client";

import { ReactNode } from "react";

// Supabase auth is handled by middleware and server-side - no provider needed
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
