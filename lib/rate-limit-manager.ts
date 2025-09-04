import { createServerClient } from "@/lib/supabase/server"

export interface RateLimitInfo {
  canRequest: boolean
  remaining: number
  resetTime: Date | null
  scope: "details" | "balances" | "transactions"
}

export interface SyncResult {
  accountId: string
  success: boolean
  syncedScopes: string[]
  skippedScopes: string[]
  remainingLimits: Record<string, number>
  error?: string
}

class RateLimitManager {
  private cache = new Map<string, { data: any; expires: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutos

  async canMakeRequest(accountId: string, scope: "details" | "balances" | "transactions"): Promise<RateLimitInfo> {
    const cacheKey = `${accountId}-${scope}`
    const cached = this.cache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    const supabase = createServerClient()
    const today = new Date().toISOString().split("T")[0]

    const { data: rateLimitData, error } = await supabase
      .from("gocardless_rate_limits")
      .select("*")
      .eq("account_id", accountId)
      .eq("scope", scope)
      .eq("date", today)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching rate limit:", error)
      return { canRequest: false, remaining: 0, resetTime: null, scope }
    }

    const currentLimit = rateLimitData?.limit_per_day || 10
    const remaining = rateLimitData?.remaining_calls || currentLimit
    const resetTime = rateLimitData?.reset_time ? new Date(rateLimitData.reset_time) : null

    const result: RateLimitInfo = {
      canRequest: remaining > 0,
      remaining,
      resetTime,
      scope,
    }

    // Cache por 5 minutos
    this.cache.set(cacheKey, {
      data: result,
      expires: Date.now() + this.CACHE_TTL,
    })

    return result
  }

  async updateRateLimit(
    accountId: string,
    scope: "details" | "balances" | "transactions",
    remaining: number,
  ): Promise<void> {
    const supabase = createServerClient()
    const today = new Date().toISOString().split("T")[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    await supabase.from("gocardless_rate_limits").upsert({
      account_id: accountId,
      scope,
      date: today,
      limit_per_day: 10, // Límite actual, cambiar a 4 cuando GoCardless lo implemente
      remaining_calls: Math.max(0, remaining - 1),
      reset_time: tomorrow.toISOString(),
      last_updated: new Date().toISOString(),
    })

    // Limpiar cache
    this.cache.delete(`${accountId}-${scope}`)
  }

  async checkMultipleScopes(accountId: string, scopes: string[]): Promise<Record<string, RateLimitInfo>> {
    const results: Record<string, RateLimitInfo> = {}

    for (const scope of scopes) {
      results[scope] = await this.canMakeRequest(accountId, scope as any)
    }

    return results
  }

  getNextResetTime(): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }
}

export const rateLimitManager = new RateLimitManager()
