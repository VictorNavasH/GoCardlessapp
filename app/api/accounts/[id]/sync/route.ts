import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = params.id

    // En una aplicación real, aquí sincronizarías con GoCardless
    // Por ahora simulamos una sincronización exitosa

    // Simular delay de sincronización
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      account_id: accountId,
      synced_at: new Date().toISOString(),
      transactions_updated: Math.floor(Math.random() * 10) + 1,
    })
  } catch (error) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
