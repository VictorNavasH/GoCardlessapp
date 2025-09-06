import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

async function fixExistingTransactions() {
  console.log("[v0] Starting to fix existing transactions...")

  try {
    const { data: transactions, error } = await supabase
      .from("gocardless_transactions")
      .select("*")
      .or("creditor_name.is.null,debtor_name.is.null,remittance_information_unstructured.is.null")
      .not("raw_data", "is", null)

    if (error) {
      console.error("[v0] Error fetching transactions:", error)
      return
    }

    console.log(`[v0] Found ${transactions?.length || 0} transactions to process`)

    let processedCount = 0
    let updatedCount = 0

    for (const transaction of transactions || []) {
      processedCount++

      try {
        const rawData = JSON.parse(transaction.raw_data)
        let needsUpdate = false
        const updates: any = {}

        // Extraer descripción de remittanceInformationUnstructuredArray
        if (
          !transaction.remittance_information_unstructured &&
          rawData.remittanceInformationUnstructuredArray?.length > 0
        ) {
          updates.remittance_information_unstructured = rawData.remittanceInformationUnstructuredArray[0]
          needsUpdate = true
        }

        // Extraer información del deudor si está disponible
        if (!transaction.debtor_name && rawData.debtorName) {
          updates.debtor_name = rawData.debtorName
          needsUpdate = true
        }

        // Extraer información del acreedor si está disponible
        if (!transaction.creditor_name && rawData.creditorName) {
          updates.creditor_name = rawData.creditorName
          needsUpdate = true
        }

        // Extraer información adicional si está disponible
        if (!transaction.additional_information && rawData.additionalInformation) {
          updates.additional_information = rawData.additionalInformation
          needsUpdate = true
        }

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from("gocardless_transactions")
            .update(updates)
            .eq("id", transaction.id)

          if (updateError) {
            console.error(`[v0] Error updating transaction ${transaction.id}:`, updateError)
          } else {
            updatedCount++
            console.log(`[v0] Updated transaction ${transaction.id} with:`, Object.keys(updates))
          }
        }

        // Log de progreso cada 50 transacciones
        if (processedCount % 50 === 0) {
          console.log(`[v0] Progress: ${processedCount}/${transactions.length} processed, ${updatedCount} updated`)
        }
      } catch (parseError) {
        console.error(`[v0] Error processing transaction ${transaction.id}:`, parseError)
      }
    }

    console.log(`[v0] Processing complete: ${processedCount} processed, ${updatedCount} updated`)

    const { data: finalStats } = await supabase
      .from("gocardless_transactions")
      .select("remittance_information_unstructured")
      .not("remittance_information_unstructured", "is", null)

    console.log(`[v0] Final stats: ${finalStats?.length || 0} transactions now have descriptions`)
  } catch (error) {
    console.error("[v0] Error in fixExistingTransactions:", error)
  }
}

fixExistingTransactions()
