import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const [
      accountsResult,
      transactionsResult,
      institutionsResult,
      lastSyncResult,
      requisitionsResult,
      rateLimitsResult,
      syncLogsResult,
      balanceHistoryResult,
    ] = await Promise.all([
      supabase.from("gocardless_accounts").select("id", { count: "exact" }),
      supabase.from("gocardless_transactions").select("id", { count: "exact" }),
      supabase.from("gocardless_accounts").select("institution_id"),
      supabase.from("gocardless_accounts").select("updated_at").order("updated_at", { ascending: false }).limit(1),
      supabase
        .from("gocardless_requisitions")
        .select("id, expires_at, created_at, status")
        .eq("status", "LN")
        .order("created_at", { ascending: false }),
      supabase.from("gocardless_rate_limits").select("*").eq("date", new Date().toISOString().split("T")[0]),
      supabase.from("gocardless_sync_logs").select("*").order("executed_at", { ascending: false }).limit(10),
      supabase
        .from("gocardless_accounts")
        .select("current_balance, balance_last_updated_at, gocardless_id")
        .not("current_balance", "is", null),
    ])

    if (accountsResult.error) {
      console.error("[v0] Error fetching accounts count:", accountsResult.error)
    }
    if (transactionsResult.error) {
      console.error("[v0] Error fetching transactions count:", transactionsResult.error)
    }

    const uniqueInstitutions = new Set(institutionsResult.data?.map((acc) => acc.institution_id) || []).size

    let daysUntilRenewal = 90
    let nextRenewalBank = null
    if (requisitionsResult.data && requisitionsResult.data.length > 0) {
      let earliestRenewal = null

      for (const requisition of requisitionsResult.data) {
        const createdDate = new Date(requisition.created_at)
        const renewalDate = new Date(createdDate.getTime() + 90 * 24 * 60 * 60 * 1000)

        if (!earliestRenewal || renewalDate < earliestRenewal.date) {
          earliestRenewal = { date: renewalDate, requisition }
        }
      }

      if (earliestRenewal) {
        const now = new Date()
        daysUntilRenewal = Math.max(
          0,
          Math.ceil((earliestRenewal.date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        )
        nextRenewalBank = `Requisition ${earliestRenewal.requisition.id.substring(0, 8)}`
      }
    }

    const todayRateLimits = rateLimitsResult.data || []
    const totalCallsToday = todayRateLimits.reduce((sum, rl) => sum + (rl.limit_per_day - rl.remaining_calls), 0)
    const totalRemainingCalls = todayRateLimits.reduce((sum, rl) => sum + rl.remaining_calls, 0)

    const balanceEvolution =
      balanceHistoryResult.data?.map((account) => ({
        accountId: account.gocardless_id,
        currentBalance: account.current_balance,
        lastUpdated: account.balance_last_updated_at,
      })) || []

    const recentSyncs =
      syncLogsResult.data?.slice(0, 5).map((sync) => ({
        type: sync.sync_type,
        executedAt: sync.executed_at,
        totalAccounts: sync.total_accounts,
        successfulAccounts: sync.successful_accounts,
        failedAccounts: sync.failed_accounts,
      })) || []

    const totalAccounts = accountsResult.count || 0
    const maxRequestsPerAccountPerScope = 10
    const scopes = ["details", "balances", "transactions"]
    const maxDailyRequestsPerAccount = maxRequestsPerAccountPerScope * scopes.length

    const stats = {
      totalAccounts,
      totalTransactions: transactionsResult.count || 0,
      connectedInstitutions: uniqueInstitutions,
      lastSync: lastSyncResult.data?.[0]?.updated_at || new Date().toISOString(),
      daysUntilRenewal,
      nextRenewalBank,
      rateLimit: {
        requestsPerAccountPerScope: maxRequestsPerAccountPerScope,
        scopes,
        totalAccountsConnected: totalAccounts,
        maxDailyRequestsPerAccount,
        callsToday: totalCallsToday,
        remainingCallsToday: totalRemainingCalls,
        accountsWithLimits: todayRateLimits.length,
        note: "Los límites se aplican por cuenta bancaria. Cada endpoint tiene su propio límite de 10 requests/día.",
      },
      balanceEvolution: {
        accounts: balanceEvolution,
        totalAccountsWithBalance: balanceEvolution.length,
        lastBalanceUpdate:
          balanceEvolution.length > 0
            ? Math.max(...balanceEvolution.map((b) => new Date(b.lastUpdated || 0).getTime()))
            : null,
      },
      syncHistory: {
        recentSyncs,
        totalSyncs: syncLogsResult.count || 0,
        lastSyncType: recentSyncs[0]?.type || null,
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
