"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Search, TrendingUp, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

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

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalTransactions: number
  transactionsPerPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [currentPage])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== "") {
        setCurrentPage(1)
        fetchTransactions()
      } else if (searchTerm === "") {
        fetchTransactions()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const fetchTransactions = async () => {
    try {
      if (searchTerm !== "") {
        setSearchLoading(true)
      } else {
        setLoading(true)
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        ...(searchTerm && { search: searchTerm }),
      })

      const res = await fetch(`/api/transactions?${params}`)
      const data = await res.json()

      if (res.ok) {
        const transformedTransactions: Transaction[] = data.transactions.map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          date: tx.date,
          type: tx.type,
          category: tx.category || "Sin categoría",
          account_name: tx.account_name,
          account_id: tx.account_id || "unknown",
        }))

        setTransactions(transformedTransactions)
        setPagination(data.pagination)
      } else {
        console.error("Error fetching transactions:", data.error)
        setTransactions([])
        setPagination(null)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      setTransactions([])
      setPagination(null)
    } finally {
      setLoading(false)
      setSearchLoading(false)
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
    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter

    return matchesType && matchesCategory
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

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (pagination?.hasPreviousPage) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (pagination?.hasNextPage) {
      setCurrentPage(currentPage + 1)
    }
  }

  if (loading && currentPage === 1) {
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
            <p className="text-gray-600">
              {pagination
                ? `${pagination.totalTransactions} transacciones totales - Página ${pagination.currentPage} de ${pagination.totalPages}`
                : "Historial completo de movimientos"}
            </p>
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
                  <p className="text-xl font-bold">{pagination?.totalTransactions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Ingresos (página)</p>
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
                  <p className="text-sm text-gray-600">Gastos (página)</p>
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
                  <p className="text-sm text-gray-600">Balance (página)</p>
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
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  <Input
                    placeholder="Buscar en todas las transacciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
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
            <CardTitle>
              Transacciones ({filteredTransactions.length} de {pagination?.transactionsPerPage || 50} en esta página)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredTransactions.length === 0 ? (
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

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Mostrando {(pagination.currentPage - 1) * pagination.transactionsPerPage + 1} -{" "}
                  {Math.min(pagination.currentPage * pagination.transactionsPerPage, pagination.totalTransactions)} de{" "}
                  {pagination.totalTransactions} transacciones
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={!pagination.hasPreviousPage || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1
                      } else if (pagination.currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          disabled={loading}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!pagination.hasNextPage || loading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
