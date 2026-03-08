/**
 * HRPremiumExportPanel — P9.12
 * Export & Report Generator for Premium HR modules.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Download, FileJson, FileSpreadsheet, Shield, Brain, Users, Scale,
  Layers, FileText, BarChart3, UserCog, Inbox, Loader2
} from 'lucide-react';
import { useHRPremiumExport, type PremiumModuleKey, type ExportFormat } from '@/hooks/admin/hr/useHRPremiumExport';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Props {
  companyId?: string;
  className?: string;
}

const MODULE_ICONS: Record<PremiumModuleKey, React.ReactNode> = {
  security: <Shield className="h-4 w-4" />,
  ai_governance: <Brain className="h-4 w-4" />,
  workforce: <Users className="h-4 w-4" />,
  fairness: <Scale className="h-4 w-4" />,
  twin: <Layers className="h-4 w-4" />,
  legal: <FileText className="h-4 w-4" />,
  cnae: <BarChart3 className="h-4 w-4" />,
  role_experience: <UserCog className="h-4 w-4" />,
};

export function HRPremiumExportPanel({ companyId, className }: Props) {
  const { isExporting, progress, exportModule, exportAll, moduleLabels, allModules, getTablesForModule } = useHRPremiumExport(companyId);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para exportar datos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export & Reports Premium
          </h2>
          <p className="text-sm text-muted-foreground">
            Exporta datos de los módulos Premium HR en JSON o CSV
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Formato:</Label>
            <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ExportFormat)}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <span className="flex items-center gap-1.5"><FileJson className="h-3.5 w-3.5" /> JSON</span>
                </SelectItem>
                <SelectItem value="csv">
                  <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => exportAll(selectedFormat)} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar Todo
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isExporting && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div className="flex-1">
                <Progress value={progress} className="h-2" />
              </div>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allModules.map(mod => {
          const tables = getTablesForModule(mod);
          return (
            <Card key={mod} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-primary">{MODULE_ICONS[mod]}</span>
                    {moduleLabels[mod]}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{tables.length} tablas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {tables.map(t => (
                      <Badge key={t.table} variant="secondary" className="text-[10px]">
                        {t.label}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 mt-2"
                    onClick={() => exportModule(mod, selectedFormat)}
                    disabled={isExporting}
                  >
                    {selectedFormat === 'json'
                      ? <FileJson className="h-3.5 w-3.5" />
                      : <FileSpreadsheet className="h-3.5 w-3.5" />
                    }
                    Exportar {selectedFormat.toUpperCase()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default HRPremiumExportPanel;
