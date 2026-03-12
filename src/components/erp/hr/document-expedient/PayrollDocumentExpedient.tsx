/**
 * PayrollDocumentExpedient — Documentos vinculados a nómina
 * Nóminas generadas, TC1/TC2, certificados IRPF por período
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign } from 'lucide-react';
import { useHRDocumentExpedient } from '@/hooks/erp/hr/useHRDocumentExpedient';

interface Props {
  companyId: string;
}

export function PayrollDocumentExpedient({ companyId }: Props) {
  const { documents, isLoadingDocuments } = useHRDocumentExpedient(companyId);
  const payrollDocs = documents.filter(d => d.category === 'payroll');

  if (isLoadingDocuments) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Expediente de Nómina
        </h3>
        <p className="text-sm text-muted-foreground">
          Nóminas, TC1/TC2, certificados de retenciones y documentos generados
        </p>
      </div>

      {payrollDocs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay documentos de nómina en el expediente</p>
            <p className="text-xs text-muted-foreground mt-1">Los documentos se generan automáticamente al procesar nóminas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {payrollDocs.map(doc => (
            <Card key={doc.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{doc.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.document_type} · v{doc.version}
                      {doc.expiry_date && ` · Vence: ${doc.expiry_date}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{doc.source}</Badge>
                  {doc.integrity_verified && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Verificado</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
