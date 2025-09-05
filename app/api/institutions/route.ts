import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country") || "ES"

    const supabase = await createClient()

    const { data: institutions, error } = await supabase
      .from("gocardless_institutions")
      .select("*")
      .eq("is_active", true)
      .contains("countries", [country])
      .order("name")

    if (error) {
      console.error("[v0] Error fetching institutions from database:", error)
      return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 })
    }

    console.log(`[v0] Institutions fetched: ${institutions?.length || 0} institutions for country ${country}`)
    if (institutions && institutions.length > 0) {
      console.log(`[v0] Available institutions: ${institutions.map((i) => i.name).join(", ")}`)
      const caixabank = institutions.find((i) => i.name.toLowerCase().includes("caixabank"))
      if (caixabank) {
        console.log(
          `[v0] CaixaBank found in database: ID=${caixabank.id}, Name=${caixabank.name}, BIC=${caixabank.bic}`,
        )
      } else {
        console.log(`[v0] CaixaBank NOT found in local database`)
      }
      console.log(`[v0] All institution IDs: ${institutions.map((i) => `${i.name}:${i.id}`).join(", ")}`)
    }

    return NextResponse.json(institutions || [])
  } catch (error) {
    console.error("[v0] Error fetching institutions:", error)
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 })
  }
}
