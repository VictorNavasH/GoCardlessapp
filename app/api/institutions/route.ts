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

    return NextResponse.json(institutions || [])
  } catch (error) {
    console.error("[v0] Error fetching institutions:", error)
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 })
  }
}
