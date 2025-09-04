import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { gocardless } from "@/lib/gocardless"
import { rateLimitManager, type SyncResult } from "@/lib/rate-limit-manager"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { scopes = ["transactions", "balances", "details"] } = await request.json()
    const accountId = params.id

    console.log(`[v0] Smart sync requested for account ${accountId} with scopes:`, scopes)

    const supabase = createServerClient()

    const { data: account, error: accountError } = await supabase
      .from("gocardless_accounts")
      .select("*")
      .eq("gocardless_id", accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const result: SyncResult = {
      accountId,
      success: true,
      syncedScopes: [],
      skippedScopes: [],
      remainingLimits: {},
      error: undefined,
    }

    const rateLimits = await rateLimitManager.checkMultipleScopes(accountId, scopes)

    const prioritizedScopes = scopes.sort((a, b) => {
      const priority = { transactions: 3, balances: 2, details: 1 }
      return (priority[b as keyof typeof priority] || 0) - (priority[a as keyof typeof priority] || 0)
    })

    for (const scope of prioritizedScopes) {
      const rateLimit = rateLimits[scope]
      result.remainingLimits[scope] = rateLimit.remaining

      if (!rateLimit.canRequest) {
        console.log(`[v0] Skipping ${scope} for account ${accountId}: no requests remaining (${rateLimit.remaining})`)
        result.skippedScopes.push(scope)
        continue
      }

      try {
        console.log(`[v0] Syncing ${scope} for account ${accountId}...`)

        if (scope === "details") {
          const accountDetails = await gocardless.getAccount(accountId)
          await supabase
            .from("gocardless_accounts")
            .update({
              display_name: accountDetails.name || account.display_name,
              iban: accountDetails.iban || account.iban,
              updated_at: new Date().toISOString(),
            })
            .eq("gocardless_id", accountId)
        }

        if (scope === "balances") {
          const balances = await gocardless.getAccountBalances(accountId)
          if (balances && balances.length > 0) {
            const currentBalance = balances.find((b) => b.balanceType === "expected") || balances[0]
            await supabase
              .from("gocardless_accounts")
              .update({
                current_balance: Number.parseFloat(currentBalance.balanceAmount.amount),
                balance_currency: currentBalance.balanceAmount.currency,
                updated_at: new Date().toISOString(),
              })
              .eq("gocardless_id", accountId)
          }
        }

        if (scope === "transactions") {
          const transactions = await gocardless.getAccountTransactions(accountId)
          if (transactions && Array.isArray(transactions) && transactions.length > 0) {
            const transactionData = transactions.map((tx) => ({
              gocardless_id: tx.transactionId,
              account_id: account.id,
              amount: Number.parseFloat(tx.transactionAmount?.amount || "0"),
              currency: tx.transactionAmount?.currency || "EUR",
              date: tx.bookingDate || tx.valueDate || new Date().toISOString().split("T")[0],
              description: tx.remittanceInformationUnstructured || tx.additionalInformation || "Transaction",
              reference: tx.endToEndId || tx.transactionId,
              created_at: new Date().toISOString(),
            }))

            await supabase.from("gocardless_transactions").upsert(transactionData, { onConflict: "gocardless_id" })
          }
        }

        await rateLimitManager.updateRateLimit(accountId, scope as any, rateLimit.remaining)
        result.syncedScopes.push(scope)
        result.remainingLimits[scope] = rateLimit.remaining - 1

        console.log(`[v0] Successfully synced ${scope} for account ${accountId}`)
      } catch (error) {
        console.error(`[v0] Error syncing ${scope} for account ${accountId}:`, error)
        result.skippedScopes.push(scope)
        if (!result.error) {
          result.error = `Failed to sync ${scope}: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      }
    }

    result.success = result.syncedScopes.length > 0

    await supabase.from("gocardless_sync_logs").insert({
      sync_type: "Manual Sync",
      scheduled_time: new Date().toTimeString().slice(0, 5), // HH:MM format
      executed_at: new Date().toISOString(),
      total_accounts: 1,
      successful_accounts: result.success ? 1 : 0,
      failed_accounts: result.success ? 0 : 1,
      results: JSON.stringify([
        {
          accountId: result.accountId,
          success: result.success,
          syncedScopes: result.syncedScopes,
          skippedScopes: result.skippedScopes,
          remainingLimits: result.remainingLimits,
          error: result.error,
        },
      ]),
    })

    console.log(`[v0] Smart sync completed for account ${accountId}:`, {
      synced: result.syncedScopes,
      skipped: result.skippedScopes,
      remaining: result.remainingLimits,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Smart sync error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
