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
      .select("gocardless_id, display_name, currency")
      .eq("gocardless_id", accountId)
      .single()

    if (accountError || !account) {
      console.error("[v0] Account not found:", accountError)
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    console.log(`[v0] Found account with GoCardless ID: ${account.gocardless_id}`)

    const { data: localTransactions, error: localError } = await supabase
      .from("gocardless_transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("booking_date", { ascending: false })

    if (!localError && localTransactions && localTransactions.length > 0) {
      console.log(`[v0] Found ${localTransactions.length} transactions in local database`)

      const transformedTransactions = localTransactions.map((tx: any) => ({
        id: tx.gocardless_id,
        amount: Number.parseFloat(tx.amount || "0"),
        currency: tx.currency || account.currency,
        description: tx.description || "Sin descripción",
        date: tx.booking_date || new Date().toISOString(),
        type: Number.parseFloat(tx.amount || "0") >= 0 ? "credit" : "debit",
        category: tx.category || "General",
        reference: tx.reference || tx.gocardless_id,
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
      console.log(`[v0] Raw transactions response:`, rawTransactions)

      // Ensure we always have an array to work with
      const transactions = Array.isArray(rawTransactions) ? rawTransactions : []
      console.log(`[v0] Fetched ${transactions.length} transactions from GoCardless`)

      const transformedTransactions = transactions.map((tx: any) => ({
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
        source: "gocardless_api",
      })
    } catch (gocardlessError: any) {
      if (gocardlessError.message && gocardlessError.message.includes("Rate limit exceeded")) {
        console.log("[v0] Rate limit exceeded, returning empty transactions with message")
        return NextResponse.json({
          account: {
            id: accountId,
            display_name: account.display_name,
            currency: account.currency,
          },
          transactions: [],
          source: "rate_limited",
          message:
            "Se ha excedido el límite de consultas diarias de GoCardless. Las transacciones se sincronizarán automáticamente mañana.",
          rateLimitInfo: {
            exceeded: true,
            resetTime: "24 horas",
          },
        })
      }
      throw gocardlessError
    }
  } catch (error) {
    console.error("[v0] Error fetching account transactions:", error)
    return NextResponse.json({ error: "Error fetching transactions" }, { status: 500 })
  }
}
