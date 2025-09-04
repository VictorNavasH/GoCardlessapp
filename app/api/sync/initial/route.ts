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
    console.log(
      "[v0] Accounts to sync:",
      accounts.map((acc) => ({ id: acc.id, name: acc.name })),
    )

    const supabase = await createClient()
    let totalTransactions = 0

    for (const account of accounts) {
      try {
        console.log("[v0] Syncing transactions for account:", account.id)

        const { data: accountData, error: accountError } = await supabase
          .from("gocardless_accounts")
          .select("id")
          .eq("gocardless_id", account.id)
          .single()

        if (accountError || !accountData) {
          console.error("[v0] Failed to find account in database:", accountError)
          console.log("[v0] Skipping transactions for account:", account.id)
          continue
        }

        const internalAccountId = accountData.id
        console.log("[v0] Found internal account ID:", internalAccountId, "for GoCardless ID:", account.id)

        // Get transactions from GoCardless
        const transactions = await gocardless.getAccountTransactions(account.id)

        console.log("[v0] GoCardless response for account", account.id, ":")
        console.log("[v0] - Type:", typeof transactions)
        console.log("[v0] - Is Array:", Array.isArray(transactions))
        console.log("[v0] - Length:", transactions?.length || 0)

        if (transactions && Array.isArray(transactions) && transactions.length > 0) {
          console.log("[v0] - First transaction structure:", JSON.stringify(transactions[0], null, 2))
        }

        if (transactions && transactions.length > 0) {
          const transactionData = transactions.map((tx: any, index: number) => {
            console.log(`[v0] Processing transaction ${index + 1}:`, {
              transactionId: tx.transactionId,
              internalTransactionId: tx.internalTransactionId,
              amount: tx.transactionAmount,
              bookingDate: tx.bookingDate,
              valueDate: tx.valueDate,
              description: tx.remittanceInformationUnstructured || tx.additionalInformation,
            })

            return {
              gocardless_id: tx.transactionId || tx.internalTransactionId || `tx_${Date.now()}_${index}`,
              account_id: internalAccountId, // Usar el ID interno de la cuenta en lugar del GoCardless ID
              amount: Number.parseFloat(tx.transactionAmount?.amount || "0"),
              currency: tx.transactionAmount?.currency || account.currency || "EUR",
              date: tx.bookingDate || tx.valueDate || new Date().toISOString().split("T")[0],
              description: tx.remittanceInformationUnstructured || tx.additionalInformation || "Transaction",
              reference: tx.endToEndId || tx.transactionId || tx.internalTransactionId,
              creditor_name: tx.creditorName,
              debtor_name: tx.debtorName,
              created_at: new Date().toISOString(),
            }
          })

          console.log("[v0] Mapped transaction data:", transactionData.length, "transactions")
          console.log("[v0] Sample mapped transaction:", JSON.stringify(transactionData[0], null, 2))

          const { data: insertedData, error: txError } = await supabase
            .from("gocardless_transactions")
            .upsert(transactionData, { onConflict: "gocardless_id" })
            .select()

          if (txError) {
            console.error("[v0] Error saving transactions for account", account.id, ":", txError)
            console.error("[v0] Error details:", JSON.stringify(txError, null, 2))
          } else {
            totalTransactions += transactionData.length
            console.log("[v0] Successfully saved", transactionData.length, "transactions for account", account.id)
            console.log("[v0] Inserted data sample:", insertedData?.[0])
          }
        } else {
          console.log("[v0] No transactions found for account", account.id)
        }
      } catch (error) {
        console.error("[v0] Error syncing account", account.id, ":", error)
        console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
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
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Initial sync failed" }, { status: 500 })
  }
}
