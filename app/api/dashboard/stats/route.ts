import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    const [accountsResult, transactionsResult, institutionsResult, lastSyncResult] = await Promise.all([
      // Total accounts
      supabase
        .from("gocardless_accounts")
        .select("id", { count: "exact" })
        .eq("status", "ACTIVE"),

      // Total transactions
      supabase
        .from("gocardless_transactions")
        .select("id", { count: "exact" }),

      // Connected institutions (unique)
      supabase
        .from("gocardless_accounts")
        .select("institution_id")
        .eq("status", "ACTIVE"),

      // Last sync (most recent account update)
      supabase
        .from("gocardless_accounts")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1),
    ])

    if (accountsResult.error) {
      console.error("[v0] Error fetching accounts count:", accountsResult.error)
    }
    if (transactionsResult.error) {
      console.error("[v0] Error fetching transactions count:", transactionsResult.error)
    }

    const uniqueInstitutions = new Set(institutionsResult.data?.map((acc) => acc.institution_id) || []).size

    const stats = {
      totalAccounts: accountsResult.count || 0,
      totalTransactions: transactionsResult.count || 0,
      connectedInstitutions: uniqueInstitutions,
      lastSync: lastSyncResult.data?.[0]?.updated_at || new Date().toISOString(),
    }

    console.log("[v0] Dashboard stats calculated:", stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Error calculating dashboard stats:", error)

    const fallbackStats = {
      totalAccounts: 0,
      totalTransactions: 0,
      connectedInstitutions: 0,
      lastSync: new Date().toISOString(),
    }

    return NextResponse.json(fallbackStats)
  }
}
