import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { gocardless } from "@/lib/gocardless"

export async function POST() {
  try {
    console.log("[v0] Starting institutions sync from GoCardless...")

    // Fetch institutions from GoCardless API
    const institutions = await gocardless.getInstitutions("ES")
    console.log("[v0] Fetched", institutions.length, "institutions from GoCardless")

    const supabase = await createClient()

    const institutionsData = institutions.map((institution: any) => ({
      gocardless_id: institution.id,
      name: institution.name,
      bic: institution.bic || null,
      country: "ES",
      countries: institution.countries || [],
      logo_url: institution.logo || null, // Corregido: logo_url en lugar de logo
      transaction_total_days: institution.transaction_total_days || 90,
      max_access_valid_for_days: institution.max_access_valid_for_days || 90,
      max_access_valid_for_days_reconfirmation: institution.max_access_valid_for_days_reconfirmation || 730,
      supported_features: institution.supported_features || ["balances", "details", "transactions"],
      supported_payments: institution.supported_payments || {},
      identification_codes: institution.identification_codes || {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    console.log("[v0] Sample institution data:", JSON.stringify(institutionsData[0], null, 2))

    // Upsert institutions to database
    const { data, error } = await supabase
      .from("gocardless_institutions")
      .upsert(institutionsData, {
        onConflict: "gocardless_id",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("[v0] Error upserting institutions:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save institutions to database",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Successfully synced", data?.length || 0, "institutions")

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${data?.length || 0} institutions`,
      institutions_synced: data?.length || 0,
      sample_institution: institutionsData[0]?.name || "N/A",
    })
  } catch (error) {
    console.error("[v0] Error syncing institutions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync institutions from GoCardless",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
