"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../components/layout"
import { StatCard } from "../components/dashboard/stat-card"
import { QuickActionCard } from "../components/dashboard/quick-action-card"
import { RecentTransactions } from "../components/dashboard/recent-transactions"
import { AccountsSummary } from "../components/dashboard/accounts-summary"
import { BalanceChart } from "../components/dashboard/balance-chart"
import { ConnectedBanksGrid } from "../components/dashboard/connected-banks-grid"
import { Building2, CreditCard, TrendingUp, Users, Zap, AlertTriangle } from "lucide-react"

interface DashboardStats {
  totalAccounts: number
  totalTransactions: number
  connectedInstitutions: number
  lastSync: string | null
  daysUntilRenewal: number
  dailyApiCalls: number
  maxDailyApiCalls: number
  apiCallsRemaining: number
}

export default function HomePage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    totalTransactions: 0,
    connectedInstitutions: 0,
    lastSync: null,
    daysUntilRenewal: 90,
    dailyApiCalls: 0,
    maxDailyApiCalls: 300,
    apiCallsRemaining: 300,
  })

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats")
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const getApiUsagePercentage = () => {
    return Math.round((stats.dailyApiCalls / stats.maxDailyApiCalls) * 100)
  }

  const getRenewalStatus = () => {
    if (stats.daysUntilRenewal <= 7) return { color: "text-red-600", status: "Crítico" }
    if (stats.daysUntilRenewal <= 30) return { color: "text-yellow-600", status: "Atención" }
    return { color: "text-green-600", status: "Activo" }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Gestión de conexiones bancarias GoCardless</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stats.totalAccounts > 0 ? "bg-green-500" : "bg-gray-400"}`}></div>
            <span className="text-sm text-gray-600">{stats.totalAccounts > 0 ? "Conectado" : "Sin conexiones"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Cuentas Conectadas"
            value={stats.totalAccounts}
            icon={CreditCard}
            iconColor="text-blue-600"
          />
          <StatCard
            title="Transacciones"
            value={stats.totalTransactions}
            icon={TrendingUp}
            iconColor="text-green-600"
          />
          <StatCard
            title="Bancos Conectados"
            value={stats.connectedInstitutions}
            icon={Building2}
            iconColor="text-purple-600"
          />
          <StatCard
            title="Última Sincronización"
            value={stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : "Nunca"}
            icon={Users}
            iconColor="text-orange-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Llamadas API Hoy</p>
                <p className="text-2xl font-bold">
                  {stats.dailyApiCalls}/{stats.maxDailyApiCalls}
                </p>
                <p className="text-sm text-gray-500">{getApiUsagePercentage()}% usado</p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getApiUsagePercentage()}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Llamadas Restantes</p>
                <p className="text-2xl font-bold">{stats.apiCallsRemaining}</p>
                <p className="text-sm text-gray-500">Se renueva en 24h</p>
              </div>
              <AlertTriangle
                className={`h-8 w-8 ${stats.apiCallsRemaining < 50 ? "text-red-600" : "text-green-600"}`}
              />
            </div>
          </div>
        </div>

        <ConnectedBanksGrid />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BalanceChart />
          <AccountsSummary />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 gap-4">
              <QuickActionCard
                title="Conectar Banco"
                description="Añade una nueva conexión bancaria"
                icon={Building2}
                onClick={() => router.push("/connect")}
              />
              <QuickActionCard
                title="Gestionar Cuentas"
                description="Ver y administrar cuentas conectadas"
                icon={CreditCard}
                onClick={() => router.push("/accounts")}
              />
              <QuickActionCard
                title="Ver Transacciones"
                description="Revisar movimientos y categorías"
                icon={TrendingUp}
                onClick={() => router.push("/transactions")}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
