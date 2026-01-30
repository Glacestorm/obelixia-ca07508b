/**
 * SII Config Panel - Configuración del SII
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Save,
  Shield,
  Calendar,
  FileKey,
  Info,
} from 'lucide-react';
import { useERPSII } from '@/hooks/erp/useERPSII';
import { toast } from 'sonner';

export function SIIConfigPanel() {
  const { config, saveConfig } = useERPSII();
  
  const [formData, setFormData] = useState({
    enabled: config?.enabled ?? false,
    auto_send: config?.auto_send ?? false,
    tax_id: config?.tax_id ?? '',
    company_name: config?.company_name ?? '',
    certificate_id: config?.certificate_id ?? '',
    start_date: config?.start_date ?? '',
    end_date: config?.end_date ?? '',
    storage_path: config?.storage_path ?? '',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          El SII (Suministro Inmediato de Información) es el sistema de la AEAT para la 
          comunicación electrónica de los registros de facturación en un plazo máximo de 4 días.
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* General Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración General
            </CardTitle>
            <CardDescription>
              Parámetros básicos para la conexión con el SII
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activar SII</Label>
                <p className="text-sm text-muted-foreground">
                  Habilitar el envío automático de registros
                </p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Envío automático</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar registros automáticamente al contabilizar
                </p>
              </div>
              <Switch
                checked={formData.auto_send}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_send: checked }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="tax_id">NIF/CIF de la empresa</Label>
              <Input
                id="tax_id"
                placeholder="B12345678"
                value={formData.tax_id}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Razón social</Label>
              <Input
                id="company_name"
                placeholder="Mi Empresa S.L."
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Certificate Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Certificado Digital
            </CardTitle>
            <CardDescription>
              Configuración del certificado para firma electrónica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="certificate_id">ID del certificado</Label>
              <Input
                id="certificate_id"
                placeholder="Identificador del certificado"
                value={formData.certificate_id}
                onChange={(e) => setFormData(prev => ({ ...prev, certificate_id: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                En producción, aquí se configuraría el certificado FNMT o similar
              </p>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <FileKey className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Modo demostración:</strong> Los envíos se simulan localmente. 
                En producción se requiere certificado digital válido.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Period Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período de Aplicación
            </CardTitle>
            <CardDescription>
              Fechas de inicio y fin del SII para esta empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha fin (opcional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage_path">Ruta de almacenamiento</Label>
              <Input
                id="storage_path"
                placeholder="/sii/xml/"
                value={formData.storage_path}
                onChange={(e) => setFormData(prev => ({ ...prev, storage_path: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Ubicación donde se guardan los XMLs enviados y respuestas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SIIConfigPanel;
