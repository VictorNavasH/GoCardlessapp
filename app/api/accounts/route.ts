import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data: accounts, error } = await supabase
      .from("gocardless_accounts")
      .select(`
        *,
        gocardless_institutions (
          name,
          logo
        )
      `)
      .eq("status", "ACTIVE")

    if (error) {
      console.error("[v0] Database error fetching accounts:", error)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    const transformedAccounts =
      accounts?.map((account) => ({
        id: account.gocardless_id,
        display_name: account.name || `Cuenta ${account.gocardless_id.slice(-4)}`,
        iban: account.iban || "ES****",
        current_balance: Number.parseFloat(account.balance_amount) || 0,
        currency: account.balance_currency || "EUR",
        status: account.status,
        institution_name: account.gocardless_institutions?.name || "Banco",
        balance_last_updated_at: account.updated_at,
      })) || []

    console.log("[v0] Fetched real accounts:", transformedAccounts.length)
    return NextResponse.json(transformedAccounts)
  } catch (error) {
    console.error("[v0] Error fetching accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
