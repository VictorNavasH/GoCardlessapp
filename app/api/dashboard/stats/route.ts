import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const [accountsResult, transactionsResult, institutionsResult, lastSyncResult, requisitionsResult] =
      await Promise.all([
        supabase.from("gocardless_accounts").select("id", { count: "exact" }),

        // Total transactions
        supabase
          .from("gocardless_transactions")
          .select("id", { count: "exact" }),

        supabase.from("gocardless_accounts").select("institution_id"),

        // Last sync (most recent account update)
        supabase
          .from("gocardless_accounts")
          .select("updated_at")
          .order("updated_at", { ascending: false })
          .limit(1),

        supabase
          .from("gocardless_requisitions")
          .select("expires_at, created_at")
          .order("created_at", { ascending: false }),
      ])

    if (accountsResult.error) {
      console.error("[v0] Error fetching accounts count:", accountsResult.error)
    }
    if (transactionsResult.error) {
      console.error("[v0] Error fetching transactions count:", transactionsResult.error)
    }

    const uniqueInstitutions = new Set(institutionsResult.data?.map((acc) => acc.institution_id) || []).size

    const mostRecentRequisition = requisitionsResult.data?.[0]
    let daysUntilRenewal = 90
    if (mostRecentRequisition?.created_at) {
      const createdDate = new Date(mostRecentRequisition.created_at)
      const renewalDate = new Date(createdDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      const now = new Date()
      daysUntilRenewal = Math.max(0, Math.ceil((renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    }

    // Según documentación oficial: 10 requests/día por scope (details, balances, transactions) por cuenta
    const totalAccounts = accountsResult.count || 0
    const maxRequestsPerAccountPerScope = 10 // Límite oficial de GoCardless
    const scopes = 3 // details, balances, transactions
    const maxDailyRequestsPerAccount = maxRequestsPerAccountPerScope * scopes

    const stats = {
      totalAccounts: accountsResult.count || 0,
      totalTransactions: transactionsResult.count || 0,
      connectedInstitutions: uniqueInstitutions,
      lastSync: lastSyncResult.data?.[0]?.updated_at || new Date().toISOString(),
      daysUntilRenewal,
      rateLimit: {
        requestsPerAccountPerScope: maxRequestsPerAccountPerScope,
        scopes: ["details", "balances", "transactions"],
        totalAccountsConnected: totalAccounts,
        maxDailyRequestsPerAccount: maxDailyRequestsPerAccount,
        note: "Los límites se aplican por cuenta bancaria. Cada endpoint tiene su propio límite de 10 requests/día.",
      },
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
      daysUntilRenewal: 90,
      rateLimit: {
        requestsPerAccountPerScope: 10,
        scopes: ["details", "balances", "transactions"],
        totalAccountsConnected: 0,
        maxDailyRequestsPerAccount: 30,
        note: "Los límites se aplican por cuenta bancaria. Cada endpoint tiene su propio límite de 10 requests/día.",
      },
    }

    return NextResponse.json(fallbackStats)
  }
}
