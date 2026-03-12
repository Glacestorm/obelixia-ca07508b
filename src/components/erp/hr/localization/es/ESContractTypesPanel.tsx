/**
 * ESContractTypesPanel — Catálogo de tipos de contrato RD España
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { useESLocalization } from '@/hooks/erp/hr/useESLocalization';

interface Props { companyId: string; }

const CATEGORY_COLORS: Record<string, string> = {
  indefinido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  temporal: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  formacion: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  practicas: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function ESContractTypesPanel({ companyId }: Props) {
  const es = useESLocalization(companyId);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    es.fetchContractTypes(filterCategory === 'all' ? undefined : filterCategory);
  }, [filterCategory]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Tipos de Contrato RD
          </CardTitle>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="indefinido">Indefinido</SelectItem>
              <SelectItem value="temporal">Temporal</SelectItem>
              <SelectItem value="formacion">Formación</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {es.contractTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin tipos de contrato</p>
        ) : (
          <div className="space-y-2">
            {es.contractTypes.map(ct => (
              <div key={ct.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{ct.code}</Badge>
                      <span className="text-sm font-medium">{ct.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge className={`text-xs ${CATEGORY_COLORS[ct.category] || ''}`}>{ct.category}</Badge>
                      {ct.subcategory && <Badge variant="outline" className="text-xs">{ct.subcategory}</Badge>}
                      <Badge variant="outline" className="text-xs">{ct.jornada_default}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    {ct.duracion_maxima_meses && (
                      <p className="text-muted-foreground">Máx. {ct.duracion_maxima_meses} meses</p>
                    )}
                    {ct.periodo_prueba_max_meses && (
                      <p className="text-muted-foreground">Prueba: {ct.periodo_prueba_max_meses}m</p>
                    )}
                    <p className="font-medium">Indemn: {ct.indemnizacion_dias_anyo}d/año</p>
                  </div>
                </div>
                {ct.normativa_referencia && (
                  <p className="text-xs text-muted-foreground mt-1.5 italic">{ct.normativa_referencia}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
