"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, RefreshCw, Eye, Search, Filter, Plus, Loader2 } from "lucide-react"

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

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts")
      const data = await res.json()
      setAccounts(data)
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  const syncAccount = async (accountId: string) => {
    setSyncingAccounts((prev) => new Set(prev).add(accountId))

    try {
      await fetch(`/api/accounts/${accountId}/sync`, { method: "POST" })
      // Refrescar la lista después de sincronizar
      await fetchAccounts()
    } catch (error) {
      console.error("Error syncing account:", error)
    } finally {
      setSyncingAccounts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const formatIban = (iban: string) => {
    return `${iban.slice(0, 8)}...${iban.slice(-4)}`
  }

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.institution_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.iban.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || account.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const getTotalBalance = () => {
    return filteredAccounts.reduce((total, account) => total + account.current_balance, 0)
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Cuentas Bancarias</h1>
            <p className="text-gray-600">Gestiona tus cuentas conectadas</p>
          </div>
          <Button onClick={() => router.push("/connect")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Conectar Nueva Cuenta
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-blue-600">Total de Cuentas</p>
                <p className="text-2xl font-bold text-blue-900">{filteredAccounts.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Balance Total</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(getTotalBalance())}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Cuentas Activas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredAccounts.filter((acc) => acc.status === "ACTIVE").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, banco o IBAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts List */}
        {filteredAccounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {accounts.length === 0 ? "No hay cuentas conectadas" : "No se encontraron cuentas"}
              </h3>
              <p className="text-gray-500 mb-4">
                {accounts.length === 0
                  ? "Conecta tu primera cuenta bancaria para comenzar"
                  : "Intenta ajustar los filtros de búsqueda"}
              </p>
              {accounts.length === 0 && <Button onClick={() => router.push("/connect")}>Conectar Cuenta</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{account.display_name}</CardTitle>
                      <p className="text-sm text-gray-600">{account.institution_name}</p>
                    </div>
                    <Badge variant={account.status === "ACTIVE" ? "default" : "secondary"}>{account.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">IBAN</p>
                    <p className="font-mono text-sm">{formatIban(account.iban)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Saldo Actual</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(account.current_balance, account.currency)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Actualizado: {new Date(account.balance_last_updated_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => syncAccount(account.id)}
                      disabled={syncingAccounts.has(account.id)}
                      className="flex-1"
                    >
                      {syncingAccounts.has(account.id) ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Sincronizar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/accounts/${account.id}`)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
