import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * תשתית freemium - מוכנה מראש אך כבויה (ראו ENFORCE_QUOTA למטה).
 * תוכנן ב-SPEC.md (2026-06-29): 2 נכסים חינם, מעבר לכך חסום בעתיד כשיעלה מודל תשלום.
 * עקרון: לא לנעול/לדרוס נתונים קיימים - רק הוספת נכס חדש מעבר למכסה תיחסם.
 */

export type Plan = "free" | "pro";

/** מכסת נכסים בתוכנית החינמית */
export const FREE_PROPERTY_LIMIT = 2;

// מתג ראשי - כבוי כרגע. יופעל (true) רק כשמודל התשלום בפועל יעלה (ראו SPEC.md
// "אסטרטגיית מונטיזציה"); עד אז כל הפונקציות כאן קיימות אך לא חוסמות כלום.
export const ENFORCE_QUOTA = false;

/**
 * מחזיר את תוכנית המשתמש (free/pro) לפי טבלת subscriptions.
 * "free" הוא ברירת המחדל - גם כשאין רשומה בכלל, וגם כשה-status אינו active.
 * הטבלה עשויה עדיין לא להתקיים בפרודקשן (המיגרציה מורצת ידנית) - כל שגיאה
 * (כולל "relation does not exist") נתפסת ומחזירה "free", כדי לא לשבור כלום.
 */
export async function getPlan(userId: string, supabase?: SupabaseClient): Promise<Plan> {
  try {
    const client = supabase ?? supabaseAdmin;
    const { data, error } = await client
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return "free";
    if (data.status !== "active") return "free";
    return data.plan === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

/**
 * בודק האם המשתמש חורג ממכסת הנכסים של התוכנית החינמית.
 * תוכנית pro - ללא הגבלה. כשה-ENFORCE_QUOTA כבוי, מחזיר תמיד false (no-op).
 */
export async function isOverPropertyQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (!ENFORCE_QUOTA) return false;

  const plan = await getPlan(userId, supabase);
  if (plan === "pro") return false;

  const { count, error } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return false;
  return (count ?? 0) >= FREE_PROPERTY_LIMIT;
}
