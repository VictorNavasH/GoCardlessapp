import { type NextRequest, NextResponse } from "next/server"
import { gocardless, getSupabaseClient } from "@/lib/gocardless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requisitionId = params.id

    console.log("[v0] Checking requisition status for ID:", requisitionId)

    if (!requisitionId || requisitionId.length < 10) {
      console.error("[v0] Invalid requisition ID:", requisitionId)
      return NextResponse.json({ error: "Invalid requisition ID" }, { status: 400 })
    }

    console.log("[v0] Calling GoCardless API for requisition:", requisitionId)
    const requisition = await gocardless.getRequisition(requisitionId)

    console.log("[v0] GoCardless response received:", {
      id: requisition.id,
      status: requisition.status,
      accounts: requisition.accounts?.length || 0,
    })

    const supabase = getSupabaseClient()
    const { error: dbError } = await supabase
      .from("gocardless_requisitions")
      .update({
        status: requisition.status,
        accounts: requisition.accounts || [],
        updated_at: new Date().toISOString(),
      })
      .eq("gocardless_id", requisitionId)

    if (dbError) {
      console.error("[v0] Database update error:", dbError)
    } else {
      console.log("[v0] Database updated successfully")
    }

    return NextResponse.json(requisition)
  } catch (error) {
    console.error("[v0] Error checking requisition status:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        error: "Failed to check requisition status",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
