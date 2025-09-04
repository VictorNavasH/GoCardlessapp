import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7")
    const accountId = searchParams.get("account_id")

    const supabase = await createClient()

    let accountsQuery = supabase.from("gocardless_accounts").select("id, current_balance, currency, display_name")

    if (accountId) {
      accountsQuery = accountsQuery.eq("id", accountId)
    }

    const { data: accounts, error: accountsError } = await accountsQuery

    if (accountsError) {
      console.error("[v0] Database error:", accountsError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([])
    }

    // Get transactions for the specified period
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const accountIds = accounts.map((acc) => acc.id)

    const { data: transactions, error: txError } = await supabase
      .from("gocardless_transactions")
      .select("booking_date, amount, currency, account_gocardless_id")
      .in("account_gocardless_id", accountIds)
      .gte("booking_date", startDate.toISOString().split("T")[0])
      .order("booking_date", { ascending: true })

    if (txError) {
      console.error("[v0] Transactions error:", txError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Calculate daily balances based on real transactions
    const balanceHistory = []
    const today = new Date()

    // Start with current balance and work backwards
    let runningBalance = accounts.reduce((sum, acc) => sum + Number.parseFloat(acc.current_balance), 0)

    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      // Get transactions for this specific date
      const dayTransactions = transactions?.filter((tx) => tx.booking_date === dateStr) || []

      // Calculate balance for this day
      const dayAmount = dayTransactions.reduce((sum, tx) => sum + Number.parseFloat(tx.amount), 0)

      balanceHistory.unshift({
        date: dateStr,
        balance: Math.max(0, runningBalance),
        currency: "EUR",
      })

      // Subtract this day's transactions to get previous day's balance
      runningBalance -= dayAmount
    }

    return NextResponse.json(balanceHistory)
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
