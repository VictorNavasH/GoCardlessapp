import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: rateLimits, error } = await supabase
      .from("gocardless_rate_limits")
      .select(`
        *,
        gocardless_accounts!inner(
          display_name,
          iban,
          gocardless_institutions!inner(
            name,
            logo_url,
            bic
          )
        )
      `)
      .eq("date", new Date().toISOString().split("T")[0])
      .order("remaining_calls", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching rate limits:", error)
      return NextResponse.json({ error: "Failed to fetch rate limits" }, { status: 500 })
    }

    const institutionLimits = {}
    rateLimits?.forEach((limit) => {
      const institution = limit.gocardless_accounts.gocardless_institutions.name
      if (!institutionLimits[institution]) {
        institutionLimits[institution] = {
          name: institution,
          logo: limit.gocardless_accounts.gocardless_institutions.logo_url,
          bic: limit.gocardless_accounts.gocardless_institutions.bic,
          accounts: [],
          totalRemaining: 0,
          canTest: false,
        }
      }

      institutionLimits[institution].accounts.push({
        displayName: limit.gocardless_accounts.display_name,
        iban: limit.gocardless_accounts.iban,
        scope: limit.scope,
        remaining: limit.remaining_calls,
        resetTime: limit.reset_time,
      })

      institutionLimits[institution].totalRemaining += limit.remaining_calls
      institutionLimits[institution].canTest = limit.remaining_calls >= 3 // Mínimo 3 requests para testing
    })

    return NextResponse.json({
      institutions: Object.values(institutionLimits),
      testingRecommendation: {
        maxRequestsPerTest: 3,
        recommendedOrder: ["CaixaBank", "BBVA", "Banco Sabadell"],
        waitBetweenTests: "24 hours",
      },
    })
  } catch (error) {
    console.error("[v0] Error in production test rate limits:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
