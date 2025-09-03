"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface BalanceData {
  date: string
  balance: number
}

export function BalanceChart() {
  const [balanceData, setBalanceData] = useState<BalanceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBalanceHistory()
  }, [])

  const fetchBalanceHistory = async () => {
    try {
      // Simular datos de historial de balance
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockData: BalanceData[] = []
      const today = new Date()

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)

        mockData.push({
          date: date.toISOString().split("T")[0],
          balance: 18000 + Math.random() * 2000 - 1000, // Balance base con variación
        })
      }

      setBalanceData(mockData)
    } catch (error) {
      console.error("Error fetching balance history:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })
  }

  const getBalanceChange = () => {
    if (balanceData.length < 2) return { amount: 0, percentage: 0 }

    const current = balanceData[balanceData.length - 1].balance
    const previous = balanceData[balanceData.length - 2].balance
    const change = current - previous
    const percentage = (change / previous) * 100

    return { amount: change, percentage }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución del Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const balanceChange = getBalanceChange()
  const currentBalance = balanceData[balanceData.length - 1]?.balance || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución del Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance actual y cambio */}
          <div>
            <p className="text-2xl font-bold">{formatCurrency(currentBalance)}</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${balanceChange.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {balanceChange.amount >= 0 ? "+" : ""}
                {formatCurrency(balanceChange.amount)}
              </span>
              <span className={`text-xs ${balanceChange.percentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                ({balanceChange.percentage >= 0 ? "+" : ""}
                {balanceChange.percentage.toFixed(1)}%)
              </span>
              <span className="text-xs text-gray-500">vs ayer</span>
            </div>
          </div>

          {/* Gráfico simple con barras */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Últimos 7 días</p>
            <div className="flex items-end gap-1 h-20">
              {balanceData.map((data, index) => {
                const maxBalance = Math.max(...balanceData.map((d) => d.balance))
                const minBalance = Math.min(...balanceData.map((d) => d.balance))
                const range = maxBalance - minBalance
                const height = range > 0 ? ((data.balance - minBalance) / range) * 60 + 10 : 35

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${height}px` }}
                      title={`${formatDate(data.date)}: ${formatCurrency(data.balance)}`}
                    />
                    <span className="text-xs text-gray-500 mt-1">{formatDate(data.date)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
