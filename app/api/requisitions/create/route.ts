import { type NextRequest, NextResponse } from "next/server"
import { gocardless } from "@/lib/gocardless"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { institution_id, redirect_url, reference } = await request.json()

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
        // Create sandbox institution if it doesn't exist
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
      const { data: institutionDataResult, error: institutionError } = await supabase
        .from("gocardless_institutions")
        .select("id, gocardless_id, name")
        .eq("gocardless_id", institution_id)
        .eq("is_active", true)
        .single()

      if (institutionError || !institutionDataResult) {
        console.log(`[v0] Institution ${institution_id} not found in database, fetching from GoCardless...`)

        try {
          const gcInstitutions = await gocardless.getInstitutions()
          const gcInstitution = gcInstitutions.find((inst: any) => inst.id === institution_id)

          if (!gcInstitution) {
            return NextResponse.json(
              { error: `Institution ${institution_id} not found in GoCardless` },
              { status: 404 },
            )
          }

          const { data: newInstitution, error: createError } = await supabase
            .from("gocardless_institutions")
            .insert({
              gocardless_id: gcInstitution.id,
              name: gcInstitution.name,
              bic: gcInstitution.bic || null,
              country: gcInstitution.countries?.[0] || "ES",
              logo_url: gcInstitution.logo || null,
              supported_features: gcInstitution.supported_features
                ? JSON.stringify(gcInstitution.supported_features)
                : null,
              is_active: true,
            })
            .select("id, gocardless_id, name")
            .single()

          if (createError) {
            console.error("[v0] Error creating institution:", createError)
            return NextResponse.json({ error: "Error creating institution in database" }, { status: 500 })
          }

          institutionData = newInstitution
          console.log(`[v0] Created new institution: ${institutionData.name}`)
        } catch (gcError) {
          console.error("[v0] Error fetching from GoCardless:", gcError)
          return NextResponse.json({ error: "Error getting institution information" }, { status: 500 })
        }
      } else {
        institutionData = institutionDataResult
      }
    }

    const requisition = await gocardless.createRequisition(institutionData.gocardless_id, redirect_url, {
      reference: reference,
      createAgreement: false, // Use default terms per GoCardless documentation
      userLanguage: "ES",
    })

    console.log("[v0] Requisition created - GoCardless ID:", requisition.id, "Our reference:", reference)
    console.log("[v0] Official GoCardless link:", requisition.link)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const { error: dbError } = await supabase.from("gocardless_requisitions").insert({
      gocardless_id: requisition.id,
      institution_id: institutionData.id,
      reference: reference,
      status: requisition.status,
      redirect_url: redirect_url,
      link: requisition.link,
      agreement_id: requisition.agreement,
      accounts: requisition.accounts || [],
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: "Error saving requisition to database" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      requisition_id: requisition.id,
      link: requisition.link, // This is the official GoCardless link users should follow
      reference: requisition.reference,
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
