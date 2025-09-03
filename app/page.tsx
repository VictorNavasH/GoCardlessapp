"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../components/layout"
import { StatCard } from "../components/dashboard/stat-card"
import { QuickActionCard } from "../components/dashboard/quick-action-card"
import { RecentTransactions } from "../components/dashboard/recent-transactions"
import { AccountsSummary } from "../components/dashboard/accounts-summary"
import { BalanceChart } from "../components/dashboard/balance-chart"
import { Building2, CreditCard, TrendingUp, Users } from "lucide-react"

interface DashboardStats {
  totalAccounts: number
  totalTransactions: number
  connectedInstitutions: number
  lastSync: string | null
}

export default function HomePage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    totalTransactions: 0,
    connectedInstitutions: 0,
    lastSync: null,
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Gestión de conexiones bancarias GoCardless</p>
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
