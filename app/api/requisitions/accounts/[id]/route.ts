import { type NextRequest, NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reference = params.id
    console.log("[v0] Accounts API called with reference:", reference)

    const supabase = await createClient()
    const { data: requisitionData, error: dbError } = await supabase
      .from("gocardless_requisitions")
      .select("id, gocardless_id")
      .eq("reference", reference)
      .single()

    if (dbError || !requisitionData) {
      console.error("[v0] Failed to find requisition in database:", dbError)
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    const gocardlessRequisitionId = requisitionData.gocardless_id
    const requisitionUuid = requisitionData.id
    console.log("[v0] Found GoCardless requisition ID:", gocardlessRequisitionId)
    console.log("[v0] Found requisition UUID:", requisitionUuid)

    const requisition = await gocardless.getRequisition(gocardlessRequisitionId)

    if (!requisition.accounts || requisition.accounts.length === 0) {
      return NextResponse.json({
        requisition_id: reference,
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

          console.log("[v0] Attempting to save account to database:", {
            gocardless_id: accountId,
            requisition_id: requisitionUuid,
            iban: accountDetails.iban,
            name: accountDetails.name || `Cuenta ${accountId.slice(-4)}`,
            currency: accountDetails.currency,
            balance: balances.balances?.[0]?.balanceAmount?.amount || "0",
          })

          console.log("[v0] About to execute upsert operation")
          console.log("[v0] Supabase client ready:", !!supabase)

          const { data: upsertData, error: dbError } = await supabase.from("gocardless_accounts").upsert({
            gocardless_id: accountId,
            requisition_id: requisitionUuid,
            iban: accountDetails.iban,
            name: accountDetails.name || `Cuenta ${accountId.slice(-4)}`,
            currency: accountDetails.currency,
            balance: balances.balances?.[0]?.balanceAmount?.amount || "0",
            status: "ACTIVE", // Añadiendo status explícito
            updated_at: new Date().toISOString(),
          })

          console.log("[v0] Upsert operation completed")
          console.log("[v0] Upsert result data:", upsertData)
          console.log("[v0] Upsert error:", dbError)

          if (dbError) {
            console.error("[v0] Database error saving account:", {
              error: dbError,
              code: dbError.code,
              message: dbError.message,
              details: dbError.details,
              hint: dbError.hint,
            })
            console.log("[v0] Checking if table exists...")
            const { data: tableCheck, error: tableError } = await supabase
              .from("gocardless_accounts")
              .select("count")
              .limit(1)
            console.log("[v0] Table check result:", { tableCheck, tableError })
          } else {
            console.log("[v0] Successfully saved account to database:", {
              accountId,
              upsertData,
              requisitionUuid,
            })

            const { data: verifyData, error: verifyError } = await supabase
              .from("gocardless_accounts")
              .select("*")
              .eq("gocardless_id", accountId)
              .single()
            console.log("[v0] Verification query result:", { verifyData, verifyError })
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
      reference,
      gocardlessRequisitionId,
      accountCount: validAccounts.length,
    })

    return NextResponse.json({
      requisition_id: reference,
      accounts: validAccounts,
    })
  } catch (error) {
    console.error("[v0] Error retrieving accounts:", error)
    return NextResponse.json({ error: "Failed to retrieve accounts" }, { status: 500 })
  }
}
