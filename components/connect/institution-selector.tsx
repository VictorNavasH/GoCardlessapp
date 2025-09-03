"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Check, Search } from "lucide-react"

interface Institution {
  id: string
  name: string
  bic: string
  country: string
  logo?: string
}

interface InstitutionSelectorProps {
  institutions: Institution[]
  selectedInstitution: string
  onSelect: (institutionId: string) => void
}

export function InstitutionSelector({ institutions, selectedInstitution, onSelect }: InstitutionSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredInstitutions = institutions.filter(
    (institution) =>
      (institution.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (institution.country?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar banco o país..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
        {filteredInstitutions.map((institution) => (
          <Card
            key={institution.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedInstitution === institution.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
            }`}
            onClick={() => onSelect(institution.id)}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-2">
                <img
                  src={institution.logo || "/bank-placeholder.png"}
                  alt={institution.name}
                  className="w-8 h-8 rounded object-cover"
                />
                <div className="min-h-[2.5rem] flex flex-col justify-center">
                  <h3 className="font-medium text-sm leading-tight">{institution.name}</h3>
                  <p className="text-xs text-gray-500">{institution.country}</p>
                </div>
                {selectedInstitution === institution.id && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInstitutions.length === 0 && searchTerm && (
        <div className="text-center py-8 text-gray-500">No se encontraron bancos que coincidan con "{searchTerm}"</div>
      )}
    </div>
  )
}
