import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener rate limits de hoy para todas las cuentas
    const today = new Date().toISOString().split("T")[0]

    const { data: rateLimits, error } = await supabase
      .from("gocardless_rate_limits")
      .select(`
        *,
        gocardless_accounts!inner(
          gocardless_id,
          display_name,
          iban
        )
      `)
      .eq("date", today)
      .order("last_updated", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching rate limits:", error)
      return NextResponse.json({ error: "Failed to fetch rate limits" }, { status: 500 })
    }

    // Agrupar por cuenta y calcular totales
    const accountLimits = new Map()

    rateLimits?.forEach((limit) => {
      const accountId = limit.account_id
      if (!accountLimits.has(accountId)) {
        accountLimits.set(accountId, {
          account: limit.gocardless_accounts,
          scopes: {},
          totalRemaining: 0,
          totalLimit: 0,
        })
      }

      const account = accountLimits.get(accountId)
      account.scopes[limit.scope] = {
        remaining: limit.remaining_calls,
        limit: limit.limit_per_day,
        resetTime: limit.reset_time,
      }
      account.totalRemaining += limit.remaining_calls
      account.totalLimit += limit.limit_per_day
    })

    // Calcular estadísticas globales
    const totalAccountsWithLimits = accountLimits.size
    let totalRemainingCalls = 0
    let totalMaxCalls = 0

    accountLimits.forEach((account) => {
      totalRemainingCalls += account.totalRemaining
      totalMaxCalls += account.totalLimit
    })

    const response = {
      summary: {
        totalAccountsWithLimits,
        totalRemainingCalls,
        totalMaxCalls,
        utilizationPercentage:
          totalMaxCalls > 0 ? Math.round(((totalMaxCalls - totalRemainingCalls) / totalMaxCalls) * 100) : 0,
        date: today,
      },
      accounts: Array.from(accountLimits.values()),
      officialLimits: {
        currentLimit: 10,
        futureLimit: 4,
        scopes: ["details", "balances", "transactions"],
        note: "Límites por cuenta bancaria por scope por día",
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Rate limits API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
