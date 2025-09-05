import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { gocardless } from "@/lib/gocardless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = params.id
    console.log(`[v0] Fetching transactions for account: ${accountId}`)

    const supabase = await createServerClient()

    const { data: account, error: accountError } = await supabase
      .from("gocardless_accounts")
      .select("id, gocardless_id, display_name, currency")
      .eq("gocardless_id", accountId)
      .single()

    if (accountError || !account) {
      console.error("[v0] Account not found:", accountError)
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    console.log(`[v0] Found account with internal ID: ${account.id}, GoCardless ID: ${account.gocardless_id}`)

    const { data: localTransactions, error: localError } = await supabase
      .from("gocardless_transactions")
      .select("*")
      .eq("account_gocardless_id", accountId)
      .order("booking_date", { ascending: false })

    if (!localError && localTransactions && localTransactions.length > 0) {
      console.log(`[v0] Found ${localTransactions.length} transactions in local database`)

      const transformedTransactions = localTransactions.map((tx: any) => ({
        id: tx.gocardless_id,
        amount: Number.parseFloat(tx.amount || "0"),
        currency: tx.currency || account.currency,
        description: tx.remittance_information_unstructured || "Sin descripción",
        date: tx.booking_date || new Date().toISOString(),
        type: Number.parseFloat(tx.amount || "0") >= 0 ? "credit" : "debit",
        category: tx.bank_transaction_code || "General",
        reference: tx.transaction_id || tx.gocardless_id,
        creditorName: tx.creditor_name,
        debtorName: tx.debtor_name,
      }))

      return NextResponse.json({
        account: {
          id: accountId,
          display_name: account.display_name,
          currency: account.currency,
        },
        transactions: transformedTransactions,
        source: "local_database",
      })
    }

    try {
      const rawTransactions = await gocardless.getAccountTransactions(account.gocardless_id)
      console.log(`[v0] Raw transactions response:`, JSON.stringify(rawTransactions, null, 2))

      const bookedTransactions = rawTransactions?.transactions?.booked || []
      const pendingTransactions = rawTransactions?.transactions?.pending || []
      const allTransactions = [...bookedTransactions, ...pendingTransactions]

      console.log(`[v0] Booked transactions: ${bookedTransactions.length}`)
      console.log(`[v0] Pending transactions: ${pendingTransactions.length}`)
      console.log(`[v0] Total transactions: ${allTransactions.length}`)

      if (allTransactions.length > 0) {
        console.log(`[v0] Saving ${allTransactions.length} transactions to local database`)

        const transactionMap = new Map()

        const transactionsToSave = allTransactions
          .map((tx: any) => ({
            account_id: account.id, // UUID interno de la cuenta
            account_gocardless_id: account.gocardless_id, // GoCardless ID de la cuenta
            gocardless_id: tx.transactionId || tx.id,
            transaction_id: tx.transactionId || tx.id,
            entry_reference: tx.entryReference,
            end_to_end_id: tx.endToEndId,
            booking_date: tx.bookingDate || tx.valueDate,
            value_date: tx.valueDate,
            amount: tx.transactionAmount?.amount || tx.amount || "0",
            currency: tx.transactionAmount?.currency || tx.currency || account.currency,
            creditor_name: tx.creditorName,
            creditor_account_iban: tx.creditorAccount?.iban,
            debtor_name: tx.debtorName,
            debtor_account_iban: tx.debtorAccount?.iban,
            remittance_information_unstructured: tx.remittanceInformationUnstructured || tx.description,
            bank_transaction_code: tx.bankTransactionCode,
            proprietary_bank_transaction_code: tx.proprietaryBankTransactionCode,
            raw_data: tx,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          .filter((tx) => {
            // Keep only unique transactions by gocardless_id
            if (!transactionMap.has(tx.gocardless_id)) {
              transactionMap.set(tx.gocardless_id, true)
              return true
            }
            return false
          })

        console.log(`[v0] Deduplicated to ${transactionsToSave.length} unique transactions`)
        console.log(`[v0] Sample transaction to save:`, JSON.stringify(transactionsToSave[0], null, 2))
        console.log(`[v0] Account ID for transactions: ${account.id}`)
        console.log(`[v0] Account GoCardless ID: ${account.gocardless_id}`)

        try {
          console.log(`[v0] Starting upsert operation for ${transactionsToSave.length} transactions`)
          const { data: upsertData, error: saveError } = await supabase
            .from("gocardless_transactions")
            .upsert(transactionsToSave, {
              onConflict: "gocardless_id",
              ignoreDuplicates: false,
            })

          if (saveError) {
            console.error("[v0] Error saving transactions to database:", saveError)
            console.error("[v0] Error details:", JSON.stringify(saveError, null, 2))
          } else {
            console.log(`[v0] Successfully saved ${transactionsToSave.length} transactions to database`)
            console.log(`[v0] Upsert result:`, upsertData)

            const { data: verifyData, error: verifyError } = await supabase
              .from("gocardless_transactions")
              .select("id, gocardless_id, account_gocardless_id")
              .eq("account_gocardless_id", account.gocardless_id)
              .limit(5)

            if (verifyError) {
              console.error("[v0] Error verifying saved transactions:", verifyError)
            } else {
              console.log(
                `[v0] Verification: Found ${verifyData?.length || 0} transactions in database for this account`,
              )
              console.log(`[v0] Sample saved transactions:`, JSON.stringify(verifyData, null, 2))
            }
          }
        } catch (upsertError) {
          console.error("[v0] Exception during upsert:", upsertError)
        }
      }

      const transformedTransactions = allTransactions.map((tx: any) => ({
        id: tx.transactionId || tx.id,
        amount: Number.parseFloat(tx.transactionAmount?.amount || tx.amount || "0"),
        currency: tx.transactionAmount?.currency || tx.currency || account.currency,
        description: tx.remittanceInformationUnstructured || tx.description || "Sin descripción",
        date: tx.bookingDate || tx.valueDate || new Date().toISOString(),
        type: Number.parseFloat(tx.transactionAmount?.amount || tx.amount || "0") >= 0 ? "credit" : "debit",
        category: tx.proprietaryBankTransactionCode || "General",
        reference: tx.endToEndId || tx.transactionId || tx.id,
        creditorName: tx.creditorName,
        debtorName: tx.debtorName,
      }))

      console.log(`[v0] Transformed ${transformedTransactions.length} transactions`)

      return NextResponse.json({
        account: {
          id: accountId,
          display_name: account.display_name,
          currency: account.currency,
        },
        transactions: transformedTransactions,
        source: "gocardless_api_saved", // Indicar que se guardaron en la base de datos
      })
    } catch (gocardlessError: any) {
      if (gocardlessError.message && gocardlessError.message.includes("Rate limit exceeded")) {
        console.log("[v0] Rate limit exceeded, returning empty transactions with message")

        const resetTimeMatch = gocardlessError.message.match(/Try again in (\d+) seconds/)
        const resetTimeSeconds = resetTimeMatch ? Number.parseInt(resetTimeMatch[1]) : 86400
        const resetTimeHours = Math.ceil(resetTimeSeconds / 3600)

        return NextResponse.json({
          account: {
            id: accountId,
            display_name: account.display_name,
            currency: account.currency,
          },
          transactions: [],
          source: "rate_limited",
          message: `Se ha excedido el límite de consultas diarias de GoCardless. Las transacciones estarán disponibles en aproximadamente ${resetTimeHours} horas.`,
          rateLimitInfo: {
            exceeded: true,
            resetTimeSeconds: resetTimeSeconds,
            resetTimeHours: resetTimeHours,
          },
        })
      }

      console.error("[v0] GoCardless API error:", gocardlessError)
      return NextResponse.json(
        {
          account: {
            id: accountId,
            display_name: account.display_name,
            currency: account.currency,
          },
          transactions: [],
          source: "error",
          message: "Error al obtener transacciones de GoCardless. Inténtalo más tarde.",
          error: gocardlessError.message || "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Error fetching account transactions:", error)
    return NextResponse.json({ error: "Error fetching transactions" }, { status: 500 })
  }
}
