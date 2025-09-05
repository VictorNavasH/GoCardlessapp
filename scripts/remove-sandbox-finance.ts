import { createServerClient } from "@supabase/ssr"

async function removeSandboxFinance() {
  console.log("[v0] Starting Sandbox Finance removal process...")

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })

  try {
    // 1. Find Sandbox Finance accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("gocardless_accounts")
      .select("*")
      .eq("institution_name", "Sandbox Finance")

    if (accountsError) {
      console.error("[v0] Error fetching Sandbox Finance accounts:", accountsError)
      return
    }

    console.log(`[v0] Found ${accounts?.length || 0} Sandbox Finance accounts`)

    if (!accounts || accounts.length === 0) {
      console.log("[v0] No Sandbox Finance accounts found")
      return
    }

    const accountIds = accounts.map((acc) => acc.id)
    console.log("[v0] Account IDs to remove:", accountIds)

    // 2. Delete transactions for these accounts
    const { error: transactionsError } = await supabase
      .from("gocardless_transactions")
      .delete()
      .in("account_id", accountIds)

    if (transactionsError) {
      console.error("[v0] Error deleting transactions:", transactionsError)
      return
    }
    console.log("[v0] Deleted transactions for Sandbox Finance accounts")

    // 3. Delete rate limits for these accounts
    const { error: rateLimitsError } = await supabase
      .from("gocardless_rate_limits")
      .delete()
      .in("account_id", accountIds)

    if (rateLimitsError) {
      console.error("[v0] Error deleting rate limits:", rateLimitsError)
    } else {
      console.log("[v0] Deleted rate limits for Sandbox Finance accounts")
    }

    // 4. Delete balances for these accounts
    const { error: balancesError } = await supabase.from("gocardless_balances").delete().in("account_id", accountIds)

    if (balancesError) {
      console.error("[v0] Error deleting balances:", balancesError)
    } else {
      console.log("[v0] Deleted balances for Sandbox Finance accounts")
    }

    // 5. Delete the accounts themselves
    const { error: accountsDeleteError } = await supabase.from("gocardless_accounts").delete().in("id", accountIds)

    if (accountsDeleteError) {
      console.error("[v0] Error deleting accounts:", accountsDeleteError)
      return
    }
    console.log("[v0] Deleted Sandbox Finance accounts")

    // 6. Find and delete Sandbox Finance requisitions
    const { data: requisitions, error: requisitionsError } = await supabase
      .from("gocardless_requisitions")
      .select("*")
      .eq("institution_name", "Sandbox Finance")

    if (requisitionsError) {
      console.error("[v0] Error fetching requisitions:", requisitionsError)
    } else if (requisitions && requisitions.length > 0) {
      const { error: deleteRequisitionsError } = await supabase
        .from("gocardless_requisitions")
        .delete()
        .eq("institution_name", "Sandbox Finance")

      if (deleteRequisitionsError) {
        console.error("[v0] Error deleting requisitions:", deleteRequisitionsError)
      } else {
        console.log(`[v0] Deleted ${requisitions.length} Sandbox Finance requisitions`)
      }
    }

    console.log("[v0] ✅ Sandbox Finance removal completed successfully!")

    // 7. Show final stats
    const { data: remainingAccounts } = await supabase.from("gocardless_accounts").select("institution_name")

    console.log("[v0] Remaining institutions:", [
      ...new Set(remainingAccounts?.map((acc) => acc.institution_name) || []),
    ])
  } catch (error) {
    console.error("[v0] Unexpected error during removal:", error)
  }
}

// Execute the removal
removeSandboxFinance()
