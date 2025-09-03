"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Layout from "../../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, RefreshCw, TrendingUp, Calendar, Building2, Copy, Loader2 } from "lucide-react"

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
}

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails()
      fetchTransactions()
    }
  }, [accountId])

  const fetchAccountDetails = async () => {
    try {
      // Simular obtener detalles de cuenta específica
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
      // Simular transacciones para esta cuenta
      const mockTransactions: Transaction[] = [
        {
          id: "tx_1",
          amount: -45.67,
          currency: "EUR",
          description: "Supermercado El Corte Inglés",
          date: new Date().toISOString(),
          type: "debit",
          category: "Alimentación",
          reference: "REF123456",
        },
        {
          id: "tx_2",
          amount: 2500.0,
          currency: "EUR",
          description: "Nómina - Empresa ABC",
          date: new Date(Date.now() - 86400000).toISOString(),
          type: "credit",
          category: "Salario",
          reference: "SAL202401",
        },
        {
          id: "tx_3",
          amount: -12.5,
          currency: "EUR",
          description: "Netflix Subscription",
          date: new Date(Date.now() - 172800000).toISOString(),
          type: "debit",
          category: "Entretenimiento",
          reference: "NETFLIX001",
        },
        {
          id: "tx_4",
          amount: -89.99,
          currency: "EUR",
          description: "Gasolinera Repsol",
          date: new Date(Date.now() - 259200000).toISOString(),
          type: "debit",
          category: "Transporte",
          reference: "REPSOL789",
        },
        {
          id: "tx_5",
          amount: -25.0,
          currency: "EUR",
          description: "Farmacia San Pablo",
          date: new Date(Date.now() - 345600000).toISOString(),
          type: "debit",
          category: "Salud",
          reference: "FARM456",
        },
      ]

      setTransactions(mockTransactions)
    } catch (error) {
      console.error("Error fetching transactions:", error)
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
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!account) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cuenta no encontrada</h2>
          <p className="text-gray-600 mb-4">La cuenta que buscas no existe o no tienes acceso a ella.</p>
          <Button onClick={() => router.push("/accounts")}>Volver a Cuentas</Button>
        </div>
      </Layout>
    )
  }

  const stats = getTransactionStats()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/accounts")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Cuentas
          </Button>
        </div>

        {/* Account Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{account.display_name}</CardTitle>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {account.institution_name}
                    </p>
                  </div>
                  <Badge variant={account.status === "ACTIVE" ? "default" : "secondary"} className="text-sm">
                    {account.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">IBAN</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">{account.iban}</p>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(account.iban)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Moneda</p>
                    <p className="font-medium">{account.currency}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Saldo Actual</p>
                  <p className="text-3xl font-bold text-green-700">
                    {formatCurrency(account.current_balance, account.currency)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Actualizado: {new Date(account.balance_last_updated_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <Button onClick={syncAccount} disabled={syncing} className="w-full">
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sincronizar Cuenta
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen del Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos</span>
                  <span className="font-medium text-green-600">{formatCurrency(stats.totalIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gastos</span>
                  <span className="font-medium text-red-600">{formatCurrency(stats.totalExpenses)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Balance</span>
                  <span
                    className={`font-bold ${
                      stats.totalIncome - stats.totalExpenses >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(stats.totalIncome - stats.totalExpenses)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Transacciones Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="credit">Ingresos</TabsTrigger>
                <TabsTrigger value="debit">Gastos</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <TransactionsList transactions={transactions} formatCurrency={formatCurrency} formatDate={formatDate} />
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
      <div className="text-center py-8">
        <p className="text-gray-500">No hay transacciones para mostrar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                transaction.type === "credit" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {transaction.type === "credit" ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />
              )}
            </div>
            <div>
              <p className="font-medium">{transaction.description}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(transaction.date)}</span>
                {transaction.category && (
                  <>
                    <span>•</span>
                    <span>{transaction.category}</span>
                  </>
                )}
              </div>
              {transaction.reference && <p className="text-xs text-gray-400 font-mono">Ref: {transaction.reference}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className={`font-bold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
              {transaction.type === "credit" ? "+" : "-"}
              {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
