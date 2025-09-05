import { type NextRequest, NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  console.log("[v0] ===== SYNC INITIAL ENDPOINT CALLED =====")
  console.log("[v0] POST request received at /api/sync/initial")
  console.log("[v0] Request method:", request.method)
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request headers:", Object.fromEntries(request.headers.entries()))
  console.log("[v0] Timestamp:", new Date().toISOString())

  try {
    console.log("[v0] Attempting to parse request body...")
    const { accounts } = await request.json()
    console.log("[v0] Request body parsed successfully")

    if (!accounts || !Array.isArray(accounts)) {
      console.error("[v0] Invalid accounts data received:", accounts)
      return NextResponse.json({ error: "Invalid accounts data" }, { status: 400 })
    }

    console.log("[v0] ===== STARTING INITIAL SYNC =====")
    console.log("[v0] Starting initial sync for accounts:", accounts.length)
    console.log(
      "[v0] Accounts to sync:",
      accounts.map((acc) => ({ id: acc.id, name: acc.name })),
    )

    const supabase = await createClient()
    let totalTransactions = 0
    const syncResults = []

    for (const account of accounts) {
      const accountResult = {
        accountId: account.id,
        accountName: account.name,
        success: false,
        transactionsFound: 0,
        transactionsSaved: 0,
        error: null,
      }

      try {
        console.log("[v0] ===== PROCESSING ACCOUNT =====")
        console.log("[v0] Syncing transactions for account:", account.id, account.name)

        console.log("[v0] Looking up account in database with gocardless_id:", account.id)
        const { data: accountData, error: accountError } = await supabase
          .from("gocardless_accounts")
          .select("id, gocardless_id, display_name")
          .eq("gocardless_id", account.id)
          .single()

        if (accountError || !accountData) {
          console.error("[v0] ❌ Failed to find account in database:", accountError)
          console.log("[v0] Available accounts in database:")
          const { data: allAccounts } = await supabase
            .from("gocardless_accounts")
            .select("id, gocardless_id, display_name")
          console.log("[v0] All accounts:", allAccounts)

          accountResult.error = `Account not found in database: ${accountError?.message || "Unknown error"}`
          syncResults.push(accountResult)
          continue
        }

        const internalAccountId = accountData.id
        console.log("[v0] ✅ Found account in database:")
        console.log("[v0] - Internal ID:", internalAccountId)
        console.log("[v0] - GoCardless ID:", accountData.gocardless_id)
        console.log("[v0] - Display Name:", accountData.display_name)

        console.log("[v0] ===== CALLING GOCARDLESS API =====")
        console.log("[v0] Calling gocardless.getAccountTransactions for:", account.id)

        const transactions = await gocardless.getAccountTransactions(account.id)

        console.log("[v0] ===== GOCARDLESS API RESPONSE =====")
        console.log("[v0] GoCardless response for account", account.id, ":")
        console.log("[v0] - Response type:", typeof transactions)
        console.log("[v0] - Is Array:", Array.isArray(transactions))
        console.log("[v0] - Length:", transactions?.length || 0)
        console.log("[v0] - Raw response:", JSON.stringify(transactions, null, 2))

        accountResult.transactionsFound = Array.isArray(transactions) ? transactions.length : 0

        if (!transactions) {
          console.log("[v0] ⚠️ GoCardless returned null/undefined for account", account.id)
          accountResult.error = "GoCardless returned null/undefined"
          syncResults.push(accountResult)
          continue
        }

        if (!Array.isArray(transactions)) {
          console.log("[v0] ⚠️ GoCardless returned non-array for account", account.id, ":", typeof transactions)
          accountResult.error = `GoCardless returned non-array: ${typeof transactions}`
          syncResults.push(accountResult)
          continue
        }

        if (transactions.length === 0) {
          console.log("[v0] ℹ️ No transactions found for account", account.id)
          accountResult.success = true
          syncResults.push(accountResult)
          continue
        }

        console.log("[v0] ===== PROCESSING TRANSACTIONS =====")
        console.log("[v0] Processing", transactions.length, "transactions for account", account.id)

        if (transactions.length > 0) {
          console.log("[v0] First transaction structure:", JSON.stringify(transactions[0], null, 2))
        }

        const transactionData = transactions.map((tx: any, index: number) => {
          console.log(`[v0] Processing transaction ${index + 1}/${transactions.length}:`)
          console.log(`[v0] - Transaction ID: ${tx.transactionId}`)
          console.log(`[v0] - Internal Transaction ID: ${tx.internalTransactionId}`)
          console.log(`[v0] - Amount: ${JSON.stringify(tx.transactionAmount)}`)
          console.log(`[v0] - Booking Date: ${tx.bookingDate}`)
          console.log(`[v0] - Value Date: ${tx.valueDate}`)
          console.log(`[v0] - Description: ${tx.remittanceInformationUnstructured || tx.additionalInformation}`)

          const mappedTransaction = {
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
            amount: tx.transactionAmount?.amount || "0",
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

          console.log(`[v0] Mapped transaction ${index + 1}:`, JSON.stringify(mappedTransaction, null, 2))
          return mappedTransaction
        })

        console.log("[v0] ===== SAVING TO DATABASE =====")
        console.log("[v0] Attempting to save", transactionData.length, "transactions to database")
        console.log("[v0] Sample transaction data:", JSON.stringify(transactionData[0], null, 2))

        const { data: insertedData, error: txError } = await supabase
          .from("gocardless_transactions")
          .upsert(transactionData, { onConflict: "gocardless_id" })
          .select()

        if (txError) {
          console.error("[v0] ❌ Error saving transactions for account", account.id, ":", txError)
          console.error("[v0] Error details:", JSON.stringify(txError, null, 2))
          console.error("[v0] Error code:", txError.code)
          console.error("[v0] Error message:", txError.message)
          console.error("[v0] Error hint:", txError.hint)
          accountResult.error = `Database error: ${txError.message}`
        } else {
          totalTransactions += transactionData.length
          accountResult.transactionsSaved = transactionData.length
          accountResult.success = true
          console.log("[v0] ✅ Successfully saved", transactionData.length, "transactions for account", account.id)
          console.log("[v0] Inserted data count:", insertedData?.length || 0)
          if (insertedData && insertedData.length > 0) {
            console.log("[v0] Sample inserted transaction:", JSON.stringify(insertedData[0], null, 2))
          }
        }

        syncResults.push(accountResult)
      } catch (error) {
        console.error("[v0] ❌ Error syncing account", account.id, ":", error)
        console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
        console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
        console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))

        accountResult.error = error instanceof Error ? error.message : String(error)
        syncResults.push(accountResult)
      }
    }

    console.log("[v0] ===== SYNC COMPLETED =====")
    console.log("[v0] Initial sync completed. Total transactions:", totalTransactions)
    console.log("[v0] Sync results:", JSON.stringify(syncResults, null, 2))

    const response = {
      success: true,
      accounts_processed: accounts.length,
      transactions_imported: totalTransactions,
      sync_started_at: new Date().toISOString(),
      detailed_results: syncResults,
    }

    console.log("[v0] Final response:", JSON.stringify(response, null, 2))
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] ❌ Initial sync failed:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("[v0] Error message:", error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        error: "Initial sync failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
