"use client"

import { useState } from "react"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Save, Trash2, Key, Bell, Shield, Database, Send as Sync } from "lucide-react"

interface Settings {
  notifications: {
    email: boolean
    push: boolean
    transactionAlerts: boolean
    weeklyReports: boolean
  }
  sync: {
    autoSync: boolean
    syncFrequency: string
    lastSync: string | null
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: string
  }
  preferences: {
    currency: string
    language: string
    dateFormat: string
  }
  api: {
    gocardlessConnected: boolean
    lastApiCall: string | null
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      email: true,
      push: false,
      transactionAlerts: true,
      weeklyReports: true,
    },
    sync: {
      autoSync: true,
      syncFrequency: "smart_daily",
      lastSync: new Date().toISOString(),
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: "24h",
    },
    preferences: {
      currency: "EUR",
      language: "es",
      dateFormat: "dd/mm/yyyy",
    },
    api: {
      gocardlessConnected: true,
      lastApiCall: new Date().toISOString(),
    },
  })

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      // Simular guardado de configuración
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      // Simular sincronización manual
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setSettings((prev) => ({
        ...prev,
        sync: {
          ...prev.sync,
          lastSync: new Date().toISOString(),
        },
      }))
    } catch (error) {
      console.error("Error syncing:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Nunca"
    return new Date(dateString).toLocaleString("es-ES")
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Configuración</h1>
            <p className="text-gray-600">Gestiona las preferencias de tu aplicación</p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : saved ? "Guardado ✓" : "Guardar Cambios"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Notificaciones por email</Label>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications">Notificaciones push</Label>
                <Switch
                  id="push-notifications"
                  checked={settings.notifications.push}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, push: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="transaction-alerts">Alertas de transacciones</Label>
                <Switch
                  id="transaction-alerts"
                  checked={settings.notifications.transactionAlerts}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, transactionAlerts: checked },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-reports">Reportes semanales</Label>
                <Switch
                  id="weekly-reports"
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, weeklyReports: checked },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Sincronización */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sync className="h-5 w-5" />
                Sincronización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync">Sincronización automática</Label>
                <Switch
                  id="auto-sync"
                  checked={settings.sync.autoSync}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      sync: { ...prev.sync, autoSync: checked },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sync-frequency">Frecuencia de sincronización</Label>
                <Select
                  value={settings.sync.syncFrequency}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      sync: { ...prev.sync, syncFrequency: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart_daily">Sincronización Inteligente (3x/día)</SelectItem>
                    <SelectItem value="daily_morning">Solo Mañana (04:00)</SelectItem>
                    <SelectItem value="daily_evening">Solo Noche (21:00)</SelectItem>
                    <SelectItem value="manual">Solo Manual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {settings.sync.syncFrequency === "smart_daily" &&
                    "04:00 (completa), 12:00 (media), 21:00 (básica) - Respeta límites de 10 requests/día por cuenta"}
                  {settings.sync.syncFrequency === "daily_morning" && "Una sincronización completa diaria a las 04:00"}
                  {settings.sync.syncFrequency === "daily_evening" && "Una sincronización básica diaria a las 21:00"}
                  {settings.sync.syncFrequency === "manual" && "Sin sincronización automática. Solo manual."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Última sincronización</Label>
                <p className="text-sm text-gray-600">{formatDateTime(settings.sync.lastSync)}</p>
              </div>

              <Button onClick={handleSync} disabled={loading} variant="outline" className="w-full bg-transparent">
                <Sync className="h-4 w-4 mr-2" />
                {loading ? "Sincronizando..." : "Sincronizar Ahora"}
              </Button>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="two-factor">Autenticación de dos factores</Label>
                <Switch
                  id="two-factor"
                  checked={settings.security.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: { ...prev.security, twoFactorEnabled: checked },
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Tiempo de sesión</Label>
                <Select
                  value={settings.security.sessionTimeout}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hora</SelectItem>
                    <SelectItem value="8h">8 horas</SelectItem>
                    <SelectItem value="24h">24 horas</SelectItem>
                    <SelectItem value="7d">7 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="w-full bg-transparent">
                <Key className="h-4 w-4 mr-2" />
                Cambiar Contraseña
              </Button>
            </CardContent>
          </Card>

          {/* Preferencias */}
          <Card>
            <CardHeader>
              <CardTitle>Preferencias Generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={settings.preferences.currency}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, currency: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dólar ($)</SelectItem>
                    <SelectItem value="GBP">Libra (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Select
                  value={settings.preferences.language}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-format">Formato de fecha</Label>
                <Select
                  value={settings.preferences.dateFormat}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, dateFormat: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estado de la API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estado de Integración GoCardless
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={settings.api.gocardlessConnected ? "default" : "destructive"}>
                  {settings.api.gocardlessConnected ? "Conectado" : "Desconectado"}
                </Badge>
                <span className="text-sm text-gray-600">
                  Última llamada: {formatDateTime(settings.api.lastApiCall)}
                </span>
              </div>
              <Button variant="outline" size="sm">
                Probar Conexión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zona de peligro */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Eliminar todos los datos</p>
                  <p className="text-sm text-gray-600">
                    Esta acción eliminará permanentemente todas las cuentas, transacciones y configuraciones.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Datos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
