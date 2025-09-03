"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Search, TrendingUp, Download, Loader2 } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  description: string
  date: string
  type: "credit" | "debit"
  category?: string
  account_name: string
  account_id: string
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      // Simular transacciones de todas las cuentas
      const mockTransactions: Transaction[] = [
        {
          id: "tx_1",
          amount: -45.67,
          currency: "EUR",
          description: "Supermercado El Corte Inglés",
          date: new Date().toISOString(),
          type: "debit",
          category: "Alimentación",
          account_name: "Cuenta Corriente",
          account_id: "acc_1",
        },
        {
          id: "tx_2",
          amount: 2500.0,
          currency: "EUR",
          description: "Nómina - Empresa ABC",
          date: new Date(Date.now() - 86400000).toISOString(),
          type: "credit",
          category: "Salario",
          account_name: "Cuenta Nómina",
          account_id: "acc_3",
        },
        {
          id: "tx_3",
          amount: -12.5,
          currency: "EUR",
          description: "Netflix Subscription",
          date: new Date(Date.now() - 172800000).toISOString(),
          type: "debit",
          category: "Entretenimiento",
          account_name: "Cuenta Corriente",
          account_id: "acc_1",
        },
        {
          id: "tx_4",
          amount: -89.99,
          currency: "EUR",
          description: "Gasolinera Repsol",
          date: new Date(Date.now() - 259200000).toISOString(),
          type: "debit",
          category: "Transporte",
          account_name: "Cuenta Corriente",
          account_id: "acc_1",
        },
        {
          id: "tx_5",
          amount: 150.0,
          currency: "EUR",
          description: "Transferencia de Juan",
          date: new Date(Date.now() - 345600000).toISOString(),
          type: "credit",
          category: "Transferencias",
          account_name: "Cuenta de Ahorro",
          account_id: "acc_2",
        },
      ]

      setTransactions(mockTransactions)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
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

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.category && transaction.category.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter

    return matchesSearch && matchesType && matchesCategory
  })

  const getUniqueCategories = () => {
    const categories = transactions
      .map((tx) => tx.category)
      .filter((category): category is string => category !== undefined)
    return [...new Set(categories)]
  }

  const getTransactionStats = () => {
    const totalIncome = filteredTransactions
      .filter((tx) => tx.type === "credit")
      .reduce((sum, tx) => sum + tx.amount, 0)

    const totalExpenses = filteredTransactions
      .filter((tx) => tx.type === "debit")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    return { totalIncome, totalExpenses, count: filteredTransactions.length }
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

  const stats = getTransactionStats()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Transacciones</h1>
            <p className="text-gray-600">Historial completo de movimientos</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Transacciones</p>
                  <p className="text-xl font-bold">{stats.count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Ingresos</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                <div>
                  <p className="text-sm text-gray-600">Gastos</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Balance</p>
                  <p
                    className={`text-xl font-bold ${
                      stats.totalIncome - stats.totalExpenses >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(stats.totalIncome - stats.totalExpenses)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar transacciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="credit">Ingresos</SelectItem>
                    <SelectItem value="debit">Gastos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron transacciones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/accounts/${transaction.account_id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === "credit" ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        <TrendingUp
                          className={`h-5 w-5 ${
                            transaction.type === "credit" ? "text-green-600" : "text-red-600 rotate-180"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(transaction.date)}</span>
                          <span>•</span>
                          <span>{transaction.account_name}</span>
                          {transaction.category && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs">
                                {transaction.category}
                              </Badge>
                            </>
                          )}
                        </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
