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
          console.log(`[v0] Fetching transactions for account ${accountId}...`)
          const transactions = await gocardless.getAccountTransactions(accountId)

          console.log(
            `[v0] GoCardless returned ${transactions ? transactions.length : 0} transactions for account ${accountId}`,
          )
          console.log(`[v0] Raw transactions data:`, JSON.stringify(transactions, null, 2))

          if (transactions && Array.isArray(transactions) && transactions.length > 0) {
            console.log(`[v0] Processing ${transactions.length} transactions for database insert...`)

            const transactionData = transactions.map((tx, index) => {
              const mappedTx = {
                gocardless_id: tx.transactionId,
                account_id: account.id,
                account_gocardless_id: accountId,
                booking_date: tx.bookingDate,
                value_date: tx.valueDate,
                amount: tx.transactionAmount?.amount || "0",
                currency: tx.transactionAmount?.currency || "EUR",
                remittance_information_unstructured: tx.remittanceInformationUnstructured,
                remittance_information_structured: tx.remittanceInformationStructured,
                additional_information: tx.additionalInformation,
                bank_transaction_code: tx.bankTransactionCode,
                proprietary_bank_transaction_code: tx.proprietaryBankTransactionCode,
                end_to_end_id: tx.endToEndId,
                mandate_id: tx.mandateId,
                creditor_id: tx.creditorId,
                creditor_name: tx.creditorName,
                creditor_account_iban: tx.creditorAccount?.iban,
                creditor_account_bban: tx.creditorAccount?.bban,
                creditor_account_pan: tx.creditorAccount?.pan,
                creditor_account_masked_pan: tx.creditorAccount?.maskedPan,
                creditor_account_msisdn: tx.creditorAccount?.msisdn,
                creditor_account_currency: tx.creditorAccount?.currency,
                creditor_agent_bic: tx.creditorAgent?.bicFi,
                creditor_agent_name: tx.creditorAgent?.name,
                creditor_agent_address: tx.creditorAgent?.postalAddress,
                debtor_name: tx.debtorName,
                debtor_account_iban: tx.debtorAccount?.iban,
                debtor_account_bban: tx.debtorAccount?.bban,
                debtor_account_pan: tx.debtorAccount?.pan,
                debtor_account_masked_pan: tx.debtorAccount?.maskedPan,
                debtor_account_msisdn: tx.debtorAccount?.msisdn,
                debtor_account_currency: tx.debtorAccount?.currency,
                debtor_agent_bic: tx.debtorAgent?.bicFi,
                debtor_agent_name: tx.debtorAgent?.name,
                debtor_agent_address: tx.debtorAgent?.postalAddress,
                raw_data: tx,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              console.log(`[v0] Mapped transaction ${index + 1}:`, mappedTx)
              return mappedTx
            })

            console.log(`[v0] Inserting ${transactionData.length} transactions into database...`)
            const { data: insertResult, error: insertError } = await supabase
              .from("gocardless_transactions")
              .upsert(transactionData, { onConflict: "gocardless_id" })

            if (insertError) {
              console.error(`[v0] Database insert error:`, insertError)
              throw new Error(`Database insert failed: ${insertError.message}`)
            } else {
              console.log(`[v0] Successfully inserted transactions:`, insertResult)
            }
          } else {
            console.log(`[v0] No transactions returned from GoCardless for account ${accountId}`)
            console.log(`[v0] Transactions is array: ${Array.isArray(transactions)}`)
            console.log(`[v0] Transactions length: ${transactions ? transactions.length : "null/undefined"}`)
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
