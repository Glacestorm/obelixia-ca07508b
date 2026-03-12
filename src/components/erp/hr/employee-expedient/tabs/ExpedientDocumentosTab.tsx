/**
 * ExpedientDocumentosTab — Digital document archive
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientDocumentosTab({ employeeId, companyId, onNavigate }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" /> Documentos del Empleado</span>
          {onNavigate && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('documents')}>
              Gestor documental
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Documentos y evidencias de compliance vinculados al empleado</p>
          <p className="text-xs text-muted-foreground mt-1">Las plantillas de documentos por país se cargan desde la localización correspondiente.</p>
        </div>
      </CardContent>
    </Card>
  );
}
