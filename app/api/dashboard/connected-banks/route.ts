import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Fetching connected banks information")

    const supabase = await createClient()

    const { data: accounts, error: accountsError } = await supabase
      .from("gocardless_accounts")
      .select(`
        id,
        gocardless_id,
        display_name,
        iban,
        status,
        current_balance,
        balance_currency,
        created_at,
        updated_at,
        gocardless_institutions (
          id,
          name,
          logo_url,
          bic
        ),
        gocardless_requisitions (
          id,
          gocardless_id,
          status,
          created_at,
          institution_id
        )
      `)
      .in("status", ["ACTIVE", "READY"])

    if (accountsError) {
      console.log("[v0] Error fetching accounts:", accountsError)
      throw accountsError
    }

    console.log("[v0] Found", accounts?.length || 0, "connected accounts")

    const bankGroups = new Map()

    accounts?.forEach((account) => {
      const bankId = account.gocardless_institutions?.id
      const bankName = account.gocardless_institutions?.name || "Banco Desconocido"

      if (!bankGroups.has(bankId)) {
        // Calcular días hasta renovación basado en la requisition más antigua de este banco
        const createdAt = new Date(account.gocardless_requisitions?.created_at || account.created_at)
        const expirationDate = new Date(createdAt)
        expirationDate.setDate(expirationDate.getDate() + 90) // GoCardless: 90 días de acceso

        const today = new Date()
        const daysUntilRenewal = Math.max(
          0,
          Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        )

        bankGroups.set(bankId, {
          bankId,
          bankName,
          logo: account.gocardless_institutions?.logo_url,
          bic: account.gocardless_institutions?.bic,
          accounts: [],
          totalBalance: 0,
          currency: account.balance_currency || "EUR",
          daysUntilRenewal,
          expirationDate: expirationDate.toISOString(),
          connectedAt: createdAt.toISOString(),
          status: "ACTIVE",
        })
      }

      const bank = bankGroups.get(bankId)
      bank.accounts.push({
        id: account.id,
        gocardless_id: account.gocardless_id,
        display_name: account.display_name,
        iban: account.iban,
        status: account.status,
        balance: account.current_balance || 0,
      })

      // Sumar balance total del banco
      bank.totalBalance += Number.parseFloat(account.current_balance || "0")

      // Actualizar estado del banco (si alguna cuenta está ACTIVE, el banco está ACTIVE)
      if (account.status === "ACTIVE") {
        bank.status = "ACTIVE"
      }
    })

    const connectedBanks = Array.from(bankGroups.values())

    console.log("[v0] Processed", connectedBanks.length, "connected banks")

    return NextResponse.json({
      connectedBanks,
      totalBanks: connectedBanks.length,
      totalAccounts: accounts?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching connected banks:", error)
    return NextResponse.json(
      {
        error: "Error fetching connected banks information",
        connectedBanks: [],
        totalBanks: 0,
        totalAccounts: 0,
      },
      { status: 500 },
    )
  }
}
