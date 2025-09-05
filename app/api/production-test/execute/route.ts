import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoCardlessClient } from "@/lib/gocardless"

export async function POST(request: Request) {
  try {
    const { accountId, testType } = await request.json()

    if (!accountId || !testType) {
      return NextResponse.json({ error: "Account ID and test type required" }, { status: 400 })
    }

    const supabase = await createClient()
    const gocardless = new GoCardlessClient()

    const today = new Date().toISOString().split("T")[0]
    const { data: rateLimit } = await supabase
      .from("gocardless_rate_limits")
      .select("remaining_calls")
      .eq("account_id", accountId)
      .eq("scope", testType)
      .eq("date", today)
      .single()

    if (!rateLimit || rateLimit.remaining_calls < 1) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for this account and scope",
          canRetryAt: "Tomorrow",
        },
        { status: 429 },
      )
    }

    console.log(`[v0] Starting production test: ${testType} for account ${accountId}`)

    let testResult = {}
    let success = false

    switch (testType) {
      case "details":
        const details = await gocardless.getAccountDetails(accountId)
        testResult = { details, hasData: !!details.iban }
        success = !!details.iban
        break

      case "balances":
        const balances = await gocardless.getAccountBalances(accountId)
        testResult = { balances, hasData: balances.length > 0 }
        success = balances.length > 0
        break

      case "transactions":
        const transactions = await gocardless.getAccountTransactions(accountId)
        testResult = {
          transactionCount: transactions.transactions?.booked?.length || 0,
          hasData: (transactions.transactions?.booked?.length || 0) > 0,
        }
        success = (transactions.transactions?.booked?.length || 0) > 0
        break

      default:
        return NextResponse.json({ error: "Invalid test type" }, { status: 400 })
    }

    await supabase.from("gocardless_sync_logs").insert({
      sync_type: `production_test_${testType}`,
      scheduled_time: new Date().toISOString(),
      executed_at: new Date().toISOString(),
      total_accounts: 1,
      successful_accounts: success ? 1 : 0,
      failed_accounts: success ? 0 : 1,
      results: {
        accountId,
        testType,
        success,
        ...testResult,
      },
    })

    console.log(`[v0] Production test completed: ${success ? "SUCCESS" : "FAILED"}`)

    return NextResponse.json({
      success,
      testType,
      accountId,
      result: testResult,
      remainingCalls: rateLimit.remaining_calls - 1,
    })
  } catch (error) {
    console.error("[v0] Error in production test execution:", error)
    return NextResponse.json(
      {
        error: "Test execution failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
