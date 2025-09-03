import { type NextRequest, NextResponse } from "next/server"

// Simulamos una base de datos en memoria
const requisitions = new Map()

export async function POST(request: NextRequest) {
  try {
    const { requisition_id, status, accounts } = await request.json()

    if (!requisition_id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Updated requisition:", { requisition_id, status, accounts })

    // En modo de pruebas, siempre devolvemos éxito
    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[v0] Error updating requisition:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
