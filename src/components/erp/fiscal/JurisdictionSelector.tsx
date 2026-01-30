/**
 * Jurisdiction Selector - Dialog para añadir jurisdicciones
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Search,
  Flag,
  Building2,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useERPTaxJurisdictions, TaxJurisdiction } from '@/hooks/erp/useERPTaxJurisdictions';
import { toast } from 'sonner';

interface JurisdictionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JurisdictionSelector({ open, onOpenChange }: JurisdictionSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<TaxJurisdiction | null>(null);
  const [taxNumber, setTaxNumber] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    jurisdictions, 
    companyJurisdictions, 
    registerInJurisdiction 
  } = useERPTaxJurisdictions();

  const registeredIds = companyJurisdictions.map(cj => cj.jurisdiction_id);

  const filteredJurisdictions = jurisdictions.filter(j => 
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    j.code.toLowerCase().includes(search.toLowerCase()) ||
    j.country_code.toLowerCase().includes(search.toLowerCase())
  );

  const groupedJurisdictions = filteredJurisdictions.reduce((acc, j) => {
    const type = j.jurisdiction_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(j);
    return acc;
  }, {} as Record<string, TaxJurisdiction[]>);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'eu_vat': 'Unión Europea',
      'us_llc': 'USA Federal',
      'us_state': 'Estados USA',
      'uae_vat': 'Emiratos Árabes',
      'uae_freezone': 'Zonas Francas UAE',
      'uk_vat': 'Reino Unido',
      'swiss_vat': 'Suiza',
      'singapore_gst': 'Singapur',
      'andorra_igi': 'Andorra',
      'offshore': 'Offshore',
      'other': 'Otros',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'eu_vat': 'bg-blue-500',
      'us_llc': 'bg-red-500',
      'us_state': 'bg-red-400',
      'uae_vat': 'bg-amber-500',
      'uae_freezone': 'bg-amber-600',
      'uk_vat': 'bg-indigo-500',
      'swiss_vat': 'bg-red-600',
      'singapore_gst': 'bg-pink-500',
      'andorra_igi': 'bg-yellow-500',
      'offshore': 'bg-gray-500',
      'other': 'bg-gray-400',
    };
    return colors[type] || 'bg-gray-500';
  };

  const handleSelect = (jurisdiction: TaxJurisdiction) => {
    if (registeredIds.includes(jurisdiction.id)) {
      toast.info('Ya estás registrado en esta jurisdicción');
      return;
    }
    setSelectedJurisdiction(jurisdiction);
  };

  const handleSubmit = async () => {
    if (!selectedJurisdiction) return;

    setIsSubmitting(true);
    try {
      const result = await registerInJurisdiction(
        selectedJurisdiction.id,
        taxNumber || undefined,
        registrationDate || undefined
      );

      if (result) {
        setSelectedJurisdiction(null);
        setTaxNumber('');
        setRegistrationDate('');
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Añadir Jurisdicción Fiscal
          </DialogTitle>
          <DialogDescription>
            Selecciona la jurisdicción donde deseas registrar tu empresa
          </DialogDescription>
        </DialogHeader>

        {!selectedJurisdiction ? (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar jurisdicción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Grouped Jurisdictions */}
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedJurisdictions).map(([type, items]) => (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${getTypeColor(type)}`} />
                      <h4 className="font-medium">{getTypeLabel(type)}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {items.map((jurisdiction) => {
                        const isRegistered = registeredIds.includes(jurisdiction.id);
                        return (
                          <button
                            key={jurisdiction.id}
                            onClick={() => handleSelect(jurisdiction)}
                            disabled={isRegistered}
                            className={`
                              p-3 rounded-lg border text-left transition-all
                              ${isRegistered 
                                ? 'bg-muted/50 opacity-60 cursor-not-allowed' 
                                : 'hover:bg-muted/50 hover:border-primary/50 cursor-pointer'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Flag className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{jurisdiction.name}</span>
                              </div>
                              {isRegistered && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {jurisdiction.code}
                              </Badge>
                              {jurisdiction.standard_tax_rate !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {jurisdiction.standard_tax_rate}%
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {jurisdiction.filing_frequency}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {Object.keys(groupedJurisdictions).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron jurisdicciones
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Jurisdiction Info */}
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${getTypeColor(selectedJurisdiction.jurisdiction_type)}`}>
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{selectedJurisdiction.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{selectedJurisdiction.code}</Badge>
                    {selectedJurisdiction.standard_tax_rate !== null && (
                      <Badge variant="secondary">{selectedJurisdiction.standard_tax_rate}% IVA</Badge>
                    )}
                    <Badge variant="secondary">{selectedJurisdiction.filing_frequency}</Badge>
                  </div>
                </div>
              </div>

              {selectedJurisdiction.reporting_requirements && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Obligaciones fiscales:</p>
                  <div className="flex flex-wrap gap-1">
                    {(selectedJurisdiction.reporting_requirements as string[]).map((req, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedJurisdiction.special_rules && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Reglas especiales:</p>
                  <div className="text-sm">
                    {Object.entries(selectedJurisdiction.special_rules).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Registration Form */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxNumber">{selectedJurisdiction.tax_id_label}</Label>
                <Input
                  id="taxNumber"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder={`Ej: ${selectedJurisdiction.tax_id_format || 'Número fiscal'}`}
                />
                {selectedJurisdiction.tax_id_format && (
                  <p className="text-xs text-muted-foreground">
                    Formato: {selectedJurisdiction.tax_id_format}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationDate">Fecha de Registro</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={registrationDate}
                  onChange={(e) => setRegistrationDate(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedJurisdiction(null)}
              >
                Volver
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Jurisdicción'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JurisdictionSelector;
