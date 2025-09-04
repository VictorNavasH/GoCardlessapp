import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { gocardless } from "@/lib/gocardless"

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 })
    }

    console.log("[v0] Testing sync for account:", accountId)

    const supabase = await createClient()
    const testResult = {
      accountId,
      steps: {} as any,
      errors: [] as string[],
      success: false,
    }

    // Paso 1: Verificar que la cuenta existe en la base de datos
    try {
      const { data: account, error: accountError } = await supabase
        .from("gocardless_accounts")
        .select("*")
        .eq("gocardless_id", accountId)
        .single()

      testResult.steps.account_lookup = {
        success: !accountError && !!account,
        account_found: !!account,
        account_data: account,
        error: accountError?.message,
      }

      if (!account) {
        testResult.errors.push("Account not found in database")
        return NextResponse.json(testResult, { status: 200 })
      }

      // Paso 2: Probar llamada a GoCardless para obtener transacciones
      try {
        console.log("[v0] Testing GoCardless API call for transactions...")
        const transactions = await gocardless.getAccountTransactions(accountId)

        testResult.steps.gocardless_api = {
          success: true,
          transactions_count: Array.isArray(transactions) ? transactions.length : 0,
          transactions_type: typeof transactions,
          is_array: Array.isArray(transactions),
          sample_transaction: Array.isArray(transactions) && transactions.length > 0 ? transactions[0] : null,
        }

        // Paso 3: Probar guardado en base de datos
        if (Array.isArray(transactions) && transactions.length > 0) {
          try {
            const sampleTransaction = transactions[0]
            const transactionData = {
              gocardless_id: `test_${Date.now()}`,
              account_id: account.id,
              amount: Number.parseFloat(sampleTransaction.transactionAmount?.amount || "0"),
              currency: sampleTransaction.transactionAmount?.currency || "EUR",
              date: sampleTransaction.bookingDate || new Date().toISOString().split("T")[0],
              description: sampleTransaction.remittanceInformationUnstructured || "Test transaction",
              reference: sampleTransaction.endToEndId || `test_${Date.now()}`,
              created_at: new Date().toISOString(),
            }

            const { data: insertData, error: insertError } = await supabase
              .from("gocardless_transactions")
              .insert([transactionData])
              .select()

            testResult.steps.database_insert = {
              success: !insertError,
              inserted_data: insertData,
              error: insertError?.message,
              transaction_data: transactionData,
            }

            if (!insertError) {
              // Limpiar el registro de prueba
              await supabase.from("gocardless_transactions").delete().eq("gocardless_id", transactionData.gocardless_id)
            }
          } catch (error) {
            testResult.steps.database_insert = {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            }
            testResult.errors.push(`Database insert failed: ${error}`)
          }
        } else {
          testResult.steps.database_insert = {
            success: false,
            error: "No transactions to test with",
          }
        }
      } catch (error) {
        testResult.steps.gocardless_api = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
        testResult.errors.push(`GoCardless API failed: ${error}`)
      }
    } catch (error) {
      testResult.steps.account_lookup = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      testResult.errors.push(`Account lookup failed: ${error}`)
    }

    testResult.success = testResult.errors.length === 0

    console.log("[v0] Sync test completed:", testResult)

    return NextResponse.json(testResult, { status: 200 })
  } catch (error) {
    console.error("[v0] Sync test failed:", error)
    return NextResponse.json(
      {
        error: "Sync test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
