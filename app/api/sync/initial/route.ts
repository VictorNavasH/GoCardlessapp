import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accounts } = await request.json()

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: "Invalid accounts data" }, { status: 400 })
    }

    // En una aplicación real, aquí iniciarías la sincronización inicial
    // de transacciones para todas las cuentas conectadas

    // Simular procesamiento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return NextResponse.json({
      success: true,
      accounts_processed: accounts.length,
      transactions_imported: Math.floor(Math.random() * 50) + 10,
      sync_started_at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: "Initial sync failed" }, { status: 500 })
  }
}
