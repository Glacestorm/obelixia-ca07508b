/**
 * HRCollectiveAgreementSelect - Selector de Convenio Colectivo
 * Art. 8.5 ET - Obligatorio informar convenio aplicable en contratos
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from '@/components/ui/command';
import { 
  ChevronsUpDown, Check, FileText, AlertTriangle, Calendar, Clock, Users
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
  /** If true, only show agreements matching the CNAE (strict filter). Default: true when companyCNAE is set */
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

export function HRCollectiveAgreementSelect({
  value,
  onValueChange,
  companyId,
  companyCNAE,
  filterByCNAE,
  required = false,
  showValidation = false,
  disabled = false,
  placeholder = 'Seleccionar convenio...',
  className
}: HRCollectiveAgreementSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbAgreements, setDbAgreements] = useState<AgreementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementData | null>(null);

  // Cargar convenios de la base de datos
  useEffect(() => {
    loadAgreements();
  }, [companyId, companyCNAE]);

  // Cargar convenio seleccionado
  useEffect(() => {
    if (value && dbAgreements.length > 0) {
      const found = dbAgreements.find(a => a.id === value);
      setSelectedAgreement(found || null);
    }
  }, [value, dbAgreements]);

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

      // Filter by CNAE at DB level using the array overlap operator
      if (companyCNAE) {
        const cnaePrefix = companyCNAE.substring(0, 2);
        // Use cs (contains) to match CNAE codes in the array — filter agreements whose cnae_codes array overlaps with the company CNAE
        query = query.or(`cnae_codes.cs.{${companyCNAE}},cnae_codes.cs.{${cnaePrefix}},cnae_codes.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const agreements: AgreementData[] = (data || []).map(item => ({
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
      }));

      setDbAgreements(agreements);
    } catch (error) {
      console.error('Error loading agreements:', error);
      // Usar catálogo local como fallback
      setDbAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  const shouldFilter = filterByCNAE !== undefined ? filterByCNAE : !!companyCNAE;

  // Combinar convenios de DB con catálogo local
  const allAgreements = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Convertir catálogo local a formato AgreementData (filtered by CNAE if set)
    const localAgreements: AgreementData[] = SPANISH_COLLECTIVE_AGREEMENTS
      .filter(a => {
        if (companyCNAE && shouldFilter) {
          const cnaePrefix = companyCNAE.substring(0, 2);
          return a.cnae_codes?.some(c => c === companyCNAE || c === cnaePrefix || companyCNAE.startsWith(c)) ?? false;
        }
        return true;
      })
      .map(a => ({
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
          : false
      }));

    // Priorizar DB sobre local (evitar duplicados por código)
    const dbCodes = new Set(dbAgreements.map(a => a.code));
    const uniqueLocalAgreements = localAgreements.filter(a => !dbCodes.has(a.code));

    return [...dbAgreements, ...uniqueLocalAgreements];
  }, [dbAgreements, companyCNAE, shouldFilter]);

  // Filtrar por búsqueda y CNAE
  const filteredAgreements = useMemo(() => {
    let results = allAgreements;

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.code.toLowerCase().includes(query)
      );
    }

    // Si hay CNAE, priorizar convenios del sector
    if (companyCNAE) {
      const suggestedCodes = getAgreementsByCNAE(companyCNAE).map(a => a.code);
      results = results.sort((a, b) => {
        const aIsSuggested = suggestedCodes.includes(a.code);
        const bIsSuggested = suggestedCodes.includes(b.code);
        if (aIsSuggested && !bIsSuggested) return -1;
        if (!aIsSuggested && bIsSuggested) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return results;
  }, [allAgreements, searchQuery, companyCNAE]);

  const handleSelect = useCallback((agreement: AgreementData) => {
    setSelectedAgreement(agreement);
    onValueChange(agreement.id, agreement);
    setOpen(false);
  }, [onValueChange]);

  const isValid = !required || (required && value);

  return (
    <div className={cn('space-y-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              showValidation && !isValid && 'border-destructive'
            )}
          >
            {selectedAgreement ? (
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{selectedAgreement.name}</span>
                {selectedAgreement.is_expiring_soon && (
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                )}
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar convenio..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Cargando convenios...' : 'No se encontraron convenios'}
              </CommandEmpty>
              
              {companyCNAE && (
                <CommandGroup heading="Recomendados para tu sector">
                  {filteredAgreements
                    .filter(a => getAgreementsByCNAE(companyCNAE).some(s => s.code === a.code))
                    .slice(0, 5)
                    .map(agreement => (
                      <CommandItem
                        key={agreement.id}
                        value={agreement.id}
                        onSelect={() => handleSelect(agreement)}
                        className="flex items-start gap-2 py-2"
                      >
                        <Check 
                          className={cn(
                            'h-4 w-4 shrink-0 mt-0.5',
                            value === agreement.id ? 'opacity-100' : 'opacity-0'
                          )} 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{agreement.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {agreement.code}
                            </Badge>
                            {agreement.is_expiring_soon && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Próximo a expirar
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
                              {agreement.vacation_days} días vac.
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              
              <CommandGroup heading="Todos los convenios">
                <ScrollArea className="h-[300px]">
                  {filteredAgreements.map(agreement => (
                    <CommandItem
                      key={agreement.id}
                      value={agreement.id}
                      onSelect={() => handleSelect(agreement)}
                      className="flex items-start gap-2 py-2"
                    >
                      <Check 
                        className={cn(
                          'h-4 w-4 shrink-0 mt-0.5',
                          value === agreement.id ? 'opacity-100' : 'opacity-0'
                        )} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{agreement.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {agreement.code}
                          </Badge>
                          {agreement.is_expiring_soon && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Próximo a expirar
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
                            {agreement.vacation_days} días vac.
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Resumen del convenio seleccionado */}
      {selectedAgreement && (
        <div className="p-2 rounded-md bg-muted/50 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pagas anuales:</span>
            <span className="font-medium">{selectedAgreement.extra_payments}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Jornada semanal:</span>
            <span className="font-medium">{selectedAgreement.working_hours_week}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Vacaciones:</span>
            <span className="font-medium">{selectedAgreement.vacation_days} días</span>
          </div>
          {selectedAgreement.expiration_date && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vigencia hasta:</span>
              <span className={cn(
                'font-medium',
                selectedAgreement.is_expiring_soon && 'text-amber-600'
              )}>
                {new Date(selectedAgreement.expiration_date).toLocaleDateString('es-ES')}
              </span>
            </div>
          )}
        </div>
      )}

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
