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

    const today = new Date().toISOString().split("T")[0]
    const { data: rateLimits, error: rateLimitsError } = await supabase
      .from("gocardless_rate_limits")
      .select("*")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)

    if (rateLimitsError) {
      console.log("[v0] Error fetching rate limits:", rateLimitsError)
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
          apiCalls: {
            today: 0,
            remaining: 0,
            maxDaily: 4, // 4 requests por día por cuenta (límite oficial GoCardless)
            scopes: {
              details: { used: 0, remaining: 4 },
              balances: { used: 0, remaining: 4 },
              transactions: { used: 0, remaining: 4 },
            },
            strategy: "Sincronización Inteligente (3x/día)",
            schedule: "04:00 (completa), 12:00 (media), 21:00 (básica)",
            automaticCalls: 3, // 3 automáticos por día total
            manualCalls: 1, // 1 manual por día total
            hasRealData: false, // Indica si los datos provienen de la base de datos real
          },
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

    if (rateLimits && rateLimits.length > 0) {
      console.log("[v0] Processing", rateLimits.length, "rate limit records")

      bankGroups.forEach((bank) => {
        bank.apiCalls.hasRealData = true
        bank.apiCalls.today = 0
        bank.apiCalls.remaining = 0

        bank.accounts.forEach((account) => {
          const accountLimits = rateLimits.filter((limit) => limit.account_gocardless_id === account.gocardless_id)

          console.log("[v0] Found", accountLimits.length, "rate limits for account", account.gocardless_id)

          accountLimits.forEach((limit) => {
            const scope = limit.scope
            if (bank.apiCalls.scopes[scope]) {
              // Usar datos reales de la base de datos
              const used = (limit.requests_limit || 4) - (limit.requests_remaining || 4)
              bank.apiCalls.scopes[scope].used = used
              bank.apiCalls.scopes[scope].remaining = limit.requests_remaining || 4

              console.log("[v0] Scope", scope, "- Used:", used, "Remaining:", limit.requests_remaining)
            }
          })
        })

        // Calcular totales del banco basado en datos reales
        bank.apiCalls.today = Object.values(bank.apiCalls.scopes).reduce((sum, scope) => sum + scope.used, 0)
        bank.apiCalls.remaining = Object.values(bank.apiCalls.scopes).reduce((sum, scope) => sum + scope.remaining, 0)

        console.log(
          "[v0] Bank",
          bank.bankName,
          "- Total used today:",
          bank.apiCalls.today,
          "Remaining:",
          bank.apiCalls.remaining,
        )
      })
    } else {
      console.log("[v0] No rate limit data found for today, showing real state (no API calls recorded)")
      bankGroups.forEach((bank) => {
        bank.apiCalls.hasRealData = false
        console.log("[v0] Bank", bank.bankName, "- No API usage data available")
      })
    }

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
