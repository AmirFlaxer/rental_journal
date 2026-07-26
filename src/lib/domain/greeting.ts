// ברכת-הפתיחה של לוח-הבקרה. השם נשמר ב-user_metadata.name של Supabase והוא לא מובטח -
// חשבון שנפתח בלי שם קיים בהחלט. במקרה כזה הברכה חוזרת ל"שלום" נקי ולא ל"שלום משתמש".
export function greetingFor(name?: string | null): string {
  const firstName = (name ?? "").trim().split(/\s+/)[0];
  return firstName ? `שלום ${firstName}` : "שלום";
}
