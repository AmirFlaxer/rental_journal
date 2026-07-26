"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// שם המשתמש כפי שנשמר ב-user_metadata.name של Supabase, לשימוש בסרגל-הצד ובברכה.
// מחזיר מחרוזת ריקה עד שהקריאה חוזרת, וגם בחשבון שנפתח בלי שם - הצרכן מחליט מה
// להציג במקרה הזה (הסרגל מציג "משתמש", הברכה חוזרת ל"שלום" נקי).
export function useUserName(): string {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.name as string | undefined;
      if (name) setUserName(name);
    });
  }, []);

  return userName;
}
