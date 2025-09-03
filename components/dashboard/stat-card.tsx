import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor: string
  subtitle?: string
}

export function StatCard({ title, value, icon: Icon, iconColor, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-sm font-medium text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
