import { createServerClient } from "@/lib/supabase/server"
import { rateLimitManager } from "@/lib/rate-limit-manager"

export interface ScheduledSyncConfig {
  time: string // HH:MM format
  scopes: string[]
  name: string
}

export const SYNC_SCHEDULES: ScheduledSyncConfig[] = [
  {
    time: "04:00",
    scopes: ["details", "balances", "transactions"],
    name: "Full Sync",
  },
  {
    time: "12:00",
    scopes: ["balances", "transactions"],
    name: "Medium Sync",
  },
  {
    time: "21:00",
    scopes: ["transactions"],
    name: "Basic Sync",
  },
]

class SchedulerService {
  async executeScheduledSync(config: ScheduledSyncConfig): Promise<void> {
    console.log(`[v0] Starting ${config.name} at ${config.time}...`)

    const supabase = createServerClient()

    // Obtener todas las cuentas activas
    const { data: accounts, error } = await supabase
      .from("gocardless_accounts")
      .select("gocardless_id, display_name")
      .eq("status", "ACTIVE")

    if (error || !accounts) {
      console.error("[v0] Error fetching accounts for scheduled sync:", error)
      return
    }

    console.log(`[v0] Found ${accounts.length} active accounts for ${config.name}`)

    const results = []

    for (const account of accounts) {
      try {
        console.log(`[v0] Processing account ${account.gocardless_id} (${account.display_name})...`)

        // Verificar rate limits antes de sincronizar
        const rateLimits = await rateLimitManager.checkMultipleScopes(account.gocardless_id, config.scopes)

        const availableScopes = config.scopes.filter((scope) => rateLimits[scope]?.canRequest)

        if (availableScopes.length === 0) {
          console.log(`[v0] Skipping account ${account.gocardless_id}: no available rate limits`)
          results.push({
            accountId: account.gocardless_id,
            success: false,
            reason: "No available rate limits",
          })
          continue
        }

        // Llamar al smart sync endpoint
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/accounts/${account.gocardless_id}/smart-sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scopes: availableScopes }),
          },
        )

        const syncResult = await response.json()
        results.push({
          accountId: account.gocardless_id,
          success: syncResult.success,
          syncedScopes: syncResult.syncedScopes,
          skippedScopes: syncResult.skippedScopes,
          remainingLimits: syncResult.remainingLimits,
        })

        console.log(`[v0] Account ${account.gocardless_id} sync result:`, syncResult)
      } catch (error) {
        console.error(`[v0] Error syncing account ${account.gocardless_id}:`, error)
        results.push({
          accountId: account.gocardless_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Guardar log de sincronización
    await this.logSyncExecution(config, results)

    console.log(`[v0] ${config.name} completed. Results:`, {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    })
  }

  private async logSyncExecution(config: ScheduledSyncConfig, results: any[]): Promise<void> {
    const supabase = createServerClient()

    await supabase.from("gocardless_sync_logs").insert({
      sync_type: config.name,
      scheduled_time: config.time,
      executed_at: new Date().toISOString(),
      total_accounts: results.length,
      successful_accounts: results.filter((r) => r.success).length,
      failed_accounts: results.filter((r) => !r.success).length,
      results: JSON.stringify(results),
    })
  }

  getNextScheduledSync(): { config: ScheduledSyncConfig; nextRun: Date } | null {
    const now = new Date()
    const today = new Date(now)

    for (const config of SYNC_SCHEDULES) {
      const [hours, minutes] = config.time.split(":").map(Number)
      const scheduledTime = new Date(today)
      scheduledTime.setHours(hours, minutes, 0, 0)

      if (scheduledTime > now) {
        return { config, nextRun: scheduledTime }
      }
    }

    // Si no hay más sincronizaciones hoy, la próxima es mañana a las 04:00
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(4, 0, 0, 0)

    return { config: SYNC_SCHEDULES[0], nextRun: tomorrow }
  }
}

export const schedulerService = new SchedulerService()
