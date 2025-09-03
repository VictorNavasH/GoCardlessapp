import { type NextRequest, NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { accounts } = await request.json()

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: "Invalid accounts data" }, { status: 400 })
    }

    console.log("[v0] Starting initial sync for accounts:", accounts.length)

    const supabase = await createClient()
    let totalTransactions = 0

    for (const account of accounts) {
      try {
        console.log("[v0] Syncing transactions for account:", account.id)

        // Get transactions from GoCardless
        const transactions = await gocardless.getAccountTransactions(account.id)

        if (transactions && transactions.length > 0) {
          // Save transactions to Supabase
          const transactionData = transactions.map((tx: any) => ({
            gocardless_id: tx.transactionId,
            account_gocardless_id: account.id,
            amount: tx.transactionAmount?.amount || "0",
            currency: tx.transactionAmount?.currency || account.currency || "EUR",
            description: tx.remittanceInformationUnstructured || tx.additionalInformation || "Transaction",
            booking_date: tx.bookingDate,
            value_date: tx.valueDate,
            creditor_name: tx.creditorName,
            debtor_name: tx.debtorName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))

          const { error: txError } = await supabase
            .from("gocardless_transactions")
            .upsert(transactionData, { onConflict: "gocardless_id" })

          if (txError) {
            console.error("[v0] Error saving transactions for account", account.id, ":", txError)
          } else {
            totalTransactions += transactionData.length
            console.log("[v0] Saved", transactionData.length, "transactions for account", account.id)
          }
        }
      } catch (error) {
        console.error("[v0] Error syncing account", account.id, ":", error)
      }
    }

    console.log("[v0] Initial sync completed. Total transactions:", totalTransactions)

    return NextResponse.json({
      success: true,
      accounts_processed: accounts.length,
      transactions_imported: totalTransactions,
      sync_started_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Initial sync failed:", error)
    return NextResponse.json({ error: "Initial sync failed" }, { status: 500 })
  }
}
