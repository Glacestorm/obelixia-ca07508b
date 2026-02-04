/**
 * HRCNOSelect - Selector de Código Nacional de Ocupación
 * Obligatorio para Sistema RED, Contrat@, y afiliación TGSS
 * Desde 15/02/2022 - RD 504/2022
 */

import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, Search, Briefcase, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CNO_CATALOG, searchCNO, getCNOByCode, type CNOCode } from '@/data/hr/cnoCatalog';

interface HRCNOSelectProps {
  value?: string;
  onValueChange: (code: string, description: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showValidation?: boolean;
  className?: string;
}

export function HRCNOSelect({
  value,
  onValueChange,
  placeholder = 'Seleccionar ocupación (CNO)',
  disabled = false,
  required = false,
  showValidation = true,
  className
}: HRCNOSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Obtener la ocupación seleccionada
  const selectedCNO = useMemo(() => {
    if (!value) return null;
    return getCNOByCode(value);
  }, [value]);

  // Filtrar resultados basados en búsqueda
  const filteredResults = useMemo(() => {
    if (searchQuery.length < 2) {
      // Mostrar solo ocupaciones principales (nivel 4) más comunes
      return CNO_CATALOG
        .filter(cno => cno.groupLevel === 4)
        .slice(0, 30);
    }
    return searchCNO(searchQuery, 50);
  }, [searchQuery]);

  // Agrupar por gran grupo
  const groupedResults = useMemo(() => {
    const groups: Record<string, CNOCode[]> = {};
    
    filteredResults.forEach(cno => {
      if (cno.groupLevel === 4) {
        const groupCode = cno.parentCode || cno.code.charAt(0);
        if (!groups[groupCode]) {
          groups[groupCode] = [];
        }
        groups[groupCode].push(cno);
      }
    });
    
    return groups;
  }, [filteredResults]);

  const handleSelect = useCallback((cno: CNOCode) => {
    onValueChange(cno.code, cno.description);
    setOpen(false);
    setSearchQuery('');
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
              showValidation && required && !value && 'border-amber-500/50'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selectedCNO ? (
                <span className="truncate">
                  <span className="font-mono text-primary">{selectedCNO.code}</span>
                  {' - '}
                  <span>{selectedCNO.description}</span>
                </span>
              ) : (
                placeholder
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Buscar por código o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground">No se encontraron ocupaciones.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prueba con otro término de búsqueda
                  </p>
                </div>
              </CommandEmpty>
              
              <ScrollArea className="h-[300px]">
                {Object.entries(groupedResults).map(([groupCode, items]) => {
                  const groupInfo = CNO_CATALOG.find(c => c.code === groupCode);
                  return (
                    <CommandGroup 
                      key={groupCode}
                      heading={
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {groupCode}
                          </Badge>
                          <span className="text-xs truncate">
                            {groupInfo?.description || `Grupo ${groupCode}`}
                          </span>
                        </div>
                      }
                    >
                      {items.map((cno) => (
                        <CommandItem
                          key={cno.code}
                          value={cno.code}
                          onSelect={() => handleSelect(cno)}
                          className="flex items-start gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              'mt-0.5 h-4 w-4 shrink-0',
                              value === cno.code ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-primary text-sm font-medium">
                                {cno.code}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {cno.description}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </ScrollArea>
            </CommandList>
          </Command>
          
          {/* Footer informativo */}
          <div className="border-t p-2 bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              CNO obligatorio para Sistema RED, Contrat@ y TGSS (RD 504/2022)
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Validación visual */}
      {showValidation && required && !value && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          El código CNO es obligatorio desde el 15/02/2022
        </p>
      )}
    </div>
  );
}

export default HRCNOSelect;
