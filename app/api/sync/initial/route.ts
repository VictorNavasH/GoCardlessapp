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
              account_id: internalAccountId, // UUID interno de la cuenta
              account_gocardless_id: account.id, // GoCardless ID de la cuenta
              transaction_id: tx.transactionId,
              end_to_end_id: tx.endToEndId,
              mandate_id: tx.mandateId,
              cheque_number: tx.chequeNumber,
              clearing_system_reference: tx.clearingSystemReference,
              booking_date: tx.bookingDate || tx.valueDate || new Date().toISOString().split("T")[0],
              value_date: tx.valueDate,
              amount: Number.parseFloat(tx.transactionAmount?.amount || "0"),
              currency: tx.transactionAmount?.currency || account.currency || "EUR",
              exchange_rate: tx.exchangeRate,
              original_amount: tx.originalAmount,
              original_currency: tx.originalCurrency,
              bank_transaction_code: tx.bankTransactionCode,
              proprietary_bank_transaction_code: tx.proprietaryBankTransactionCode,
              transaction_code: tx.transactionCode,
              creditor_name: tx.creditorName,
              creditor_account_iban: tx.creditorAccount?.iban,
              creditor_account_bban: tx.creditorAccount?.bban,
              creditor_agent_bic: tx.creditorAgent?.bic,
              creditor_agent_name: tx.creditorAgent?.name,
              creditor_id: tx.creditorId,
              ultimate_creditor: tx.ultimateCreditor,
              debtor_name: tx.debtorName,
              debtor_account_iban: tx.debtorAccount?.iban,
              debtor_account_bban: tx.debtorAccount?.bban,
              debtor_agent_bic: tx.debtorAgent?.bic,
              debtor_agent_name: tx.debtorAgent?.name,
              debtor_id: tx.debtorId,
              ultimate_debtor: tx.ultimateDebtor,
              remittance_information_unstructured: tx.remittanceInformationUnstructured || tx.additionalInformation,
              remittance_information_structured: tx.remittanceInformationStructured,
              additional_information: tx.additionalInformation,
              creditor_reference: tx.creditorReference,
              balance_after_transaction: tx.balanceAfterTransaction,
              purpose_code: tx.purposeCode,
              merchant_category_code: tx.merchantCategoryCode,
              entry_reference: tx.entryReference,
              additional_information_structured: tx.additionalInformationStructured,
              raw_data: tx, // Guardar datos completos para debugging
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
