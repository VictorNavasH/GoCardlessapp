"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  description: string
  date: string
  type: "credit" | "debit"
  account_name: string
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentTransactions()
  }, [])

  const fetchRecentTransactions = async () => {
    try {
      // Simular datos de transacciones recientes
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockTransactions: Transaction[] = [
        {
          id: "tx_1",
          amount: -45.67,
          currency: "EUR",
          description: "Supermercado El Corte Inglés",
          date: new Date().toISOString(),
          type: "debit",
          account_name: "Cuenta Corriente",
        },
        {
          id: "tx_2",
          amount: 2500.0,
          currency: "EUR",
          description: "Nómina - Empresa ABC",
          date: new Date(Date.now() - 86400000).toISOString(),
          type: "credit",
          account_name: "Cuenta Nómina",
        },
        {
          id: "tx_3",
          amount: -12.5,
          currency: "EUR",
          description: "Netflix Subscription",
          date: new Date(Date.now() - 172800000).toISOString(),
          type: "debit",
          account_name: "Cuenta Corriente",
        },
        {
          id: "tx_4",
          amount: -89.99,
          currency: "EUR",
          description: "Gasolinera Repsol",
          date: new Date(Date.now() - 259200000).toISOString(),
          type: "debit",
          account_name: "Cuenta Corriente",
        },
      ]

      setTransactions(mockTransactions)
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(Math.abs(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacciones Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${transaction.type === "credit" ? "bg-green-100" : "bg-red-100"}`}>
                  {transaction.type === "credit" ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{transaction.description}</p>
                  <p className="text-xs text-gray-500">{transaction.account_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                  {transaction.type === "credit" ? "+" : "-"}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </p>
                <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
