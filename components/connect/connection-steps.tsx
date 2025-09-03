import { Card, CardContent } from "@/components/ui/card"
import { Check, Circle, ArrowRight } from "lucide-react"

interface Step {
  id: number
  title: string
  description: string
  status: "completed" | "current" | "pending"
}

interface ConnectionStepsProps {
  currentStep: number
}

export function ConnectionSteps({ currentStep }: ConnectionStepsProps) {
  const steps: Step[] = [
    {
      id: 1,
      title: "Seleccionar Banco",
      description: "Elige tu institución bancaria",
      status: currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "pending",
    },
    {
      id: 2,
      title: "Autorización",
      description: "Autoriza el acceso en tu banco",
      status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "pending",
    },
    {
      id: 3,
      title: "Confirmación",
      description: "Confirma las cuentas conectadas",
      status: currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "pending",
    },
  ]

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step.status === "completed"
                      ? "bg-green-500 border-green-500 text-white"
                      : step.status === "current"
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-100 border-gray-300 text-gray-400"
                  }`}
                >
                  {step.status === "completed" ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${step.status === "current" ? "text-blue-600" : "text-gray-600"}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && <ArrowRight className="h-5 w-5 text-gray-400 mx-4 mt-[-2rem]" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
