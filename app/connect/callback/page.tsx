"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Layout from "../../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConnectionSteps } from "../../../components/connect/connection-steps"
import { Loader2, CheckCircle, AlertCircle, CreditCard, ArrowLeft } from "lucide-react"

interface Account {
  id: string
  name: string
  iban: string
}

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get("ref")
  const error = searchParams.get("error")

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [message, setMessage] = useState("Procesando autorización...")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    processCallback()
  }, [])

  const processCallback = async () => {
    if (error) {
      setStatus("error")
      setMessage("El usuario canceló la autorización o ocurrió un error en el banco")
      return
    }

    if (!ref) {
      setStatus("error")
      setMessage("Referencia de requisition no encontrada")
      return
    }

    try {
      console.log("[v0] Processing callback for ref:", ref)

      // Simular progreso de procesamiento
      setProgress(25)
      setMessage("Verificando autorización...")
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Verificar estado de la requisition
      setProgress(50)
      setMessage("Obteniendo información de cuentas...")
      const res = await fetch(`/api/requisitions/status/${ref}`)
      const data = await res.json()

      console.log("[v0] Requisition status response:", data)

      if (data.status === "LN") {
        setProgress(75)
        setMessage("Configurando cuentas...")

        // Autorización exitosa, obtener cuentas
        const accountsRes = await fetch(`/api/requisitions/accounts/${ref}`)
        const accountsData = await accountsRes.json()

        console.log("[v0] Accounts data:", accountsData)

        setProgress(100)
        setAccounts(accountsData.accounts)
        setStatus("success")
        setMessage("¡Conexión exitosa! Tus cuentas han sido vinculadas.")

        // Iniciar sincronización inicial
        setTimeout(() => {
          fetch("/api/sync/initial", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accounts: accountsData.accounts }),
          })
        }, 2000)
      } else if (data.status === "RJ") {
        setStatus("error")
        setMessage("La autorización fue rechazada por el banco")
      } else {
        setStatus("error")
        setMessage("Estado de autorización desconocido")
      }
    } catch (error) {
      console.log("[v0] Error in callback processing:", error)
      setStatus("error")
      setMessage("Error procesando la respuesta del banco")
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/connect")}
            className="flex items-center gap-2"
            disabled={status === "processing"}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">
            {status === "processing" && "Procesando Conexión"}
            {status === "success" && "Conexión Exitosa"}
            {status === "error" && "Error de Conexión"}
          </h1>
          <p className="text-gray-600">
            {status === "processing" && "Estamos configurando tu conexión bancaria..."}
            {status === "success" && "Tu banco ha sido conectado correctamente"}
            {status === "error" && "Hubo un problema al conectar tu banco"}
          </p>
        </div>

        {/* Steps */}
        <ConnectionSteps currentStep={status === "success" ? 3 : 2} />

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status === "processing" && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                {status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
                {status === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}

                {status === "processing" && "Procesando..."}
                {status === "success" && "¡Conexión Completada!"}
                {status === "error" && "Error de Conexión"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress bar for processing */}
              {status === "processing" && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-center">{message}</p>
                </div>
              )}

              {/* Success message */}
              {status === "success" && (
                <div className="text-center space-y-4">
                  <p className="text-green-800">{message}</p>

                  {accounts.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cuentas Conectadas ({accounts.length})
                      </h3>
                      <div className="space-y-2">
                        {accounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between p-2 bg-white rounded border"
                          >
                            <div>
                              <p className="font-medium text-sm">{account.name}</p>
                              <p className="text-xs text-gray-600 font-mono">{account.iban}</p>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {status === "error" && (
                <div className="text-center">
                  <p className="text-red-800 mb-4">{message}</p>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">¿Qué puedes hacer?</h4>
                    <ul className="text-sm text-red-800 space-y-1 text-left">
                      <li>• Verifica que completaste la autorización en tu banco</li>
                      <li>• Asegúrate de tener una conexión estable a internet</li>
                      <li>• Intenta conectar de nuevo en unos minutos</li>
                      <li>• Contacta a soporte si el problema persiste</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                {status === "success" && (
                  <>
                    <Button onClick={() => router.push("/accounts")} className="flex-1 max-w-xs">
                      Ver Mis Cuentas
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/")} className="flex-1 max-w-xs">
                      Ir al Dashboard
                    </Button>
                  </>
                )}

                {status === "error" && (
                  <>
                    <Button onClick={() => router.push("/connect")} className="flex-1 max-w-xs">
                      Intentar de Nuevo
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/")} className="flex-1 max-w-xs">
                      Volver al Inicio
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
