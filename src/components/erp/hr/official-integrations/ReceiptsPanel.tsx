/**
 * ReceiptsPanel — Acuses y justificantes globales
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, FileCheck, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { SubmissionReceipt } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface Props {
  hub: {
    receipts: SubmissionReceipt[];
    fetchReceipts: (submissionId?: string) => Promise<any>;
  };
}

const TYPE_ICONS: Record<string, typeof CheckCircle> = {
  acceptance: CheckCircle,
  rejection: XCircle,
  acknowledgement: Clock,
  partial: Clock,
  correction_required: XCircle,
};

const TYPE_COLORS: Record<string, string> = {
  acceptance: 'text-green-500',
  rejection: 'text-destructive',
  acknowledgement: 'text-blue-500',
  partial: 'text-amber-500',
  correction_required: 'text-orange-500',
};

export function ReceiptsPanel({ hub }: Props) {
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { hub.fetchReceipts(); }, []);

  const filtered = hub.receipts.filter(r => typeFilter === 'all' || r.receipt_type === typeFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" /> Acuses y justificantes
        </h3>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="acknowledgement">Acuse recibo</SelectItem>
              <SelectItem value="acceptance">Aceptación</SelectItem>
              <SelectItem value="rejection">Rechazo</SelectItem>
              <SelectItem value="correction_required">Corrección</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => hub.fetchReceipts()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin acuses registrados</CardContent></Card>
        ) : filtered.map(r => {
          const Icon = TYPE_ICONS[r.receipt_type] || Clock;
          const color = TYPE_COLORS[r.receipt_type] || 'text-muted-foreground';
          return (
            <Card key={r.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <div>
                    <p className="text-sm font-medium">{r.receipt_reference || 'Sin referencia'}</p>
                    <p className="text-xs text-muted-foreground">
                      Envío: {r.submission_id.slice(0, 8)} · {r.receipt_date ? new Date(r.receipt_date).toLocaleDateString('es-ES') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{r.receipt_type}</Badge>
                  <Badge variant={r.validation_status === 'valid' ? 'default' : r.validation_status === 'invalid' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {r.validation_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
