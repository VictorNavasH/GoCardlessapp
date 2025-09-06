import { createServerClient } from "@supabase/ssr"

async function analyzeNewTransactions() {
  console.log("[v0] Starting analysis of new transactions CSV...")

  // Create Supabase client
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get: () => "",
      set: () => {},
      remove: () => {},
    },
  })

  try {
    // Fetch the CSV data
    const csvUrl =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gocardless_transactions_rows%20%285%29-E9emSuwbtmCBgDHXdTQBEkSHzbDpFR.csv"
    console.log("[v0] Fetching CSV from:", csvUrl)

    const response = await fetch(csvUrl)
    const csvText = await response.text()

    // Parse CSV (simple parsing for analysis)
    const lines = csvText.split("\n")
    const headers = lines[0].split(",")
    console.log("[v0] CSV headers found:", headers.length)

    // Analyze sample transactions
    const sampleTransactions = lines.slice(1, 6).map((line) => {
      const values = line.split(",")
      return {
        creditor_name: values[headers.indexOf("creditor_name")] || "null",
        debtor_name: values[headers.indexOf("debtor_name")] || "null",
        remittance_info: values[headers.indexOf("remittance_information_unstructured")] || "null",
        account_id: values[headers.indexOf("account_id")] || "null",
      }
    })

    console.log("[v0] Sample transactions from CSV:")
    sampleTransactions.forEach((tx, i) => {
      console.log(`[v0] Transaction ${i + 1}:`, {
        creditor_name: tx.creditor_name,
        debtor_name: tx.debtor_name,
        remittance_info: tx.remittance_info,
      })
    })

    // Check which bank these account IDs belong to
    const accountIds = sampleTransactions.map((tx) => tx.account_id).filter((id) => id !== "null")

    if (accountIds.length > 0) {
      const { data: accounts, error } = await supabase
        .from("gocardless_accounts")
        .select(`
          id,
          gocardless_institutions!inner(name)
        `)
        .in("id", accountIds)

      if (error) {
        console.error("[v0] Error fetching accounts:", error)
      } else {
        console.log("[v0] Accounts found in database:")
        accounts?.forEach((account) => {
          console.log(`[v0] Account ${account.id}: ${account.gocardless_institutions.name}`)
        })
      }
    }

    // Compare with current database state
    const { data: currentStats, error: statsError } = await supabase.from("gocardless_transactions").select(`
        gocardless_accounts!inner(
          gocardless_institutions!inner(name)
        )
      `)

    if (statsError) {
      console.error("[v0] Error fetching current stats:", statsError)
    } else {
      const bankStats = currentStats?.reduce((acc: any, tx: any) => {
        const bankName = tx.gocardless_accounts.gocardless_institutions.name
        acc[bankName] = (acc[bankName] || 0) + 1
        return acc
      }, {})

      console.log("[v0] Current transaction distribution by bank:")
      Object.entries(bankStats || {}).forEach(([bank, count]) => {
        console.log(`[v0] ${bank}: ${count} transactions`)
      })
    }

    console.log("[v0] Analysis completed successfully")
  } catch (error) {
    console.error("[v0] Error during analysis:", error)
  }
}

// Execute the analysis
analyzeNewTransactions()
