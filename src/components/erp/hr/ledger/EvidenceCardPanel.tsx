/**
 * EvidenceCardPanel — View evidence linked to a ledger event or entity
 * V2-RRHH-FASE-2
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, Camera, CheckSquare, PenTool, Package, Lock,
  Calculator, ShieldCheck, Receipt, Bot, XCircle
} from 'lucide-react';
import { useHREvidence, type EvidenceRecord } from '@/hooks/erp/hr/useHREvidence';
import { EVIDENCE_TYPE_LABELS } from '@/engines/erp/hr/evidenceEngine';
import type { EvidenceType } from '@/engines/erp/hr/ledgerEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  entityType?: string;
  entityId?: string;
  ledgerEventId?: string;
  title?: string;
}

const ICON_MAP: Record<EvidenceType, typeof FileText> = {
  document: FileText,
  snapshot: Camera,
  approval: CheckSquare,
  signature: PenTool,
  export_package: Package,
  closure_package: Lock,
  calculation_result: Calculator,
  validation_result: ShieldCheck,
  external_receipt: Receipt,
  system_generated: Bot,
};

export function EvidenceCardPanel({
  companyId,
  entityType,
  entityId,
  ledgerEventId,
  title = 'Evidencia',
}: Props) {
  const { useEvidenceByEntity, useEvidenceByEvent } = useHREvidence(companyId);

  // Choose query based on available params
  const entityQuery = useEvidenceByEntity(entityType ?? '', entityId ?? '');
  const eventQuery = useEvidenceByEvent(ledgerEventId ?? null);

  const evidence: EvidenceRecord[] = ledgerEventId
    ? (eventQuery.data ?? [])
    : (entityQuery.data ?? []);
  const isLoading = ledgerEventId ? eventQuery.isLoading : entityQuery.isLoading;

  const validCount = evidence.filter(e => e.is_valid).length;
  const invalidCount = evidence.filter(e => !e.is_valid).length;

  if (evidence.length === 0 && !isLoading) {
    return null; // Don't show empty evidence panel
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px]">{validCount} válidas</Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">{invalidCount} invalidadas</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-2">
              {evidence.map(item => {
                const Icon = ICON_MAP[item.evidence_type] ?? FileText;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg border",
                      item.is_valid ? "bg-card" : "bg-destructive/5 border-destructive/20"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded shrink-0",
                      item.is_valid ? "bg-primary/10" : "bg-destructive/10"
                    )}>
                      {item.is_valid ? (
                        <Icon className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.evidence_label}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {EVIDENCE_TYPE_LABELS[item.evidence_type]}
                        </Badge>
                        <span>
                          {formatDistanceToNow(new Date(item.captured_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                      {item.content_hash && (
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
                          hash: {item.content_hash.slice(0, 24)}…
                        </p>
                      )}
                      {!item.is_valid && item.invalidation_reason && (
                        <p className="text-xs text-destructive mt-1">
                          Invalidada: {item.invalidation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
