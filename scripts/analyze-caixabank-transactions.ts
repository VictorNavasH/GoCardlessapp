export default async function analyzeCaixaBankTransactions() {
  console.log("[v0] 🔍 Analyzing CaixaBank transactions format...")

  // Fetch CSV data
  const csvUrl =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gocardless_transactions_rows%20%283%29-vT9PQc0YVoCSloOfmbrU5XoUUm67o8.csv"

  try {
    const response = await fetch(csvUrl)
    const csvText = await response.text()
    const lines = csvText.split("\n")
    const headers = lines[0].split(",")

    console.log("[v0] 📊 CSV Headers:", headers.slice(0, 10)) // First 10 headers
    console.log("[v0] 📊 Total rows in CSV:", lines.length - 1)

    // Analyze first few data rows
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const row = lines[i].split(",")
      console.log(`[v0] 📊 Row ${i} sample:`)
      console.log(`  - ID: ${row[0]}`)
      console.log(`  - Amount: ${row[10]}`)
      console.log(`  - Creditor Name: ${row[17]}`)
      console.log(`  - Debtor Name: ${row[23]}`)
      console.log(`  - Remittance Info: ${row[29]}`)
      console.log(`  - Raw Data: ${row[32]?.substring(0, 100)}...`)
    }

    // Check for null patterns
    let nullCreditorCount = 0
    let nullDebtorCount = 0
    let nullRemittanceCount = 0
    let hasRawDataCount = 0

    for (let i = 1; i < Math.min(50, lines.length); i++) {
      const row = lines[i].split(",")
      if (!row[17] || row[17] === "null" || row[17] === "") nullCreditorCount++
      if (!row[23] || row[23] === "null" || row[23] === "") nullDebtorCount++
      if (!row[29] || row[29] === "null" || row[29] === "") nullRemittanceCount++
      if (row[32] && row[32] !== "null" && row[32] !== "") hasRawDataCount++
    }

    const sampleSize = Math.min(49, lines.length - 1)
    console.log("[v0] 📊 Analysis of first", sampleSize, "transactions:")
    console.log(
      `  - Null creditor_name: ${nullCreditorCount}/${sampleSize} (${Math.round((nullCreditorCount / sampleSize) * 100)}%)`,
    )
    console.log(
      `  - Null debtor_name: ${nullDebtorCount}/${sampleSize} (${Math.round((nullDebtorCount / sampleSize) * 100)}%)`,
    )
    console.log(
      `  - Null remittance_info: ${nullRemittanceCount}/${sampleSize} (${Math.round((nullRemittanceCount / sampleSize) * 100)}%)`,
    )
    console.log(
      `  - Has raw_data: ${hasRawDataCount}/${sampleSize} (${Math.round((hasRawDataCount / sampleSize) * 100)}%)`,
    )

    // Analyze raw_data structure
    console.log("[v0] 🔍 Analyzing raw_data structure...")
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const row = lines[i].split(",")
      if (row[32] && row[32] !== "null") {
        try {
          const rawData = JSON.parse(row[32])
          console.log(`[v0] 📊 Raw data structure for row ${i}:`)
          console.log("  - Keys:", Object.keys(rawData))
          if (rawData.remittanceInformationUnstructuredArray) {
            console.log("  - Remittance info:", rawData.remittanceInformationUnstructuredArray)
          }
        } catch (e) {
          console.log(`[v0] ❌ Failed to parse raw_data for row ${i}:`, e.message)
        }
      }
    }

    return {
      success: true,
      message: "CaixaBank transactions analysis completed",
      stats: {
        totalRows: lines.length - 1,
        nullCreditorPercentage: Math.round((nullCreditorCount / sampleSize) * 100),
        nullDebtorPercentage: Math.round((nullDebtorCount / sampleSize) * 100),
        nullRemittancePercentage: Math.round((nullRemittanceCount / sampleSize) * 100),
        hasRawDataPercentage: Math.round((hasRawDataCount / sampleSize) * 100),
      },
    }
  } catch (error) {
    console.error("[v0] ❌ Error analyzing CSV:", error)
    return {
      success: false,
      message: `Error analyzing CSV: ${error.message}`,
    }
  }
}
