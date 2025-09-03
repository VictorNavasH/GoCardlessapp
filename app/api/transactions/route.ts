import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const accountId = searchParams.get("account_id")

    const supabase = await createClient()

    let query = supabase
      .from("gocardless_transactions")
      .select(`
        *,
        gocardless_accounts!inner(
          display_name,
          gocardless_institutions(name)
        )
      `)
      .order("booking_date", { ascending: false })
      .limit(limit)

    if (accountId) {
      query = query.eq("account_id", accountId)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedTransactions =
      transactions?.map((tx) => ({
        id: tx.id,
        amount: Number.parseFloat(tx.transaction_amount),
        currency: tx.currency,
        description: tx.remittance_information_unstructured || tx.creditor_name || "Transacción",
        date: tx.booking_date,
        type: Number.parseFloat(tx.transaction_amount) >= 0 ? "credit" : "debit",
        account_name: tx.gocardless_accounts?.display_name || "Cuenta",
        institution_name: tx.gocardless_accounts?.gocardless_institutions?.name || "Banco",
      })) || []

    return NextResponse.json(transformedTransactions)
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
