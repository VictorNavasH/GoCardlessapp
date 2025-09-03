"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MockAccount {
  id: string
  name: string
  iban: string
  balance: number
}

const mockAccounts: MockAccount[] = [
  { id: "acc_1", name: "Cuenta Corriente Principal", iban: "ES9121000418450200051332", balance: 2847.65 },
  { id: "acc_2", name: "Cuenta de Ahorro", iban: "ES8000491500051234567892", balance: 15234.12 },
]

const institutions = [
  { id: "BBVAESMMXXX", name: "BBVA España" },
  { id: "BSCHESMMXXX", name: "Santander España" },
  { id: "CAIXESBBXXX", name: "CaixaBank" },
]

export default function BankSimulator() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requisition_id = searchParams.get("requisition_id")
  const institution_id = searchParams.get("institution_id")
  const redirect_url = searchParams.get("redirect_url")

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const handleAuthorize = async () => {
    if (selectedAccounts.length === 0) return

    setLoading(true)

    // Simular procesamiento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Actualizar estado de requisition a "LN" (Linked)
    await fetch("/api/requisitions/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requisition_id,
        status: "LN",
        accounts: selectedAccounts,
      }),
    })

    // Redirigir de vuelta a la app
    if (redirect_url) {
      window.location.href = `${redirect_url}?ref=${requisition_id}`
    }
  }

  const handleReject = () => {
    // Redirigir con error
    if (redirect_url) {
      window.location.href = `${redirect_url}?ref=${requisition_id}&error=user_rejected`
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Autorización Bancaria</CardTitle>
          <CardDescription>
            Simulador de {institutions.find((i) => i.id === institution_id)?.name || "Banco"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              Esta es una simulación de la página de autorización de tu banco. En producción serías redirigido a la web
              oficial del banco.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">Selecciona las cuentas a conectar:</h3>
            {mockAccounts.map((account) => (
              <div key={account.id} className="flex items-center space-x-2 p-2 border rounded mb-2">
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(account.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAccounts([...selectedAccounts, account.id])
                    } else {
                      setSelectedAccounts(selectedAccounts.filter((id) => id !== account.id))
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.iban}</p>
                  <p className="text-sm text-green-600">{formatCurrency(account.balance)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAuthorize} disabled={selectedAccounts.length === 0 || loading} className="flex-1">
              {loading ? "Procesando..." : "Autorizar Acceso"}
            </Button>
            <Button variant="outline" onClick={handleReject} disabled={loading} className="flex-1 bg-transparent">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
