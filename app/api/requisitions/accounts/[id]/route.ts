import { type NextRequest, NextResponse } from "next/server"
import { gocardless, getSupabaseClient } from "@/lib/gocardless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requisitionId = params.id

    const requisition = await gocardless.getRequisition(requisitionId)

    if (!requisition.accounts || requisition.accounts.length === 0) {
      return NextResponse.json({
        requisition_id: requisitionId,
        accounts: [],
      })
    }

    const accountsWithDetails = await Promise.all(
      requisition.accounts.map(async (accountId: string) => {
        try {
          const [accountDetails, balances] = await Promise.all([
            gocardless.getAccount(accountId),
            gocardless.getAccountBalances(accountId),
          ])

          const supabase = getSupabaseClient()
          const { error: dbError } = await supabase.from("gocardless_accounts").upsert({
            gocardless_id: accountId,
            requisition_id: requisitionId,
            iban: accountDetails.iban,
            name: accountDetails.name || `Cuenta ${accountId.slice(-4)}`,
            currency: accountDetails.currency,
            balance: balances.balances?.[0]?.balanceAmount?.amount || "0",
            updated_at: new Date().toISOString(),
          })

          if (dbError) {
            console.error("[v0] Database error saving account:", dbError)
          }

          return {
            id: accountId,
            name: accountDetails.name || `Cuenta ${accountId.slice(-4)}`,
            iban: accountDetails.iban,
            balance: Number.parseFloat(balances.balances?.[0]?.balanceAmount?.amount || "0"),
            currency: accountDetails.currency || "EUR",
          }
        } catch (error) {
          console.error(`[v0] Error fetching account ${accountId}:`, error)
          return null
        }
      }),
    )

    const validAccounts = accountsWithDetails.filter((account) => account !== null)

    console.log("[v0] Retrieved accounts for requisition:", {
      requisitionId,
      accountCount: validAccounts.length,
    })

    return NextResponse.json({
      requisition_id: requisitionId,
      accounts: validAccounts,
    })
  } catch (error) {
    console.error("[v0] Error retrieving accounts:", error)
    return NextResponse.json({ error: "Failed to retrieve accounts" }, { status: 500 })
  }
}
