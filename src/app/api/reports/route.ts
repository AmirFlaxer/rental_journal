import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys } from "@/lib/supabase/case";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
import type { PropertyRow, LeaseRow, ExpenseRow, PaymentRow } from "@/types/database";

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const propertyStats = (properties as PropertyRow[] ?? []).map((p) => {
      // מסנן לפי תאריכים ולא רק status — חוזים ישנים שנשארו "active" לא נספרים
      const currentLeases = (p.leases ?? []).filter((l: LeaseRow) => isLeaseCurrentlyActive(l));
      const monthlyRent = currentLeases.reduce((s, l) => s + l.monthly_rent, 0);
      const totalExpenses = (p.expenses ?? []).reduce((s, e) => s + e.amount, 0);
      const totalPaid = (p.payments ?? []).filter((pay) => pay.paid_date).reduce((s, pay) => s + pay.amount, 0);
      const totalPending = (p.payments ?? []).filter((pay) => !pay.paid_date && pay.payment_type === "Rent").reduce((s, pay) => s + pay.amount, 0);

      const expensesByCategory: Record<string, number> = {};
      for (const e of (p.expenses ?? [])) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      }

      return {
        id: p.id, title: p.title, city: p.city, propertyType: p.property_type,
        activeLeases: currentLeases.length, totalLeases: (p.leases ?? []).length,
        monthlyRent, totalExpenses, totalPaid, totalPending,
        netIncome: totalPaid - totalExpenses, expensesByCategory,
        leases: camelKeys(p.leases) as unknown[],
        expenses: camelKeys(p.expenses) as unknown[],
        payments: camelKeys(p.payments) as unknown[],
      };
    });

    const totals = {
      properties: properties?.length ?? 0,
      activeLeases: propertyStats.reduce((s, p) => s + p.activeLeases, 0),
      monthlyRent: propertyStats.reduce((s, p) => s + p.monthlyRent, 0),
      totalExpenses: propertyStats.reduce((s, p) => s + p.totalExpenses, 0),
      totalPaid: propertyStats.reduce((s, p) => s + p.totalPaid, 0),
      netIncome: propertyStats.reduce((s, p) => s + p.netIncome, 0),
    };

    const allPayments = (properties as PropertyRow[] ?? []).flatMap((p) =>
      (p.payments ?? []).filter((pay: PaymentRow) => pay.paid_date).map((pay) => ({ ...pay, propertyTitle: p.title }))
    );
    const allExpenses = (properties as PropertyRow[] ?? []).flatMap((p) =>
      (p.expenses ?? []).map((e: ExpenseRow) => ({ ...e, propertyTitle: p.title }))
    );

    const monthlyMap: Record<string, { income: number; expenses: number }> = {};
    for (const pay of allPayments) {
      // Group by due_date (the rent month) rather than paid_date (when it was recorded)
      const dateKey = pay.due_date || pay.paid_date;
      const key = new Date(dateKey).toISOString().slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
      monthlyMap[key].income += pay.amount;
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

    return NextResponse.json({ propertyStats, totals, monthly, expensesByCategory });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
