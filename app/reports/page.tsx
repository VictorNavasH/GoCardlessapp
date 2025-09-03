"use client"

import { useState, useEffect } from "react"
import Layout from "../../components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react"

interface ReportData {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
  categoryBreakdown: { category: string; amount: number; percentage: number }[]
  monthlyTrends: { month: string; income: number; expenses: number }[]
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("last-30-days")

  useEffect(() => {
    fetchReportData()
  }, [selectedPeriod])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Simular datos de reporte
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockData: ReportData = {
        totalIncome: 4250.0,
        totalExpenses: 3180.5,
        netBalance: 1069.5,
        transactionCount: 127,
        categoryBreakdown: [
          { category: "Alimentación", amount: 850.3, percentage: 26.7 },
          { category: "Transporte", amount: 420.15, percentage: 13.2 },
          { category: "Entretenimiento", amount: 315.8, percentage: 9.9 },
          { category: "Servicios", amount: 680.25, percentage: 21.4 },
          { category: "Compras", amount: 914.0, percentage: 28.8 },
        ],
        monthlyTrends: [
          { month: "Ene", income: 3800, expenses: 2900 },
          { month: "Feb", income: 4100, expenses: 3200 },
          { month: "Mar", income: 4250, expenses: 3180 },
        ],
      }

      setReportData(mockData)
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const exportReport = () => {
    // Simular exportación de reporte
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `reporte-financiero-${selectedPeriod}.json`
    link.click()
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Reportes Financieros</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reportes Financieros</h1>
            <p className="text-gray-600">Análisis detallado de tus finanzas</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Últimos 7 días</SelectItem>
                <SelectItem value="last-30-days">Últimos 30 días</SelectItem>
                <SelectItem value="last-90-days">Últimos 90 días</SelectItem>
                <SelectItem value="current-year">Año actual</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData?.totalIncome || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gastos Totales</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData?.totalExpenses || 0)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Balance Neto</p>
                  <p
                    className={`text-2xl font-bold ${(reportData?.netBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(reportData?.netBalance || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transacciones</p>
                  <p className="text-2xl font-bold text-blue-600">{reportData?.transactionCount || 0}</p>
                </div>
                <PieChart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Desglose por categorías */}
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.categoryBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm text-gray-600">{category.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${category.percentage}%` }} />
                      </div>
                    </div>
                    <span className="ml-4 text-sm font-semibold">{formatCurrency(category.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tendencias mensuales */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.monthlyTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{trend.month}</span>
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Ingresos</p>
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(trend.income)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Gastos</p>
                        <p className="text-sm font-semibold text-red-600">{formatCurrency(trend.expenses)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
