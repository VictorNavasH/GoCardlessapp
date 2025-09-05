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

          const processedTx = { ...tx }

          // Detectar si es formato CaixaBank/Sabadell (campos principales vacíos pero raw_data presente)
          const isCaixaBankFormat =
            !tx.creditorName &&
            !tx.debtorName &&
            !tx.remittanceInformationUnstructured &&
            (tx.raw_data || (typeof tx === "object" && tx.remittanceInformationUnstructuredArray))

          if (isCaixaBankFormat) {
            console.log(`[v0] Detected CaixaBank/Sabadell format for transaction ${index + 1}, processing raw_data`)

            try {
              // Si raw_data es string, parsearlo; si no, usar el objeto directamente
              let rawData = tx.raw_data
              if (typeof rawData === "string") {
                rawData = JSON.parse(rawData)
              } else if (!rawData && tx.remittanceInformationUnstructuredArray) {
                // Usar datos directos del objeto si no hay raw_data
                rawData = tx
              }

              // Extraer descripción de remittanceInformationUnstructuredArray
              if (
                rawData?.remittanceInformationUnstructuredArray &&
                Array.isArray(rawData.remittanceInformationUnstructuredArray)
              ) {
                processedTx.remittanceInformationUnstructured = rawData.remittanceInformationUnstructuredArray.join(" ")
                console.log(`[v0] Extracted description: ${processedTx.remittanceInformationUnstructured}`)
              }

              // Extraer otros campos útiles del raw_data
              if (rawData?.creditorName) processedTx.creditorName = rawData.creditorName
              if (rawData?.debtorName) processedTx.debtorName = rawData.debtorName
              if (rawData?.ultimateCreditor) processedTx.ultimateCreditor = rawData.ultimateCreditor
              if (rawData?.ultimateDebtor) processedTx.ultimateDebtor = rawData.ultimateDebtor
              if (rawData?.creditorAccount?.iban) {
                processedTx.creditorAccount = { iban: rawData.creditorAccount.iban }
              }
              if (rawData?.debtorAccount?.iban) {
                processedTx.debtorAccount = { iban: rawData.debtorAccount.iban }
              }
              if (rawData?.mandateId) processedTx.mandateId = rawData.mandateId
              if (rawData?.creditorId) processedTx.creditorId = rawData.creditorId
              if (rawData?.endToEndId) processedTx.endToEndId = rawData.endToEndId

              console.log(`[v0] Enhanced transaction data:`, JSON.stringify(processedTx, null, 2))
            } catch (parseError) {
              console.error(`[v0] Error processing CaixaBank/Sabadell format for transaction ${index + 1}:`, parseError)
            }
          }

          const mappedTransaction = {
            gocardless_id:
              processedTx.transactionId || processedTx.internalTransactionId || `tx_${Date.now()}_${index}`,
            account_id: internalAccountId, // UUID interno de la cuenta
            account_gocardless_id: account.id, // GoCardless ID de la cuenta
            transaction_id: processedTx.transactionId,
            end_to_end_id: processedTx.endToEndId,
            mandate_id: processedTx.mandateId,
            cheque_number: processedTx.chequeNumber,
            clearing_system_reference: processedTx.clearingSystemReference,
            booking_date: processedTx.bookingDate || processedTx.valueDate || new Date().toISOString().split("T")[0],
            value_date: processedTx.valueDate,
            amount: processedTx.transactionAmount?.amount || "0",
            currency: processedTx.transactionAmount?.currency || account.currency || "EUR",
            exchange_rate: processedTx.exchangeRate,
            original_amount: processedTx.originalAmount,
            original_currency: processedTx.originalCurrency,
            bank_transaction_code: processedTx.bankTransactionCode,
            proprietary_bank_transaction_code: processedTx.proprietaryBankTransactionCode,
            transaction_code: processedTx.transactionCode,
            creditor_name: processedTx.creditorName,
            creditor_account_iban: processedTx.creditorAccount?.iban,
            creditor_account_bban: processedTx.creditorAccount?.bban,
            creditor_agent_bic: processedTx.creditorAgent?.bic,
            creditor_agent_name: processedTx.creditorAgent?.name,
            creditor_id: processedTx.creditorId,
            ultimate_creditor: processedTx.ultimateCreditor,
            debtor_name: processedTx.debtorName,
            debtor_account_iban: processedTx.debtorAccount?.iban,
            debtor_account_bban: processedTx.debtorAccount?.bban,
            debtor_agent_bic: processedTx.debtorAgent?.bic,
            debtor_agent_name: processedTx.debtorAgent?.name,
            debtor_id: processedTx.debtorId,
            ultimate_debtor: processedTx.ultimateDebtor,
            remittance_information_unstructured:
              processedTx.remittanceInformationUnstructured || processedTx.additionalInformation,
            remittance_information_structured: processedTx.remittanceInformationStructured,
            additional_information: processedTx.additionalInformation,
            creditor_reference: processedTx.creditorReference,
            balance_after_transaction: processedTx.balanceAfterTransaction,
            purpose_code: processedTx.purposeCode,
            merchant_category_code: processedTx.merchantCategoryCode,
            entry_reference: processedTx.entryReference,
            additional_information_structured: processedTx.additionalInformationStructured,
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
