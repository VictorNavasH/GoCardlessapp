import { type NextRequest, NextResponse } from "next/server"
import { schedulerService, SYNC_SCHEDULES } from "@/lib/scheduler"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Scheduled sync triggered at", new Date().toISOString())

    // Determinar qué sincronización ejecutar basándose en la hora actual
    const now = new Date()
    const currentHour = now.getHours()

    let syncConfig
    if (currentHour === 4) {
      syncConfig = SYNC_SCHEDULES[0] // Full Sync
    } else if (currentHour === 12) {
      syncConfig = SYNC_SCHEDULES[1] // Medium Sync
    } else if (currentHour === 21) {
      syncConfig = SYNC_SCHEDULES[2] // Basic Sync
    } else {
      console.log("[v0] No scheduled sync for current hour:", currentHour)
      return NextResponse.json({
        success: false,
        message: "No scheduled sync for current hour",
      })
    }

    console.log(`[v0] Executing ${syncConfig.name} with scopes:`, syncConfig.scopes)

    // Ejecutar la sincronización programada
    await schedulerService.executeScheduledSync(syncConfig)

    return NextResponse.json({
      success: true,
      syncType: syncConfig.name,
      executedAt: now.toISOString(),
      scopes: syncConfig.scopes,
    })
  } catch (error) {
    console.error("[v0] Error in scheduled sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// También permitir GET para testing manual
export async function GET(request: NextRequest) {
  return POST(request)
}
