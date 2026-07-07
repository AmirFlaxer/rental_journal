"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// cache משותף לכל דפי הדשבורד - ניווט בין מסכים לא טוען מחדש נתונים טריים.
// staleTime 60 שניות: נתונים נחשבים טריים לדקה; רענון ברקע אחרי מוטציות דרך invalidateQueries.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
