"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Layout from "../../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Calendar,
  Building2,
  Copy,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  DollarSign,
} from "lucide-react"

interface Account {
  id: string
  display_name: string
  iban: string
  current_balance: number
  currency: string
  status: string
  institution_name: string
  balance_last_updated_at: string
}

interface Transaction {
  id: string
  amount: number
  currency: string
  description: string
  date: string
  type: "credit" | "debit"
  category?: string
  reference?: string
  creditorName?: string
  debtorName?: string
}

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(true)

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails()
      fetchTransactions()
    }
  }, [accountId])

  const fetchAccountDetails = async () => {
    try {
      const res = await fetch("/api/accounts")
      const accounts = await res.json()
      const foundAccount = accounts.find((acc: Account) => acc.id === accountId)
      setAccount(foundAccount || null)
    } catch (error) {
      console.error("Error fetching account details:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true)
      const res = await fetch(`/api/accounts/${accountId}/transactions`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      } else {
        console.error("Error fetching transactions:", res.statusText)
        setTransactions([])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

  const syncAccount = async () => {
    setSyncing(true)
    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: "POST" })
      await fetchAccountDetails()
      await fetchTransactions()
    } catch (error) {
      console.error("Error syncing account:", error)
    } finally {
      setSyncing(false)
    }
  }

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getTransactionStats = () => {
    const totalIncome = transactions.filter((tx) => tx.type === "credit").reduce((sum, tx) => sum + tx.amount, 0)

    const totalExpenses = transactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    return { totalIncome, totalExpenses }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  if (!account) {
    return (
      <Layout>
        <div className="text-center py-16">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-6">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Cuenta no encontrada</h2>
          <p className="text-muted-foreground mb-6">La cuenta que buscas no existe o no tienes acceso a ella.</p>
          <Button onClick={() => router.push("/accounts")} className="bg-primary hover:bg-primary/90">
            Volver a Cuentas
          </Button>
        </div>
      </Layout>
    )
  }

  const stats = getTransactionStats()

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/accounts")}
            className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Cuentas
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-border/50">
              <CardHeader className="pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-heading font-black text-foreground">
                      {account.display_name}
                    </CardTitle>
                    <p className="text-muted-foreground flex items-center gap-2 mt-2">
                      <Building2 className="h-4 w-4" />
                      {account.institution_name}
                    </p>
                  </div>
                  <Badge
                    variant={account.status === "ACTIVE" ? "default" : "secondary"}
                    className={account.status === "ACTIVE" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {account.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">IBAN</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium">{account.iban}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(account.iban)}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Moneda</p>
                    <p className="font-medium text-foreground">{account.currency}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-6 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-primary font-medium mb-1">Saldo Actual</p>
                      <p className="text-4xl font-heading font-black text-primary">
                        {formatCurrency(account.current_balance, account.currency)}
                      </p>
                      <p className="text-xs text-primary/70 mt-2">
                        Actualizado: {new Date(account.balance_last_updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-full">
                      {account.current_balance >= 0 ? (
                        <ArrowUpRight className="h-8 w-8 text-primary" />
                      ) : (
                        <ArrowDownRight className="h-8 w-8 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <Button onClick={syncAccount} disabled={syncing} className="w-full bg-secondary hover:bg-secondary/90">
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sincronizar Cuenta
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-accent" />
                  Resumen del Mes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-700">Ingresos</span>
                  <span className="font-bold text-green-600">{formatCurrency(stats.totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-700">Gastos</span>
                  <span className="font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                    <span className="text-sm font-bold text-primary">Balance Neto</span>
                    <span
                      className={`font-heading font-black ${
                        stats.totalIncome - stats.totalExpenses >= 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(stats.totalIncome - stats.totalExpenses)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
              <TrendingUp className="h-6 w-6 text-accent" />
              Transacciones de esta Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Cargando transacciones...</span>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Todas ({transactions.length})</TabsTrigger>
                  <TabsTrigger value="credit">
                    Ingresos ({transactions.filter((tx) => tx.type === "credit").length})
                  </TabsTrigger>
                  <TabsTrigger value="debit">
                    Gastos ({transactions.filter((tx) => tx.type === "debit").length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  <TransactionsList
                    transactions={transactions}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                </TabsContent>

                <TabsContent value="credit" className="space-y-4">
                  <TransactionsList
                    transactions={transactions.filter((tx) => tx.type === "credit")}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                </TabsContent>

                <TabsContent value="debit" className="space-y-4">
                  <TransactionsList
                    transactions={transactions.filter((tx) => tx.type === "debit")}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

function TransactionsList({
  transactions,
  formatCurrency,
  formatDate,
}: {
  transactions: Transaction[]
  formatCurrency: (amount: number, currency?: string) => string
  formatDate: (date: string) => string
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No hay transacciones para mostrar en esta cuenta</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                transaction.type === "credit" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {transaction.type === "credit" ? (
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{transaction.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(transaction.date)}</span>
                {transaction.category && (
                  <>
                    <span>•</span>
                    <span>{transaction.category}</span>
                  </>
                )}
              </div>
              {transaction.reference && (
                <p className="text-xs text-muted-foreground font-mono mt-1">Ref: {transaction.reference}</p>
              )}
              {(transaction.creditorName || transaction.debtorName) && (
                <p className="text-xs text-muted-foreground">
                  {transaction.type === "credit" ? transaction.debtorName : transaction.creditorName}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p
              className={`font-heading font-bold text-lg ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}
            >
              {transaction.type === "credit" ? "+" : "-"}
              {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
