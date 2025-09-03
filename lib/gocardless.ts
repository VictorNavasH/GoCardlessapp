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

    if (this.token && Date.now() < this.token.access_expires * 1000) {
      return this.token.access
    }

    console.log("[v0] Getting GoCardless access token...")
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
        const errorText = await response.text()

        if (response.status === 429) {
          const resetTime = this.rateLimitInfo.accountSuccessReset || this.rateLimitInfo.reset || 60
          console.error(`[v0] Rate limit exceeded. Try again in ${resetTime} seconds`)
          throw new Error(`Rate limit exceeded. Please try again in ${resetTime} seconds.`)
        }

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
    },
  ) {
    const reference = options?.reference || `req_${Date.now()}`
    console.log("[v0] Creating requisition with reference:", reference)

    // Use sandbox institution for testing environment
    const finalInstitutionId =
      process.env.NODE_ENV === "development" || institutionId === "SANDBOX" ? "SANDBOXFINANCE_SFIN0000" : institutionId

    console.log("[v0] Using institution ID:", finalInstitutionId)

    const requisitionData: any = {
      redirect: redirectUrl,
      institution_id: finalInstitutionId,
      reference: reference,
      user_language: options?.userLanguage || "ES",
    }

    // Only create agreement if explicitly requested (optional per GoCardless docs)
    if (options?.createAgreement) {
      const agreement = await this.createEndUserAgreement(finalInstitutionId)
      requisitionData.agreement = agreement.id
      console.log("[v0] Using custom End User Agreement:", agreement.id)
    } else {
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
    return this.makeRequest(`/api/v2/accounts/${accountId}/`)
  }

  async getAccountBalances(accountId: string) {
    return this.makeRequest(`/api/v2/accounts/${accountId}/balances/`)
  }

  async getAccountTransactions(accountId: string) {
    return this.makeRequest(`/api/v2/accounts/${accountId}/transactions/`)
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
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
