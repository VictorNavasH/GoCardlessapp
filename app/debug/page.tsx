"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runCriticalCheck = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/critical-check")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error running critical check:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Diagnóstico Crítico del Sistema</h1>
        <Button onClick={runCriticalCheck} disabled={loading}>
          {loading ? "Ejecutando..." : "Ejecutar Diagnóstico Crítico"}
        </Button>
      </div>

      {results && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variables de Entorno</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded">{JSON.stringify(results.checks.env_vars, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado de Tablas</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded">{JSON.stringify(results.checks.tables, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded">{JSON.stringify(results.checks.data, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado GoCardless</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded">
                {JSON.stringify(results.checks.gocardless, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
