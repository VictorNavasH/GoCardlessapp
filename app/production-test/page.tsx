"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock, Play } from "lucide-react"

interface Institution {
  name: string
  logo: string
  bic: string
  accounts: Array<{
    displayName: string
    iban: string
    scope: string
    remaining: number
    resetTime: string
  }>
  totalRemaining: number
  canTest: boolean
}

export default function ProductionTestPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState({})
  const [runningTest, setRunningTest] = useState<string | null>(null)

  useEffect(() => {
    fetchRateLimits()
  }, [])

  const fetchRateLimits = async () => {
    try {
      const response = await fetch("/api/production-test/rate-limits")
      const data = await response.json()
      setInstitutions(data.institutions || [])
    } catch (error) {
      console.error("Error fetching rate limits:", error)
    } finally {
      setLoading(false)
    }
  }

  const runTest = async (accountId: string, testType: string, institutionName: string) => {
    const testKey = `${accountId}-${testType}`
    setRunningTest(testKey)

    try {
      const response = await fetch("/api/production-test/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, testType }),
      })

      const result = await response.json()

      setTestResults((prev) => ({
        ...prev,
        [testKey]: {
          ...result,
          timestamp: new Date().toISOString(),
          institutionName,
        },
      }))

      await fetchRateLimits()
    } catch (error) {
      console.error("Test failed:", error)
      setTestResults((prev) => ({
        ...prev,
        [testKey]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          institutionName,
        },
      }))
    } finally {
      setRunningTest(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Cargando estado de rate limits...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Testing de Producción</h1>
        <p className="text-muted-foreground">Pruebas sistemáticas con bancos reales respetando rate limits</p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Recomendaciones de Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-blue-700">
          <p>• Máximo 3 requests por banco por día</p>
          <p>• Orden recomendado: CaixaBank → BBVA → Banco Sabadell</p>
          <p>• Esperar 24 horas entre tests del mismo banco</p>
          <p>• Priorizar: details → balances → transactions</p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {institutions.map((institution) => (
          <Card key={institution.name} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {institution.logo && (
                    <img
                      src={institution.logo || "/placeholder.svg"}
                      alt={institution.name}
                      className="w-8 h-8 rounded"
                    />
                  )}
                  <div>
                    <CardTitle>{institution.name}</CardTitle>
                    <CardDescription>{institution.bic}</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={institution.canTest ? "default" : "destructive"}>
                    {institution.totalRemaining} requests restantes
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {institution.accounts.map((account, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{account.displayName}</p>
                        <p className="text-sm text-muted-foreground">{account.iban}</p>
                      </div>
                      <Badge variant={account.remaining > 0 ? "outline" : "destructive"}>
                        {account.scope}: {account.remaining}/10
                      </Badge>
                    </div>

                    <div className="flex space-x-2">
                      {["details", "balances", "transactions"].map((testType) => {
                        const testKey = `${account.iban}-${testType}`
                        const result = testResults[testKey]
                        const isRunning = runningTest === testKey
                        const canRun = account.remaining > 0 && !isRunning

                        return (
                          <div key={testType} className="flex flex-col items-center space-y-1">
                            <Button
                              size="sm"
                              variant={result?.success ? "default" : "outline"}
                              disabled={!canRun}
                              onClick={() => runTest(account.iban, testType, institution.name)}
                            >
                              {isRunning ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : result?.success ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : result?.success === false ? (
                                <AlertTriangle className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              <span className="ml-1 capitalize">{testType}</span>
                            </Button>
                            {result && (
                              <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                                {result.success ? "OK" : "FAIL"}
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(testResults).map(([key, result]: [string, any]) => (
                <div key={key} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">
                    {result.institutionName} - {result.testType}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "SUCCESS" : "FAILED"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
