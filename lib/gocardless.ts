import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const GOCARDLESS_BASE_URL = "https://bankaccountdata.gocardless.com"
const SECRET_ID = process.env.GOCARDLESS_SECRET_ID
const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY

interface GoCardlessToken {
  access: string
  access_expires: number
  refresh: string
  refresh_expires: number
}

interface RateLimitInfo {
  limit?: number
  remaining?: number
  reset?: number
  accountSuccessLimit?: number
  accountSuccessRemaining?: number
  accountSuccessReset?: number
}

class GoCardlessClient {
  private token: GoCardlessToken | null = null
  private rateLimitInfo: RateLimitInfo = {}

  async getAccessToken(): Promise<string> {
    if (!SECRET_ID || !SECRET_KEY) {
      throw new Error(
        "GoCardless credentials not configured. Check GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY environment variables.",
      )
    }

    // Check if current token is still valid
    if (this.token && Date.now() < this.token.access_expires * 1000) {
      return this.token.access
    }

    // Try to refresh token if we have a valid refresh token
    if (this.token && this.token.refresh && Date.now() < this.token.refresh_expires * 1000) {
      console.log("[v0] Refreshing GoCardless access token...")
      try {
        const refreshResponse = await fetch(`${GOCARDLESS_BASE_URL}/api/v2/token/refresh/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh: this.token.refresh,
          }),
        })

        if (refreshResponse.ok) {
          this.token = await refreshResponse.json()
          console.log("[v0] Access token refreshed successfully")
          return this.token.access
        } else {
          console.log("[v0] Token refresh failed, getting new token...")
        }
      } catch (error) {
        console.log("[v0] Token refresh error, getting new token:", error)
      }
    }

    // Get new token if refresh failed or no refresh token available
    console.log("[v0] Getting new GoCardless access token...")
    console.log("[v0] Using official GoCardless sandbox URL:", GOCARDLESS_BASE_URL)
    console.log("[v0] Secret ID configured:", !!SECRET_ID)
    console.log("[v0] Secret Key configured:", !!SECRET_KEY)

    const tokenUrl = `${GOCARDLESS_BASE_URL}/api/v2/token/new/`
    console.log("[v0] Token URL:", tokenUrl)

    const requestBody = {
      secret_id: SECRET_ID,
      secret_key: SECRET_KEY,
    }
    console.log("[v0] Request body prepared")

    try {
      console.log("[v0] Making fetch request...")
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] Fetch completed, response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Token request failed:", response.status, response.statusText, errorText)
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`)
      }

      this.token = await response.json()
      console.log("[v0] Access token obtained successfully")
      return this.token!.access
    } catch (error) {
      console.error("[v0] Fetch error details:", error)
      console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
      console.error("[v0] Error message:", error instanceof Error ? error.message : "Unknown error")
      throw error
    }
  }

  async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const token = await this.getAccessToken()

      console.log("[v0] Making GoCardless request to:", `${GOCARDLESS_BASE_URL}${endpoint}`)

      const response = await fetch(`${GOCARDLESS_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      if (response.status === 401) {
        console.log("[v0] Token expired, clearing cache and retrying...")
        this.token = null // Clear cached token

        // Retry with fresh token
        const newToken = await this.getAccessToken()
        const retryResponse = await fetch(`${GOCARDLESS_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        })

        if (!retryResponse.ok) {
          const errorText = await retryResponse.text()
          console.error(`[v0] GoCardless API Error after retry: ${retryResponse.status}`, errorText)
          throw new Error(`GoCardless API Error: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`)
        }

