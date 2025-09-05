"use client"

import { useState, useEffect } from "react"
import { Building2, Clock, CreditCard, AlertTriangle, CheckCircle, Activity } from "lucide-react"

interface ConnectedBank {
  bankId: string
  bankName: string
  logo?: string
  bic?: string
  accounts: Array<{
    id: string
    gocardless_id: string
    display_name: string
    iban: string
    status: string
    balance: number
  }>
  totalBalance: number
  currency: string
  daysUntilRenewal: number
  expirationDate: string
  connectedAt: string
  status: string
  apiCalls: {
    today: number
    remaining: number
    maxDaily: number
    scopes: {
      details: { used: number; remaining: number }
      balances: { used: number; remaining: number }
      transactions: { used: number; remaining: number }
    }
  }
}

interface ConnectedBanksData {
  connectedBanks: ConnectedBank[]
  totalBanks: number
  totalAccounts: number
}

export function ConnectedBanksGrid() {
  const [banksData, setBanksData] = useState<ConnectedBanksData>({
    connectedBanks: [],
    totalBanks: 0,
    totalAccounts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConnectedBanks()
  }, [])

  const fetchConnectedBanks = async () => {
    try {
      const res = await fetch("/api/dashboard/connected-banks")
      const data = await res.json()

      if (data.error) {
        console.error("API Error:", data.error)
        setBanksData({
          connectedBanks: [],
          totalBanks: 0,
          totalAccounts: 0,
        })
      } else {
        setBanksData(data)
      }
    } catch (error) {
      console.error("Error fetching connected banks:", error)
      setBanksData({
        connectedBanks: [],
        totalBanks: 0,
        totalAccounts: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const getRenewalStatus = (days: number) => {
    if (days <= 7) return { color: "text-red-600 bg-red-50 border-red-200", status: "Crítico", icon: AlertTriangle }
    if (days <= 30) return { color: "text-yellow-600 bg-yellow-50 border-yellow-200", status: "Atención", icon: Clock }
    return { color: "text-green-600 bg-green-50 border-green-200", status: "Activo", icon: CheckCircle }
  }

  const getApiCallsStatus = (apiCalls: ConnectedBank["apiCalls"]) => {
    const usagePercentage = (apiCalls.today / apiCalls.maxDaily) * 100

    if (usagePercentage >= 90) return { color: "text-red-600 bg-red-50", status: "Límite crítico" }
    if (usagePercentage >= 70) return { color: "text-yellow-600 bg-yellow-50", status: "Uso alto" }
    return { color: "text-green-600 bg-green-50", status: "Disponible" }
  }

  const formatBalance = (balance: number, currency: string) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(balance)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Bancos Conectados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (banksData.connectedBanks.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Bancos Conectados</h3>
        <div className="bg-white p-8 rounded-lg border text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay bancos conectados</p>
          <p className="text-sm text-gray-500 mt-2">Conecta tu primer banco para comenzar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bancos Conectados</h3>
        <span className="text-sm text-gray-500">
          {banksData.totalBanks} {banksData.totalBanks === 1 ? "banco" : "bancos"} • {banksData.totalAccounts}{" "}
          {banksData.totalAccounts === 1 ? "cuenta" : "cuentas"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banksData.connectedBanks.map((bank) => {
          const renewalStatus = getRenewalStatus(bank.daysUntilRenewal)
          const StatusIcon = renewalStatus.icon
          const apiStatus = getApiCallsStatus(bank.apiCalls)

          return (
            <div
              key={bank.bankId}
              className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {bank.logo ? (
                    <img
                      src={bank.logo || "/placeholder.svg"}
                      alt={bank.bankName}
                      className="w-10 h-10 rounded-lg object-contain"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-blue-600" />
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{bank.bankName}</h4>
                    {bank.bic && <p className="text-xs text-gray-500 font-mono">{bank.bic}</p>}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full border ${renewalStatus.color}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Balance Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatBalance(bank.totalBalance, bank.currency)}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900">Llamadas API Hoy</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${apiStatus.color}`}>{apiStatus.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-blue-900">{bank.apiCalls.today}</span>
                    <span className="text-sm text-blue-700">de {bank.apiCalls.maxDaily}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-700">Restantes</span>
                      <span className="text-xs font-medium text-blue-900">{bank.apiCalls.remaining}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (bank.apiCalls.today / bank.apiCalls.maxDaily) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-600">Cuentas</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{bank.accounts.length}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-600">Renovación</p>
                    </div>
                    <p className={`text-lg font-bold ${renewalStatus.color.split(" ")[0]}`}>{bank.daysUntilRenewal}d</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Uso por endpoint:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-600">Detalles</p>
                      <p className="font-medium">
                        {bank.apiCalls.scopes.details.used}/
                        {bank.apiCalls.scopes.details.used + bank.apiCalls.scopes.details.remaining}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Balances</p>
                      <p className="font-medium">
                        {bank.apiCalls.scopes.balances.used}/
                        {bank.apiCalls.scopes.balances.used + bank.apiCalls.scopes.balances.remaining}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Transacciones</p>
                      <p className="font-medium">
                        {bank.apiCalls.scopes.transactions.used}/
                        {bank.apiCalls.scopes.transactions.used + bank.apiCalls.scopes.transactions.remaining}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Conectado: {formatDate(bank.connectedAt)}</span>
                    <span>Expira: {formatDate(bank.expirationDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
