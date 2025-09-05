import { type NextRequest, NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { institution_id, redirect_url, reference, agreement_options } = await request.json()

    if (!institution_id || !redirect_url || !reference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    const isSandbox = institution_id === "SANDBOXFINANCE_SFIN0000"

    let institutionData: any

    if (isSandbox) {
      const { data: existingSandbox, error: sandboxError } = await supabase
        .from("gocardless_institutions")
        .select("id, gocardless_id, name")
        .eq("gocardless_id", "SANDBOXFINANCE_SFIN0000")
        .single()

      if (sandboxError || !existingSandbox) {
        const { data: newSandbox, error: createSandboxError } = await supabase
          .from("gocardless_institutions")
          .insert({
            gocardless_id: "SANDBOXFINANCE_SFIN0000",
            name: "Sandbox Finance",
            bic: "SFIN0000",
            country: "GB",
            logo_url: null,
            supported_features: JSON.stringify(["transactions", "balances", "details"]),
            is_active: true,
          })
          .select("id, gocardless_id, name")
          .single()

        if (createSandboxError) {
          console.error("[v0] Error creating sandbox institution:", createSandboxError)
          return NextResponse.json({ error: "Error creating sandbox institution" }, { status: 500 })
        }
        institutionData = newSandbox
      } else {
        institutionData = existingSandbox
      }
    } else {
      try {
        console.log("[v0] Looking for institution:", institution_id)
        const gcInstitutions = await gocardless.getInstitutions("ES")
        console.log("[v0] Found", gcInstitutions.length, "institutions from GoCardless for ES")

        const gcInstitution = gcInstitutions.find((inst: any) => inst.id === institution_id)
        console.log("[v0] Institution found in GoCardless:", !!gcInstitution)

        if (!gcInstitution) {
          console.log(
            "[v0] Available institution IDs:",
            gcInstitutions.slice(0, 5).map((inst: any) => inst.id),
          )
          return NextResponse.json({ error: `Institution ${institution_id} not found in GoCardless` }, { status: 404 })
        }

        console.log("[v0] Found institution:", gcInstitution.name, "with ID:", gcInstitution.id)

        const { data: institutionRecord, error: institutionError } = await supabase
          .from("gocardless_institutions")
          .upsert({
            gocardless_id: gcInstitution.id,
            name: gcInstitution.name,
            bic: gcInstitution.bic || null,
            country: gcInstitution.countries?.[0] || "ES",
            countries: gcInstitution.countries || [],
            logo_url: gcInstitution.logo || null,
            transaction_total_days: gcInstitution.transaction_total_days || 90,
            max_access_valid_for_days: gcInstitution.max_access_valid_for_days || 90,
            max_access_valid_for_days_reconfirmation: gcInstitution.max_access_valid_for_days_reconfirmation || 730,
            supported_features: gcInstitution.supported_features || ["balances", "details", "transactions"],
            supported_payments: gcInstitution.supported_payments || {},
            identification_codes: gcInstitution.identification_codes || {},
            is_active: true,
          })
          .select("id, gocardless_id, name")
          .single()

        if (institutionError) {
          console.error("[v0] Error upserting institution:", institutionError)
          return NextResponse.json({ error: "Error saving institution" }, { status: 500 })
        }

        institutionData = institutionRecord
      } catch (gcError) {
        console.error("[v0] Error validating institution with GoCardless:", gcError)
        return NextResponse.json({ error: "Institution validation failed" }, { status: 500 })
      }
    }

    const requisitionOptions: any = {
      reference: reference,
      userLanguage: "ES",
    }

    if (agreement_options) {
      requisitionOptions.createAgreement = true
      requisitionOptions.maxHistoricalDays = agreement_options.max_historical_days
      requisitionOptions.accessValidForDays = agreement_options.access_valid_for_days
      requisitionOptions.accessScope = agreement_options.access_scope
    }

    const requisition = await gocardless.createRequisition(
      institutionData.gocardless_id,
      redirect_url,
      requisitionOptions,
    )

    console.log("[v0] Requisition created - GoCardless ID:", requisition.id, "Our reference:", reference)
    console.log("[v0] Official GoCardless link:", requisition.link)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (agreement_options?.access_valid_for_days || 90))

    const { error: dbError } = await supabase.from("gocardless_requisitions").insert({
      gocardless_id: requisition.id,
      institution_id: institutionData.id,
      reference: reference,
      status: requisition.status,
      redirect_url: redirect_url,
      link: requisition.link,
      user_language: requisitionOptions.userLanguage || "ES",
      account_selection: false,
      redirect_immediate: false,
      expires_at: expiresAt.toISOString(),
    })

    if (dbError) {
      console.error("[v0] Database error details:")
      console.error("[v0] - Code:", dbError.code)
      console.error("[v0] - Message:", dbError.message)
      console.error("[v0] - Details:", dbError.details)
      console.error("[v0] - Hint:", dbError.hint)
      console.error("[v0] - Full error object:", JSON.stringify(dbError, null, 2))
      return NextResponse.json(
        {
          error: "Error saving requisition to database",
          supabase_error: {
            code: dbError.code,
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            full_error: dbError,
          },
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      requisition_id: requisition.id,
      link: requisition.link,
      reference: reference,
      institution: institutionData,
      expires: expiresAt,
      sandbox: isSandbox,
    })
  } catch (error) {
    console.error("[v0] Error creating requisition:", error)

    if (error instanceof Error) {
      if (error.message?.includes("Institution not supported")) {
        return NextResponse.json(
          { error: "This institution is not available in the current environment" },
          { status: 400 },
        )
      }

      if (error.message?.includes("Invalid institution_id")) {
        return NextResponse.json({ error: "Invalid institution ID" }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Failed to create requisition" }, { status: 500 })
  }
}
