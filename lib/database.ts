import { createClient } from "./supabase/server"

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}

export interface Institution {
  id: string
  gocardless_id: string
  name: string
  bic?: string
  country: string
  logo_url?: string
  supported_features?: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Requisition {
  id: string
  gocardless_id: string
  institution_id: string
  reference: string
  status: "CR" | "LN" | "RJ" | "EX" | "SU" | "GA"
  agreement_id?: string
  redirect_url?: string
  link?: string
  accounts?: any[]
  user_id?: string
  created_at: string
  updated_at: string
  expires_at?: string
  linked_at?: string
  institution?: Institution
}

export interface Account {
  id: string
  gocardless_id: string
  requisition_id?: string
  institution_id?: string
  iban?: string
  name?: string
  display_name?: string
  currency: string
  account_type?: string
  product?: string
  cash_account_type?: string
  owner_name?: string
  owner_address?: any
  current_balance?: number
  available_balance?: number
  credit_limit?: number
  balance_last_updated_at?: string
  status: string
  last_sync_at?: string
  sync_error?: string
  user_id?: string
  created_at: string
  updated_at: string
  institution?: Institution
}

export interface Transaction {
  id: string
  gocardless_id: string
  account_id: string
  booking_date: string
  value_date?: string
  amount: number
  currency: string
  exchange_rate?: number
  original_amount?: number
  original_currency?: string
  transaction_code?: string
  bank_transaction_code?: string
  proprietary_bank_transaction_code?: string
  description?: string
  remittance_information_unstructured?: string
  remittance_information_structured?: any
  additional_information?: string
  creditor_name?: string
  creditor_account_iban?: string
  creditor_agent_bic?: string
  creditor_id?: string
  debtor_name?: string
  debtor_account_iban?: string
  debtor_agent_bic?: string
  end_to_end_id?: string
  mandate_id?: string
  cheque_number?: string
  creditor_reference?: string
  balance_after_transaction?: number
  raw_data?: any
  created_at: string
  updated_at: string
}

export class DatabaseService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  // Usuarios
  async getUser(id: string): Promise<User | null> {
    const { data, error } = await this.supabase.from("users").select("*").eq("id", id).single()

    if (error) throw error
    return data
  }

  async createUser(user: Omit<User, "id" | "created_at" | "updated_at">): Promise<User> {
    const { data, error } = await this.supabase.from("users").insert(user).select().single()

    if (error) throw error
    return data
  }

  async getInstitutions(): Promise<Institution[]> {
    const { data, error } = await this.supabase
      .from("gocardless_institutions")
      .select("*")
      .eq("is_active", true)
      .order("name")

    if (error) throw error
    return data || []
  }

  async getInstitution(id: string): Promise<Institution | null> {
    const { data, error } = await this.supabase.from("gocardless_institutions").select("*").eq("id", id).single()

    if (error) throw error
    return data
  }

  async createRequisition(requisition: Omit<Requisition, "id" | "created_at" | "updated_at">): Promise<Requisition> {
    const { data, error } = await this.supabase
      .from("gocardless_requisitions")
      .insert(requisition)
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async getRequisition(id: string): Promise<Requisition | null> {
    const { data, error } = await this.supabase
      .from("gocardless_requisitions")
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    return data
  }

  async getRequisitionByGoCardlessId(gocardlessId: string): Promise<Requisition | null> {
    const { data, error } = await this.supabase
      .from("gocardless_requisitions")
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .eq("gocardless_id", gocardlessId)
      .single()

    if (error) throw error
    return data
  }

  async updateRequisition(id: string, updates: Partial<Requisition>): Promise<Requisition> {
    const { data, error } = await this.supabase
      .from("gocardless_requisitions")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async getUserAccounts(userId: string): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from("gocardless_accounts")
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  async getAccount(id: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from("gocardless_accounts")
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error
    return data
  }

  async getAccountByGoCardlessId(gocardlessId: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from("gocardless_accounts")
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .eq("gocardless_id", gocardlessId)
      .single()

    if (error) throw error
    return data
  }

  async createAccount(account: Omit<Account, "id" | "created_at" | "updated_at">): Promise<Account> {
    const { data, error } = await this.supabase
      .from("gocardless_accounts")
      .insert(account)
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const { data, error } = await this.supabase
      .from("gocardless_accounts")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        institution:gocardless_institutions(*)
      `)
      .single()

    if (error) throw error
    return data
  }

  async getAccountTransactions(accountId: string, limit = 50): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from("gocardless_transactions")
      .select("*")
      .eq("account_id", accountId)
      .order("booking_date", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async getUserTransactions(userId: string, limit = 100): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from("gocardless_transactions")
      .select(`
        *,
        account:gocardless_accounts!inner(user_id)
      `)
      .eq("account.user_id", userId)
      .order("booking_date", { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async createTransaction(transaction: Omit<Transaction, "id" | "created_at" | "updated_at">): Promise<Transaction> {
    const { data, error } = await this.supabase.from("gocardless_transactions").insert(transaction).select().single()

    if (error) throw error
    return data
  }

  async createTransactions(
    transactions: Omit<Transaction, "id" | "created_at" | "updated_at">[],
  ): Promise<Transaction[]> {
    const { data, error } = await this.supabase.from("gocardless_transactions").insert(transactions).select()

    if (error) throw error
    return data || []
  }

  async getDashboardStats(userId: string) {
    // Obtener balance total
    const { data: accounts } = await this.supabase
      .from("gocardless_accounts")
      .select("current_balance, available_balance")
      .eq("user_id", userId)

    const totalBalance =
      accounts?.reduce((sum, acc) => sum + (acc.current_balance || acc.available_balance || 0), 0) || 0

    // Obtener número de cuentas
    const { count: accountsCount } = await this.supabase
      .from("gocardless_accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    // Obtener transacciones del mes actual
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyTransactions } = await this.supabase
      .from("gocardless_transactions")
      .select(`
        amount,
        account:gocardless_accounts!inner(user_id)
      `)
      .eq("account.user_id", userId)
      .gte("booking_date", startOfMonth.toISOString().split("T")[0])

    const monthlySpending =
      monthlyTransactions?.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    const monthlyIncome = monthlyTransactions?.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0

    return {
      totalBalance,
      accountsCount: accountsCount || 0,
      monthlySpending,
      monthlyIncome,
      transactionsCount: monthlyTransactions?.length || 0,
    }
  }
}