        const data = await retryResponse.json()
        console.log("[v0] GoCardless request successful after token refresh")
        return data
      }

      this.rateLimitInfo = {
        limit: response.headers.get("HTTP_X_RATELIMIT_LIMIT")
          ? Number.parseInt(response.headers.get("HTTP_X_RATELIMIT_LIMIT")!)
          : undefined,
        remaining: response.headers.get("HTTP_X_RATELIMIT_REMAINING")
          ? Number.parseInt(response.headers.get("HTTP_X_RATELIMIT_REMAINING")!)
          : undefined,
        reset: response.headers.get("HTTP_X_RATELIMIT_RESET")
          ? Number.parseInt(response.headers.get("HTTP_X_RATELIMIT_RESET")!)
          : undefined,
        accountSuccessLimit: response.headers.get("HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_LIMIT")
          ? Number.parseInt(response.headers.get("HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_LIMIT")!)
          : undefined,
        accountSuccessRemaining: response.headers.get("HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_REMAINING")
          ? Number.parseInt(response.headers.get("HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_REMAINING")!)
          : undefined,
        accountSuccessReset: response.headers.get("HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_RESET")
          ? Number.parseInt(response.headers.get("HTTP_X_RATELIMIT_ACCOUNT_SUCCESS_RESET")!)
          : undefined,
      }

      if (!response.ok) {
        if (response.status === 429) {
          const resetTime = this.rateLimitInfo.accountSuccessReset || this.rateLimitInfo.reset || 60
          console.error(`[v0] Rate limit exceeded. Try again in ${resetTime} seconds`)
          throw new Error(`Rate limit exceeded. Please try again in ${resetTime} seconds.`)
        }

        if (response.status === 400) {
          const errorText = await response.text()
          console.error(`[v0] Bad Request:`, errorText)
          throw new Error(`Invalid request: ${errorText}`)
        }

        if (response.status === 404) {
          throw new Error(`Resource not found`)
        }

        const errorText = await response.text()
        console.error(`[v0] GoCardless API Error: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`GoCardless API Error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log("[v0] GoCardless request successful")

      if (this.rateLimitInfo.remaining !== undefined) {
        console.log(`[v0] Rate limit remaining: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}`)
      }
      if (this.rateLimitInfo.accountSuccessRemaining !== undefined) {
        console.log(
          `[v0] Account success requests remaining: ${this.rateLimitInfo.accountSuccessRemaining}/${this.rateLimitInfo.accountSuccessLimit}`,
        )
      }

      return data
    } catch (error) {
      console.error("[v0] Request failed:", error)
      throw error
    }
  }

  async getInstitutions(country = "ES") {
    return this.makeRequest(`/api/v2/institutions/?country=${country}`)
  }

  async createEndUserAgreement(
    institutionId: string,
    options?: {
      maxHistoricalDays?: number
      accessValidForDays?: number
      accessScope?: string[]
    },
  ) {
    console.log("[v0] Creating End User Agreement for institution:", institutionId)

    const agreementData: any = {
      institution_id: institutionId,
    }

    // Only add custom terms if specified, otherwise use GoCardless defaults
    if (options?.maxHistoricalDays) {
      agreementData.max_historical_days = options.maxHistoricalDays
    }
    if (options?.accessValidForDays) {
      agreementData.access_valid_for_days = options.accessValidForDays
    }
    if (options?.accessScope) {
      agreementData.access_scope = options.accessScope
    }

    const result = await this.makeRequest("/api/v2/agreements/enduser/", {
      method: "POST",
      body: JSON.stringify(agreementData),
    })

    console.log("[v0] End User Agreement created:", {
      id: result.id,
      institution_id: result.institution_id,
      status: result.status,
    })

    return result
  }

  async createRequisition(
    institutionId: string,
    redirectUrl: string,
    options?: {
      reference?: string
      createAgreement?: boolean
      userLanguage?: string
      maxHistoricalDays?: number
      accessValidForDays?: number
      accessScope?: string[]
    },
  ) {
    const reference = options?.reference || `req_${Date.now()}`
    console.log("[v0] Creating requisition with reference:", reference)

    const finalInstitutionId =
      process.env.NODE_ENV === "development" || institutionId === "SANDBOX" ? "SANDBOXFINANCE_SFIN0000" : institutionId

    console.log("[v0] Using institution ID:", finalInstitutionId)

    const requisitionData: any = {
      redirect: redirectUrl,
      institution_id: finalInstitutionId,
      reference: reference,
      user_language: options?.userLanguage || "ES",
    }

    // IMPORTANT: Create End User Agreement only if custom terms are specified
    if (options?.createAgreement || options?.maxHistoricalDays || options?.accessValidForDays || options?.accessScope) {
      const agreementOptions = {
        maxHistoricalDays: options?.maxHistoricalDays || 90,
        accessValidForDays: options?.accessValidForDays || 90,
        accessScope: options?.accessScope || ["balances", "details", "transactions"],
      }

      const agreement = await this.createEndUserAgreement(finalInstitutionId, agreementOptions)
      requisitionData.agreement = agreement.id
      console.log("[v0] Using custom End User Agreement:", agreement.id)
    } else {
      // FOLLOW OFFICIAL RECOMMENDATION: No agreement = default terms
      console.log("[v0] Using default GoCardless terms (90 days history, 90 days access, full scope)")
    }

    const result = await this.makeRequest("/api/v2/requisitions/", {
      method: "POST",
      body: JSON.stringify(requisitionData),
    })

    console.log("[v0] GoCardless returned requisition:", {
      id: result.id,
      reference: result.reference,
      status: result.status,
      link: result.link,
      institution_id: result.institution_id,
    })

    return result
  }

  async getRequisition(requisitionId: string) {
    return this.makeRequest(`/api/v2/requisitions/${requisitionId}/`)
  }

  async getAccount(accountId: string) {
    const result = await this.makeRequest(`/api/v2/accounts/${accountId}/`)
    await this.saveRateLimitInfo(accountId, "details")
    return result
  }

  async getAccountBalances(accountId: string) {
    const result = await this.makeRequest(`/api/v2/accounts/${accountId}/balances/`)
    await this.saveRateLimitInfo(accountId, "balances")
    return result
  }

  async getAccountTransactions(accountId: string) {
    const result = await this.makeRequest(`/api/v2/accounts/${accountId}/transactions/`)
    await this.saveRateLimitInfo(accountId, "transactions")
    return result
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  private async saveRateLimitInfo(accountId: string, scope: string) {
    if (!this.rateLimitInfo.accountSuccessRemaining || !this.rateLimitInfo.accountSuccessLimit) {
      return // No hay información de rate limit para guardar
    }

    try {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()

      const resetTime = this.rateLimitInfo.accountSuccessReset
        ? new Date(Date.now() + this.rateLimitInfo.accountSuccessReset * 1000)
        : null

      await supabase.from("gocardless_rate_limits").upsert(
        {
          account_id: accountId,
          scope: scope,
          date: new Date().toISOString().split("T")[0],
          limit_per_day: this.rateLimitInfo.accountSuccessLimit,
          remaining_calls: this.rateLimitInfo.accountSuccessRemaining,
          reset_time: resetTime?.toISOString(),
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "account_id,scope,date",
        },
      )

      console.log(
        `[v0] Rate limit saved for account ${accountId}, scope ${scope}: ${this.rateLimitInfo.accountSuccessRemaining}/${this.rateLimitInfo.accountSuccessLimit}`,
      )
    } catch (error) {
      console.error("[v0] Error saving rate limit info:", error)
    }
  }
}

export const gocardless = new GoCardlessClient()

export function getSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}
