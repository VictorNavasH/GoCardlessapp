"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CreditCard,
  RefreshCw,
  Eye,
  Search,
  Filter,
  Plus,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-heading font-black text-foreground">Cuentas Bancarias</h1>
            <p className="text-muted-foreground mt-2">Gestiona y supervisa todas tus cuentas conectadas</p>
          </div>
          <Button
            onClick={() => router.push("/connect")}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Conectar Nueva Cuenta
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20 shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">Total de Cuentas</p>
                </div>
                <p className="text-3xl font-heading font-black text-primary">{filteredAccounts.length}</p>
              </div>
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm font-medium text-accent">Balance Total</p>
                </div>
                <p className="text-3xl font-heading font-black text-accent">{formatCurrency(getTotalBalance())}</p>
              </div>
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-green-600">Cuentas Activas</p>
                </div>
                <p className="text-3xl font-heading font-black text-green-600">
                  {filteredAccounts.filter((acc) => acc.status === "ACTIVE").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, banco o IBAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
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
          <Card className="shadow-sm">
            <CardContent className="text-center py-16">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-6">
                <CreditCard className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">
                {accounts.length === 0 ? "No hay cuentas conectadas" : "No se encontraron cuentas"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {accounts.length === 0
                  ? "Conecta tu primera cuenta bancaria para comenzar a gestionar tus finanzas"
                  : "Intenta ajustar los filtros de búsqueda para encontrar las cuentas que buscas"}
              </p>
              {accounts.length === 0 && (
                <Button onClick={() => router.push("/connect")} className="bg-primary hover:bg-primary/90">
                  Conectar Primera Cuenta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => (
              <Card
                key={account.id}
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-heading font-bold text-foreground">
                        {account.display_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{account.institution_name}</p>
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
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                    <p className="font-mono text-sm font-medium">{formatIban(account.iban)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Actual</p>
                      <p className="text-2xl font-heading font-black text-primary">
                        {formatCurrency(account.current_balance, account.currency)}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-full">
                      {account.current_balance >= 0 ? (
                        <ArrowUpRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Actualizado: {new Date(account.balance_last_updated_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => syncAccount(account.id)}
                      disabled={syncingAccounts.has(account.id)}
                      className="flex-1 bg-secondary hover:bg-secondary/90"
                    >
                      {syncingAccounts.has(account.id) ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Sincronizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver Detalles
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
