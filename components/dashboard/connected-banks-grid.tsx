"use client"

import { useState, useEffect } from "react"
import { Building2, Clock, CreditCard, AlertTriangle, CheckCircle } from "lucide-react"

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banksData.connectedBanks.map((bank) => {
          const renewalStatus = getRenewalStatus(bank.daysUntilRenewal)
          const StatusIcon = renewalStatus.icon

          return (
            <div key={bank.bankId} className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {bank.logo ? (
                    <img src={bank.logo || "/placeholder.svg"} alt={bank.bankName} className="w-8 h-8 rounded" />
                  ) : (
                    <Building2 className="h-8 w-8 text-blue-600" />
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">{bank.bankName}</h4>
                    {bank.bic && <p className="text-xs text-gray-500">{bank.bic}</p>}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full border ${renewalStatus.color}`}>
                  <StatusIcon className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Balance Total</p>
                  <p className="text-xl font-bold text-gray-900">{formatBalance(bank.totalBalance, bank.currency)}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Cuentas</p>
                    <p className="font-semibold flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      {bank.accounts.length}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Renovación</p>
                    <p className={`font-semibold ${renewalStatus.color.split(" ")[0]}`}>{bank.daysUntilRenewal} días</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
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
