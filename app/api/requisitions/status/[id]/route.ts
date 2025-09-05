import { type NextRequest, NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reference = params.id

    console.log("[v0] Checking requisition status for reference:", reference)

    if (!reference || reference.length < 10) {
      console.error("[v0] Invalid requisition reference:", reference)
      return NextResponse.json({ error: "Invalid requisition reference" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: requisitionRecord, error: dbError } = await supabase
      .from("gocardless_requisitions")
      .select("gocardless_id, status, accounts, linked_at")
      .eq("reference", reference)
      .single()

    if (dbError || !requisitionRecord) {
      console.error("[v0] Requisition not found in database:", dbError)
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    console.log("[v0] Found requisition in database:", {
      reference,
      gocardless_id: requisitionRecord.gocardless_id,
      current_status: requisitionRecord.status,
    })

    console.log("[v0] Calling GoCardless API for requisition:", requisitionRecord.gocardless_id)
    const requisition = await gocardless.getRequisition(requisitionRecord.gocardless_id)

    console.log("[v0] GoCardless response received:", {
      id: requisition.id,
      status: requisition.status,
      accounts: requisition.accounts?.length || 0,
    })

    const { error: updateError } = await supabase
      .from("gocardless_requisitions")
      .update({
        status: requisition.status,
        accounts: requisition.accounts || [],
        linked_at: requisition.status === "LN" ? new Date().toISOString() : requisitionRecord.linked_at,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference)

    if (updateError) {
      console.error("[v0] Database update error:", updateError)
    } else {
      console.log("[v0] Database updated successfully with status:", requisition.status)
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
