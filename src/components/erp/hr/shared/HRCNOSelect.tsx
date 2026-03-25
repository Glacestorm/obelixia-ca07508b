/**
 * HRCNOSelect - Selector de Código Nacional de Ocupación
 * Abre un diálogo a pantalla completa con buscador por nombre o código.
 * Obligatorio para Sistema RED, Contrat@, y afiliación TGSS
 * Desde 15/02/2022 - RD 504/2022
 */

import { useState, useMemo, useCallback } from 'react';
import { Check, Briefcase, AlertCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  className,
}: HRCNOSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCNO = useMemo(() => (value ? getCNOByCode(value) : null), [value]);

  const filteredResults = useMemo(() => {
    if (searchQuery.length < 2) {
      return CNO_CATALOG.filter((c) => c.groupLevel === 4).slice(0, 50);
    }
    return searchCNO(searchQuery, 100);
  }, [searchQuery]);

  // Group by gran-grupo for the list
  const groupedResults = useMemo(() => {
    const groups: Record<string, CNOCode[]> = {};
    filteredResults.forEach((cno) => {
      if (cno.groupLevel === 4) {
        const gCode = cno.parentCode || cno.code.charAt(0);
        if (!groups[gCode]) groups[gCode] = [];
        groups[gCode].push(cno);
      }
    });
    return groups;
  }, [filteredResults]);

  const handleSelect = useCallback(
    (cno: CNOCode) => {
      onValueChange(cno.code, cno.description);
      setOpen(false);
      setSearchQuery('');
    },
    [onValueChange],
  );

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
          showValidation && required && !value && 'border-amber-500/50',
        )}
      >
        <div className="flex items-center gap-2 truncate text-left">
          <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
          {selectedCNO ? (
            <span className="truncate">
              <span className="font-mono text-primary">{selectedCNO.code}</span>
              {' — '}
              <span>{selectedCNO.description}</span>
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
              <Briefcase className="h-5 w-5 text-primary" />
              Clasificación Nacional de Ocupaciones (CNO)
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Obligatorio para Sistema RED, Contrat@ y TGSS — RD 504/2022
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
                placeholder="Buscar por código o descripción (ej: 2611 o 'contable')..."
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
              {filteredResults.length} ocupaciones encontradas
              {searchQuery.length > 0 && searchQuery.length < 2 && ' — escribe al menos 2 caracteres'}
            </p>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-3 space-y-4">
              {Object.keys(groupedResults).length === 0 ? (
                <div className="py-12 text-center">
                  <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No se encontraron ocupaciones.</p>
                  <p className="text-xs text-muted-foreground mt-1">Prueba con otro término de búsqueda</p>
                </div>
              ) : (
                Object.entries(groupedResults).map(([groupCode, items]) => {
                  const groupInfo = CNO_CATALOG.find((c) => c.code === groupCode);
                  return (
                    <div key={groupCode}>
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1 z-10">
                        <Badge variant="outline" className="font-mono text-xs">
                          {groupCode}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          {groupInfo?.description || `Grupo ${groupCode}`}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {items.map((cno) => {
                          const isSelected = value === cno.code;
                          return (
                            <button
                              key={cno.code}
                              type="button"
                              onClick={() => handleSelect(cno)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                                'hover:bg-accent/50',
                                isSelected && 'bg-primary/10 ring-1 ring-primary/30',
                              )}
                            >
                              <Check
                                className={cn(
                                  'h-4 w-4 shrink-0 text-primary',
                                  isSelected ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="font-mono text-sm font-medium text-primary w-12 shrink-0">
                                {cno.code}
                              </span>
                              <span className="text-sm flex-1 min-w-0 truncate">{cno.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-6 py-3 flex items-center justify-between shrink-0 bg-muted/30">
            {selectedCNO ? (
              <p className="text-xs text-muted-foreground">
                Seleccionado: <span className="font-mono font-medium text-primary">{selectedCNO.code}</span> — {selectedCNO.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Selecciona una ocupación de la lista</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation */}
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
