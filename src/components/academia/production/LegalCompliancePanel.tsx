import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, AlertTriangle, FileText, Save } from 'lucide-react';

export function LegalCompliancePanel() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [config, setConfig] = useState({
    disclaimer_text: 'Este curso tiene fines educativos y formativos. No constituye asesoramiento financiero personalizado. Las decisiones de inversión son responsabilidad exclusiva del usuario.',
    has_financial_disclaimer: true,
    crypto_advertising: false,
    influencer_warning: false,
    vat_exempt: false,
    oss_enabled: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title').order('title').then(({ data }) => { if (data) setCourses(data); });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    supabase.from('academia_legal_config').select('*').eq('course_id', selectedCourse).single().then(({ data }) => {
      if (data) {
        setConfig({
          disclaimer_text: data.disclaimer_text || config.disclaimer_text,
          has_financial_disclaimer: data.has_financial_disclaimer ?? true,
          crypto_advertising: data.crypto_advertising ?? false,
          influencer_warning: data.influencer_warning ?? false,
          vat_exempt: data.vat_exempt ?? false,
          oss_enabled: data.oss_enabled ?? false,
        });
      }
    });
  }, [selectedCourse]);

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    const { error } = await supabase.from('academia_legal_config').upsert({
      course_id: selectedCourse,
      ...config,
    } as any, { onConflict: 'course_id' });
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Configuración legal guardada');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-500">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Compliance Legal y Fiscal</h2>
          <p className="text-sm text-muted-foreground">Disclaimer, CNMV, IVA/OSS - Cumplimiento normativo UE</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Selecciona un curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Disclaimer Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={config.disclaimer_text} onChange={e => setConfig(p => ({ ...p, disclaimer_text: e.target.value }))} rows={4} />
              <div className="flex items-center justify-between">
                <Label>Incluir disclaimer automáticamente</Label>
                <Switch checked={config.has_financial_disclaimer} onCheckedChange={v => setConfig(p => ({ ...p, has_financial_disclaimer: v }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Alertas Regulatorias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Publicidad de criptoactivos</Label>
                  <p className="text-xs text-muted-foreground">CNMV Circular 1/2022 - Requisitos específicos</p>
                </div>
                <Switch checked={config.crypto_advertising} onCheckedChange={v => setConfig(p => ({ ...p, crypto_advertising: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Aviso influencer financiero</Label>
                  <p className="text-xs text-muted-foreground">Criterios CNMV sobre captación de clientes</p>
                </div>
                <Switch checked={config.influencer_warning} onCheckedChange={v => setConfig(p => ({ ...p, influencer_warning: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Exención IVA educativo</Label>
                  <p className="text-xs text-muted-foreground">Actividad educativa autorizada</p>
                </div>
                <Switch checked={config.vat_exempt} onCheckedChange={v => setConfig(p => ({ ...p, vat_exempt: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>OSS (One Stop Shop) UE</Label>
                  <p className="text-xs text-muted-foreground">IVA por país para consumidores UE</p>
                </div>
                <Switch checked={config.oss_enabled} onCheckedChange={v => setConfig(p => ({ ...p, oss_enabled: v }))} />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Configuración Legal'}
          </Button>
        </>
      )}
    </div>
  );
}

export default LegalCompliancePanel;
