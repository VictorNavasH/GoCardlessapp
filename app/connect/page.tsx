"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InstitutionSelector } from "../../components/connect/institution-selector"
import { ConnectionSteps } from "../../components/connect/connection-steps"
import { Loader2, ExternalLink, ArrowLeft, TestTube, RefreshCw } from "lucide-react"

interface Institution {
  id: string
  name: string
  bic: string
  country: string
  logo_url?: string
}

interface AlertState {
  type: "error" | "warning" | "success"
  message: string
}

export default function ConnectPage() {
  console.log("[v0] ConnectPage component initializing...")

  const router = useRouter()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState("")
  const [loading, setLoading] = useState(false)
  const [institutionsLoading, setInstitutionsLoading] = useState(true)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const [syncingInstitutions, setSyncingInstitutions] = useState(false)

  useEffect(() => {
    console.log("[v0] useEffect triggered, fetching institutions...")
    fetchInstitutions()
  }, [])

  const fetchInstitutions = async () => {
    try {
      console.log("[v0] Fetching institutions from /api/institutions...")
      const res = await fetch("/api/institutions")
      const data = await res.json()
      console.log("[v0] Institutions fetched:", data.length, "institutions")
      setInstitutions(data)
    } catch (error) {
      console.log("[v0] Error fetching institutions:", error)
      setAlert({ type: "error", message: "Error cargando instituciones" })
    } finally {
      setInstitutionsLoading(false)
      console.log("[v0] Institutions loading completed")
    }
  }

  const handleConnect = async () => {
    if (!selectedInstitution) {
      setAlert({ type: "warning", message: "Selecciona un banco primero" })
      return
    }

    setLoading(true)
    setAlert(null)

    try {
      const res = await fetch("/api/requisitions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: selectedInstitution,
          redirect_url: `${window.location.origin}/connect/callback`,
          reference: `req_${Date.now()}`,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setAlert({
          type: "success",
          message: data.sandbox
            ? "Redirigiendo al simulador bancario de GoCardless..."
            : "Redirigiendo a la página oficial de tu banco...",
        })

        setTimeout(() => {
          window.location.href = data.link
        }, 1500)
      } else {
        setAlert({ type: "error", message: data.error || "Error creando requisition" })
      }
    } catch (error) {
      setAlert({ type: "error", message: "Error de conexión. Inténtalo de nuevo." })
    } finally {
      setLoading(false)
    }
  }

  const handleSandboxTest = async () => {
    console.log("[v0] ===== SANDBOX BUTTON CLICKED =====")
    console.log("[v0] handleSandboxTest function called!")
    console.log("[v0] Current loading state:", loading)

    setLoading(true)
    setAlert(null)

    try {
      console.log("[v0] Making API call to create sandbox requisition...")
      const res = await fetch("/api/requisitions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_id: "SANDBOXFINANCE_SFIN0000",
          redirect_url: `${window.location.origin}/connect/callback`,
          reference: `sandbox_${Date.now()}`,
        }),
      })

      const data = await res.json()
      console.log("[v0] Sandbox test response:", data)

      if (data.success) {
        console.log("[v0] Success! Link received:", data.link)
        setAlert({
          type: "success",
          message: "Redirigiendo al simulador bancario oficial de GoCardless...",
        })

        console.log("[v0] Setting timeout for redirection...")
        setTimeout(() => {
          console.log("[v0] Executing redirection to:", data.link)
          console.log("[v0] Current window.location:", window.location.href)
          window.location.href = data.link
          console.log("[v0] Redirection command executed")
        }, 1500)
      } else {
        console.log("[v0] Error in response:", data.error)
        setAlert({ type: "error", message: data.error || "Error creando requisition de prueba" })
      }
    } catch (error) {
      console.log("[v0] Catch error:", error)
      setAlert({ type: "error", message: "Error de conexión. Inténtalo de nuevo." })
    } finally {
      setLoading(false)
    }
  }

  const handleSyncInstitutions = async () => {
    setSyncingInstitutions(true)
    setAlert(null)

    try {
      const res = await fetch("/api/institutions/sync", {
        method: "POST",
      })

      const data = await res.json()

      if (data.success) {
        setAlert({
          type: "success",
          message: `Sincronización completada: ${data.synced} instituciones actualizadas`,
        })
        // Recargar la lista de instituciones
        await fetchInstitutions()
      } else {
        setAlert({ type: "error", message: data.error || "Error sincronizando instituciones" })
      }
    } catch (error) {
      setAlert({ type: "error", message: "Error de conexión durante la sincronización" })
    } finally {
      setSyncingInstitutions(false)
    }
  }

  const selectedInstitutionData = institutions.find((i) => i.id === selectedInstitution)

  console.log("[v0] ConnectPage rendering with:", {
    institutionsCount: institutions.length,
    selectedInstitution,
    loading,
    institutionsLoading,
    alert,
  })

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-xs">
          Debug: Page loaded successfully - Institutions: {institutions.length} | Loading:{" "}
          {institutionsLoading ? "Yes" : "No"}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Conectar Cuenta Bancaria</h1>
          <p className="text-gray-600">Conecta tu banco de forma segura usando la tecnología oficial de GoCardless</p>
        </div>

        {/* Steps */}
        <ConnectionSteps currentStep={1} />

        {/* Alert */}
        {alert && (
          <Alert
            className={
              alert.type === "error"
                ? "border-red-500 bg-red-50"
                : alert.type === "warning"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-green-500 bg-green-50"
            }
          >
            <AlertDescription
              className={
                alert.type === "error"
                  ? "text-red-800"
                  : alert.type === "warning"
                    ? "text-yellow-800"
                    : "text-green-800"
              }
            >
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecciona tu Banco</CardTitle>
            </CardHeader>
            <CardContent>
              {institutionsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <InstitutionSelector
                  institutions={institutions}
                  selectedInstitution={selectedInstitution}
                  onSelect={setSelectedInstitution}
                />
              )}
            </CardContent>
          </Card>

          {/* Connection Button */}
          {selectedInstitution && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Conectar con {selectedInstitutionData?.name}</h3>
                    <p className="text-sm text-blue-700">Serás redirigido a la página oficial de GoCardless</p>
                  </div>
                  <Button onClick={handleConnect} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continuar
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Cómo funciona?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    1
                  </span>
                  <span>Selecciona tu banco de la lista</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    2
                  </span>
                  <span>Serás redirigido a la plataforma oficial de GoCardless</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    3
                  </span>
                  <span>GoCardless te conectará de forma segura con tu banco</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    4
                  </span>
                  <span>Regresarás automáticamente con tus cuentas conectadas</span>
                </li>
              </ol>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Tecnología PSD2:</strong> Utilizamos la tecnología oficial de GoCardless que cumple con las
                  regulaciones europeas PSD2 para garantizar la máxima seguridad en la conexión bancaria.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Development Tools Section */}
          <Card className="bg-amber-50 border-amber-200 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                <TestTube className="h-5 w-5" />
                Herramientas de Desarrollo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-amber-900">Modo Prueba - Sandbox Finance</h3>
                    <p className="text-sm text-amber-700">
                      Prueba la conexión con el simulador bancario oficial de GoCardless
                    </p>
                  </div>
                  <Button
                    onClick={handleSandboxTest}
                    disabled={loading}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Probar Sandbox
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="border-t border-amber-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-amber-900">Sincronizar Instituciones Bancarias</h3>
                      <p className="text-sm text-amber-700">
                        Actualiza la lista de bancos disponibles desde GoCardless API
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncInstitutions}
                      disabled={syncingInstitutions}
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent"
                    >
                      {syncingInstitutions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {!syncingInstitutions && <RefreshCw className="mr-2 h-4 w-4" />}
                      Sincronizar Bancos
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-amber-600 bg-amber-100 p-2 rounded">
                  <strong>Nota:</strong> Estas herramientas son para testing y desarrollo. La sincronización descarga
                  todos los bancos disponibles con sus logos y metadatos.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
