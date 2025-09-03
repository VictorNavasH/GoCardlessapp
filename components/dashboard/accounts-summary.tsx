"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Eye, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface AccountSummary {
  id: string
  display_name: string
  iban: string
  current_balance: number
  currency: string
  status: string
  institution_name: string
}

export function AccountsSummary() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccountsSummary()
  }, [])

  const fetchAccountsSummary = async () => {
    try {
      const res = await fetch("/api/accounts")
      const data = await res.json()
      // Mostrar solo las primeras 3 cuentas en el resumen
      setAccounts(data.slice(0, 3))
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const getTotalBalance = () => {
    const balancesByCurrency = accounts.reduce(
      (acc, account) => {
        if (!acc[account.currency]) {
          acc[account.currency] = 0
        }
        acc[account.currency] += account.current_balance
        return acc
      },
      {} as Record<string, number>,
    )

    // Return the EUR balance, or the first available currency
    return balancesByCurrency.EUR || Object.values(balancesByCurrency)[0] || 0
  }

  const getDisplayCurrency = () => {
    const currencies = [...new Set(accounts.map((acc) => acc.currency))]
    return currencies.includes("EUR") ? "EUR" : currencies[0] || "EUR"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resumen de Cuentas</CardTitle>
        <Button variant="outline" size="sm" onClick={() => router.push("/accounts")}>
          Ver Todas
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Balance Total</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(getTotalBalance(), getDisplayCurrency())}
            </p>
            {accounts.length > 0 && new Set(accounts.map((acc) => acc.currency)).size > 1 && (
              <p className="text-xs text-blue-500 mt-1">* Solo cuentas en {getDisplayCurrency()}</p>
            )}
          </div>

          {/* Lista de cuentas */}
          {accounts.length === 0 ? (
            <div className="text-center py-6">
              <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No hay cuentas conectadas</p>
              <Button size="sm" className="mt-2" onClick={() => router.push("/connect")}>
                Conectar Cuenta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{account.display_name}</p>
                      <Badge variant={account.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {account.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{account.institution_name}</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {account.iban.slice(0, 8)}...{account.iban.slice(-4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(account.current_balance, account.currency)}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                      className="h-6 w-6 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
