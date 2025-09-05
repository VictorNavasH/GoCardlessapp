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
      .eq("account_gocardless_id", accountId) // Usando account_gocardless_id en lugar de account_id para buscar por GoCardless ID
      .order("booking_date", { ascending: false })

    if (!localError && localTransactions && localTransactions.length > 0) {
      console.log(`[v0] Found ${localTransactions.length} transactions in local database`)

      const transformedTransactions = localTransactions.map((tx: any) => ({
        id: tx.gocardless_id,
        amount: Number.parseFloat(tx.amount || "0"),
        currency: tx.currency || account.currency,
        description: tx.remittance_information_unstructured || "Sin descripción", // Usando campo correcto del esquema
        date: tx.booking_date || new Date().toISOString(),
        type: Number.parseFloat(tx.amount || "0") >= 0 ? "credit" : "debit",
        category: tx.bank_transaction_code || "General", // Usando campo correcto del esquema
        reference: tx.transaction_id || tx.gocardless_id, // Usando campo correcto del esquema
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

      // GoCardless devuelve: { transactions: { booked: [...], pending: [...] } }
      const bookedTransactions = rawTransactions?.transactions?.booked || []
      const pendingTransactions = rawTransactions?.transactions?.pending || []
      const allTransactions = [...bookedTransactions, ...pendingTransactions]

      console.log(`[v0] Booked transactions: ${bookedTransactions.length}`)
      console.log(`[v0] Pending transactions: ${pendingTransactions.length}`)
      console.log(`[v0] Total transactions: ${allTransactions.length}`)

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
        source: "gocardless_api",
      })
    } catch (gocardlessError: any) {
      if (gocardlessError.message && gocardlessError.message.includes("Rate limit exceeded")) {
        console.log("[v0] Rate limit exceeded, returning empty transactions with message")

        const resetTimeMatch = gocardlessError.message.match(/Try again in (\d+) seconds/)
        const resetTimeSeconds = resetTimeMatch ? Number.parseInt(resetTimeMatch[1]) : 86400 // Default to 24 hours
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
