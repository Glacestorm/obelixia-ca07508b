/**
 * HRCollectiveAgreementSelect - Selector de Convenio Colectivo
 * Art. 8.5 ET - Obligatorio informar convenio aplicable en contratos
 * Diálogo a pantalla completa con buscador, idéntico al selector CNO
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Check, FileText, AlertTriangle, AlertCircle, Calendar, Clock, Users, Search, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  SPANISH_COLLECTIVE_AGREEMENTS,
  getAgreementsByCNAE,
  type CollectiveAgreement
} from '@/data/hr/collectiveAgreementsCatalog';

interface HRCollectiveAgreementSelectProps {
  value: string;
  onValueChange: (id: string, agreement: AgreementData | null) => void;
  companyId?: string;
  companyCNAE?: string;
  filterByCNAE?: boolean;
  required?: boolean;
  showValidation?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export interface AgreementData {
  id: string;
  code: string;
  name: string;
  extra_payments: number;
  working_hours_week: number;
  vacation_days: number;
  effective_date: string;
  expiration_date?: string;
  is_expiring_soon?: boolean;
}

// Sector grouping for visual organization
const SECTOR_GROUPS: Record<string, string> = {
  '01': 'Agricultura y Ganadería',
  '02': 'Agricultura y Ganadería',
  '03': 'Agricultura y Ganadería',
  '10': 'Alimentación',
  '11': 'Alimentación',
  '12': 'Alimentación',
  '13': 'Textil y Confección',
  '14': 'Textil y Confección',
  '15': 'Textil y Confección',
  '16': 'Madera y Mueble',
  '17': 'Artes Gráficas y Papel',
  '18': 'Artes Gráficas y Papel',
  '20': 'Industria Química y Farmacéutica',
  '21': 'Industria Química y Farmacéutica',
  '24': 'Metal e Industria',
  '25': 'Metal e Industria',
  '26': 'Metal e Industria',
  '27': 'Metal e Industria',
  '28': 'Metal e Industria',
  '29': 'Metal e Industria',
  '30': 'Metal e Industria',
  '31': 'Madera y Mueble',
  '33': 'Metal e Industria',
  '41': 'Construcción',
  '42': 'Construcción',
  '43': 'Construcción',
  '47': 'Comercio',
  '49': 'Transporte y Logística',
  '55': 'Hostelería y Turismo',
  '56': 'Hostelería y Turismo',
  '62': 'Tecnología y Consultoría',
  '63': 'Tecnología y Consultoría',
  '64': 'Banca y Finanzas',
  '65': 'Seguros',
  '66': 'Seguros',
  '69': 'Oficinas y Servicios Profesionales',
  '70': 'Oficinas y Servicios Profesionales',
  '71': 'Oficinas y Servicios Profesionales',
  '73': 'Oficinas y Servicios Profesionales',
  '74': 'Oficinas y Servicios Profesionales',
  '78': 'Oficinas y Servicios Profesionales',
  '79': 'Turismo y Agencias de Viaje',
  '80': 'Seguridad Privada',
  '81': 'Limpieza y Servicios',
  '82': 'Contact Center y Servicios',
  '85': 'Enseñanza',
  '86': 'Sanidad',
  '87': 'Sanidad',
  '88': 'Sanidad',
};

function getSectorForAgreement(agreement: { cnae_codes?: string[] }): string {
  if (!agreement.cnae_codes?.length) return 'Otros';
  const first = agreement.cnae_codes[0];
  return SECTOR_GROUPS[first] || 'Otros';
}

export function HRCollectiveAgreementSelect({
  value,
  onValueChange,
  companyId,
  companyCNAE,
  filterByCNAE,
  required = false,
  showValidation = false,
  disabled = false,
  placeholder = 'Seleccionar convenio colectivo',
  className
}: HRCollectiveAgreementSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbAgreements, setDbAgreements] = useState<AgreementData[]>([]);
  const [dbAgreementCnaes, setDbAgreementCnaes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementData | null>(null);

  // Load agreements from DB on mount and every time dialog opens
  useEffect(() => {
    loadAgreements();
  }, [companyId, companyCNAE]);

  useEffect(() => {
    if (open) loadAgreements();
  }, [open]);


  const loadAgreements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('erp_hr_collective_agreements')
        .select('id, code, name, extra_payments, working_hours_week, vacation_days, effective_date, expiration_date, is_active, cnae_codes')
        .eq('is_active', true)
        .order('name');

      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null,is_system.eq.true`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const cnaeMap: Record<string, string[]> = {};
      const agreements: AgreementData[] = (data || []).map(item => {
        cnaeMap[item.id] = (item.cnae_codes as string[]) || [];
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          extra_payments: item.extra_payments || 14,
          working_hours_week: item.working_hours_week || 40,
          vacation_days: item.vacation_days || 30,
          effective_date: item.effective_date,
          expiration_date: item.expiration_date,
          is_expiring_soon: item.expiration_date
            ? new Date(item.expiration_date) <= thirtyDaysFromNow
            : false
        };
      });

      setDbAgreements(agreements);
      setDbAgreementCnaes(cnaeMap);
    } catch (error) {
      console.error('Error loading agreements:', error);
      setDbAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  // Merge DB + local catalog
  const allAgreements = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const localAgreements: (AgreementData & { _cnae?: string[] })[] = SPANISH_COLLECTIVE_AGREEMENTS.map(a => ({
      id: `local_${a.code}`,
      code: a.code,
      name: a.name,
      extra_payments: a.extra_payments,
      working_hours_week: a.working_hours_week,
      vacation_days: a.vacation_days,
      effective_date: a.effective_date,
      expiration_date: a.expiration_date,
      is_expiring_soon: a.expiration_date
        ? new Date(a.expiration_date) <= thirtyDaysFromNow
        : false,
      _cnae: a.cnae_codes,
    }));

    const dbCodes = new Set(dbAgreements.map(a => a.code));
    const uniqueLocal = localAgreements.filter(a => !dbCodes.has(a.code));

    return [...dbAgreements, ...uniqueLocal];
  }, [dbAgreements]);

  // Sync selected agreement — re-runs when value OR allAgreements changes
  useEffect(() => {
    if (value && allAgreements.length > 0) {
      const found = allAgreements.find(a => a.id === value);
      setSelectedAgreement(found || null);
    } else if (!value) {
      setSelectedAgreement(null);
    }
  }, [value, allAgreements]);


  const getCnaesForAgreement = useCallback((agreement: AgreementData): string[] => {
    if (dbAgreementCnaes[agreement.id]) return dbAgreementCnaes[agreement.id];
    const localCode = agreement.id.replace('local_', '');
    const local = SPANISH_COLLECTIVE_AGREEMENTS.find(a => a.code === localCode);
    return local?.cnae_codes || [];
  }, [dbAgreementCnaes]);

  // Filter and group
  const filteredAgreements = useMemo(() => {
    let results = allAgreements;

    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q)
      );
    }

    // Sort: CNAE-matching first, then alphabetical
    if (companyCNAE) {
      const suggestedCodes = getAgreementsByCNAE(companyCNAE).map(a => a.code);
      results = [...results].sort((a, b) => {
        const aMatch = suggestedCodes.includes(a.code);
        const bMatch = suggestedCodes.includes(b.code);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return results;
  }, [allAgreements, searchQuery, companyCNAE]);

  // Group by sector
  const groupedResults = useMemo(() => {
    const groups: Record<string, AgreementData[]> = {};
    filteredAgreements.forEach(a => {
      const cnaes = getCnaesForAgreement(a);
      const sector = getSectorForAgreement({ cnae_codes: cnaes });
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(a);
    });

    // Sort sector keys, putting "Recomendados" first if CNAE is set
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    const sorted: Record<string, AgreementData[]> = {};
    sortedKeys.forEach(k => { sorted[k] = groups[k]; });
    return sorted;
  }, [filteredAgreements, getCnaesForAgreement]);

  const handleSelect = useCallback((agreement: AgreementData) => {
    setSelectedAgreement(agreement);
    onValueChange(agreement.id, agreement);
    setOpen(false);
    setSearchQuery('');
  }, [onValueChange]);

  const isValid = !required || (required && value);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'w-full justify-between font-normal h-auto min-h-10 py-2',
          !value && 'text-muted-foreground',
          showValidation && !isValid && 'border-destructive',
        )}
      >
        <div className="flex items-center gap-2 truncate text-left">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          {selectedAgreement ? (
            <span className="truncate">
              <span className="font-mono text-primary">{selectedAgreement.code}</span>
              {' — '}
              <span>{selectedAgreement.name}</span>
              {selectedAgreement.is_expiring_soon && (
                <AlertTriangle className="inline h-3 w-3 ml-1 text-amber-500" />
              )}
            </span>
          ) : (
            placeholder
          )}
        </div>
      </Button>

      {/* Full-screen dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Convenios Colectivos
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Art. 8.5 ET — Obligatorio informar convenio aplicable en contratos
            </p>
          </DialogHeader>

          {/* Search */}
          <div className="px-6 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código (ej: 'metal', 'BANCA-NAC')..."
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {loading ? 'Cargando convenios...' : `${filteredAgreements.length} convenios encontrados`}
              {searchQuery.length > 0 && searchQuery.length < 2 && ' — escribe al menos 2 caracteres'}
            </p>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-3 space-y-4">
              {Object.keys(groupedResults).length === 0 ? (
                <div className="py-12 text-center">
                  <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No se encontraron convenios.</p>
                  <p className="text-xs text-muted-foreground mt-1">Prueba con otro término de búsqueda</p>
                </div>
              ) : (
                Object.entries(groupedResults).map(([sector, items]) => (
                  <div key={sector}>
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1 z-10">
                      <Badge variant="outline" className="text-xs">
                        {sector}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {items.length} convenio{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map((agreement) => {
                        const isSelected = value === agreement.id;
                        return (
                          <button
                            key={agreement.id}
                            type="button"
                            onClick={() => handleSelect(agreement)}
                            className={cn(
                              'w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                              'hover:bg-accent/50',
                              isSelected && 'bg-primary/10 ring-1 ring-primary/30',
                            )}
                          >
                            <Check
                              className={cn(
                                'h-4 w-4 shrink-0 mt-0.5 text-primary',
                                isSelected ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-medium text-primary shrink-0">
                                  {agreement.code}
                                </span>
                                <span className="text-sm truncate">{agreement.name}</span>
                                {agreement.is_expiring_soon && (
                                  <Badge variant="destructive" className="text-[10px] shrink-0 px-1.5 py-0">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                    Expira pronto
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {agreement.extra_payments} pagas
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {agreement.working_hours_week}h/sem
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {agreement.vacation_days}d vac.
                                </span>
                                {agreement.expiration_date && (
                                  <span className="text-muted-foreground/70">
                                    Hasta {new Date(agreement.expiration_date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-6 py-3 flex items-center justify-between shrink-0 bg-muted/30">
            {selectedAgreement ? (
              <div className="text-xs text-muted-foreground space-x-3">
                <span>Seleccionado: <span className="font-mono font-medium text-primary">{selectedAgreement.code}</span> — {selectedAgreement.name}</span>
                <span>|</span>
                <span>{selectedAgreement.extra_payments} pagas</span>
                <span>·</span>
                <span>{selectedAgreement.working_hours_week}h/sem</span>
                <span>·</span>
                <span>{selectedAgreement.vacation_days}d vac.</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Selecciona un convenio de la lista</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation */}
      {showValidation && !isValid && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Art. 8.5 ET - El convenio colectivo es obligatorio
        </p>
      )}
    </div>
  );
}

export default HRCollectiveAgreementSelect;
