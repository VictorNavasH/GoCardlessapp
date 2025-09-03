import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, Eye, Clock } from "lucide-react"

export function SecurityInfo() {
  const securityFeatures = [
    {
      icon: Shield,
      title: "Conexión Segura",
      description: "Utilizamos encriptación de nivel bancario para proteger tus datos",
    },
    {
      icon: Lock,
      title: "Solo Lectura",
      description: "Solo podemos ver tus transacciones, nunca realizar operaciones",
    },
    {
      icon: Eye,
      title: "Transparencia Total",
      description: "Siempre sabrás qué datos accedemos y para qué los usamos",
    },
    {
      icon: Clock,
      title: "Acceso Temporal",
      description: "Puedes revocar el acceso en cualquier momento desde tu banco",
    },
  ]

  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Shield className="h-5 w-5" />
          Tu Seguridad es Nuestra Prioridad
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <feature.icon className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 text-sm">{feature.title}</h4>
                <p className="text-green-700 text-xs">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
