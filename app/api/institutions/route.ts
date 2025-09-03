import { NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country") || "ES"

    const institutions = await gocardless.getInstitutions(country)

    return NextResponse.json(institutions)
  } catch (error) {
    console.error("[v0] Error fetching institutions:", error)
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 })
  }
}
