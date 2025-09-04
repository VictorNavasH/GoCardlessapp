import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: allAccounts, error: countError } = await supabase.from("gocardless_accounts").select("id, status")

    if (countError) {
      console.error("[v0] Error checking accounts:", countError)
      return NextResponse.json({ error: "Failed to check accounts" }, { status: 500 })
    }

    console.log("[v0] Total accounts in database:", allAccounts?.length || 0)
    console.log("[v0] Account statuses:", allAccounts?.map((a) => a.status) || [])

    const { data: accounts, error } = await supabase.from("gocardless_accounts").select(`
        *,
        gocardless_institutions (
          name,
          logo_url
        )
      `)

    if (error) {
      console.error("[v0] Database error fetching accounts:", error)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    console.log("[v0] Raw accounts fetched:", accounts?.length || 0)

    const transformedAccounts =
      accounts?.map((account) => ({
        id: account.gocardless_id || account.id,
        display_name: account.display_name || account.name || `Cuenta ${account.gocardless_id?.slice(-4)}`,
        iban: account.iban || "ES****",
        current_balance: Number.parseFloat(account.current_balance || account.balance_amount || "0"),
        currency: account.currency || "EUR",
        status: account.status || "ACTIVE",
        institution_name: account.gocardless_institutions?.name || "Unknown Bank",
        balance_last_updated_at: account.balance_last_updated_at || account.updated_at,
      })) || []

    const activeAccounts = transformedAccounts.filter((account) => account.status === "ACTIVE")

    console.log("[v0] Transformed accounts:", transformedAccounts.length)
    console.log("[v0] Active accounts:", activeAccounts.length)

    return NextResponse.json(activeAccounts)
  } catch (error) {
    console.error("[v0] Error fetching accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
