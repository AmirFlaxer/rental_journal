import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
import { getReceivedAmount } from "@/lib/domain/partial-payment";
import type { PropertyWithLeases, Lease, Expense, Payment } from "@/types/database";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data: properties, error } = await supabase
      .from("properties")
      .select("*, leases(*, tenant:tenants(*)), expenses(*), payments(*)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });

    const propertyStats = (properties as PropertyWithLeases[] ?? []).map((p) => {
      // מסנן לפי תאריכים ולא רק status — חוזים ישנים שנשארו "active" לא נספרים
      const currentLeases = (p.leases ?? []).filter((l: Lease) => isLeaseCurrentlyActive(l));
      const monthlyRent = currentLeases.reduce((s, l) => s + l.monthly_rent, 0);
      const sortedLeases = [...(p.leases ?? [])].sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      );
      const lastMonthlyRent = sortedLeases.length > 0 ? sortedLeases[0].monthly_rent : 0;
      // מסנן הוצאות מס אוטומטיות (is_auto_tax) — המס מוצג בנפרד כשורת 10% בדוחות,
      // כך שלא ייספר פעמיים (גם כהוצאה וגם כחישוב 10%).
      const realExpenses = (p.expenses ?? []).filter((e) => !e.is_auto_tax);
      const totalExpenses = realExpenses.reduce((s, e) => s + e.amount, 0);
      // הכנסות = תקבולי שכ"ד בלבד (לא פיקדונות/החזרים), ובסכום שהתקבל בפועל -
      // תשלום חלקי נספר לפי מה ששולם, לא לפי amount הגולמי
      const totalPaid = (p.payments ?? [])
        .filter((pay) => pay.payment_type === "Rent")
        .reduce((s, pay) => s + getReceivedAmount({
          amount: pay.amount, status: pay.status, paid_date: pay.paid_date, notes: pay.notes,
          partial_paid_amount: pay.partial_paid_amount,
        }), 0);
      const totalPending = (p.payments ?? []).filter((pay) => !pay.paid_date && pay.payment_type === "Rent").reduce((s, pay) => s + pay.amount, 0);

      const expensesByCategory: Record<string, number> = {};
      for (const e of realExpenses) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      }

      return {
        id: p.id, title: p.title, city: p.city, property_type: p.property_type,
        active_leases: currentLeases.length, total_leases: (p.leases ?? []).length,
        monthly_rent: monthlyRent, last_monthly_rent: lastMonthlyRent, total_expenses: totalExpenses,
        total_paid: totalPaid, total_pending: totalPending,
        net_income: totalPaid - totalExpenses, expenses_by_category: expensesByCategory,
        leases: p.leases ?? [],
        expenses: realExpenses,
        payments: p.payments ?? [],
      };
    });

    const totals = {
      properties: properties?.length ?? 0,
      active_leases: propertyStats.reduce((s, p) => s + p.active_leases, 0),
      monthly_rent: propertyStats.reduce((s, p) => s + p.monthly_rent, 0),
      total_expenses: propertyStats.reduce((s, p) => s + p.total_expenses, 0),
      total_paid: propertyStats.reduce((s, p) => s + p.total_paid, 0),
      net_income: propertyStats.reduce((s, p) => s + p.net_income, 0),
    };

    const allPayments = (properties as PropertyWithLeases[] ?? []).flatMap((p) =>
      (p.payments ?? [])
        .filter((pay: Payment) => pay.payment_type === "Rent" && pay.paid_date)
        .map((pay) => ({ ...pay, property_title: p.title }))
    );
    const allExpenses = (properties as PropertyWithLeases[] ?? []).flatMap((p) =>
      (p.expenses ?? []).filter((e: Expense) => !e.is_auto_tax).map((e: Expense) => ({ ...e, property_title: p.title }))
    );

    const monthlyMap: Record<string, { income: number; expenses: number }> = {};
    for (const pay of allPayments) {
      // Group by due_date (the rent month) rather than paid_date (when it was recorded)
      const dateKey = pay.due_date || pay.paid_date;
      if (!dateKey) continue;
      const key = new Date(dateKey).toISOString().slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
      monthlyMap[key].income += getReceivedAmount({
        amount: pay.amount, status: pay.status, paid_date: pay.paid_date, notes: pay.notes,
        partial_paid_amount: pay.partial_paid_amount,
      });
    }
    for (const exp of allExpenses) {
      const key = new Date(exp.date).toISOString().slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
      monthlyMap[key].expenses += exp.amount;
    }

    const monthly = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, data]) => ({ month, ...data, net: data.income - data.expenses }));

    const expensesByCategory: Record<string, number> = {};
    for (const e of allExpenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    }

    return NextResponse.json({
      property_stats: propertyStats,
      totals,
      monthly,
      expenses_by_category: expensesByCategory,
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
