import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys } from "@/lib/supabase/case";

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

    const today = new Date();
    const todayMs = today.getTime();
    const propertyStats = (properties ?? []).map((p: any) => {
      // A lease counts toward "current monthly rent" only if:
      //   (1) its status is "active", AND
      //   (2) today falls within [start_date, end_date].
      // This protects against stale data where an old lease was never marked ended.
      const currentLeases = p.leases.filter((l: any) => {
        if (l.status !== "active") return false;
        const start = l.start_date ? new Date(l.start_date).getTime() : -Infinity;
        const end = l.end_date ? new Date(l.end_date).getTime() : Infinity;
        return start <= todayMs && todayMs <= end;
      });
      // Still expose the full list of active leases for counts/labels elsewhere.
      const activeLeases = p.leases.filter((l: any) => l.status === "active");
      const monthlyRent = currentLeases.reduce((s: number, l: any) => s + l.monthly_rent, 0);
      const totalExpenses = p.expenses.reduce((s: number, e: any) => s + e.amount, 0);
      const totalPaid = p.payments.filter((pay: any) => pay.paid_date).reduce((s: number, pay: any) => s + pay.amount, 0);
      const totalPending = p.payments.filter((pay: any) => !pay.paid_date && pay.payment_type === "Rent").reduce((s: number, pay: any) => s + pay.amount, 0);

      const expensesByCategory: Record<string, number> = {};
      for (const e of p.expenses) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      }

      return {
        id: p.id, title: p.title, city: p.city, propertyType: p.property_type,
        activeLeases: activeLeases.length, totalLeases: p.leases.length,
        monthlyRent, totalExpenses, totalPaid, totalPending,
        netIncome: totalPaid - totalExpenses, expensesByCategory,
        leases: camelKeys(p.leases) as any[],
        expenses: camelKeys(p.expenses) as any[],
        payments: camelKeys(p.payments) as any[],
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

    const allPayments = (properties ?? []).flatMap((p: any) =>
      p.payments.filter((pay: any) => pay.paid_date).map((pay: any) => ({ ...pay, propertyTitle: p.title }))
    );
    const allExpenses = (properties ?? []).flatMap((p: any) =>
      p.expenses.map((e: any) => ({ ...e, propertyTitle: p.title }))
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
