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
      .select("*")
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

    const accountIds = [...new Set(transactions?.map((tx) => tx.account_id).filter(Boolean))]

    let accountsData = []
    if (accountIds.length > 0) {
      const { data: accounts } = await supabase
        .from("gocardless_accounts")
        .select("id, display_name, institution_id")
        .in("id", accountIds)

      if (accounts) {
        const institutionIds = [...new Set(accounts.map((acc) => acc.institution_id).filter(Boolean))]

        let institutionsData = []
        if (institutionIds.length > 0) {
          const { data: institutions } = await supabase
            .from("gocardless_institutions")
            .select("id, name")
            .in("id", institutionIds)

          institutionsData = institutions || []
        }

        accountsData = accounts.map((acc) => ({
          ...acc,
          institution_name: institutionsData.find((inst) => inst.id === acc.institution_id)?.name || "Banco",
        }))
      }
    }

    // Transform data to match frontend interface
    const transformedTransactions =
      transactions?.map((tx) => {
        const account = accountsData.find((acc) => acc.id === tx.account_id)

        return {
          id: tx.id,
          amount: Number.parseFloat(tx.amount || "0"), // Corregido de transaction_amount a amount
          currency: tx.currency || "EUR",
          description: tx.remittance_information_unstructured || tx.creditor_name || "Transacción",
          date: tx.booking_date,
          type: Number.parseFloat(tx.amount || "0") >= 0 ? "credit" : "debit", // Corregido de transaction_amount a amount
          account_name: account?.display_name || "Cuenta",
          institution_name: account?.institution_name || "Banco",
        }
      }) || []

    return NextResponse.json(transformedTransactions)
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
