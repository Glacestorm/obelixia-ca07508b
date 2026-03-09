/**
 * EnergyAlertPreferencesPanel - Alert channel + type preferences (email/WhatsApp prepared)
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Bell, Mail, MessageSquare, Smartphone, Save, Loader2, AlertTriangle, CheckCircle2, Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  companyId: string;
}

const ALERT_TYPES = [
  { key: 'contract_expiry', label: 'Vencimiento de contrato', description: 'Aviso cuando un contrato está próximo a vencer' },
  { key: 'price_spike', label: 'Pico de precio', description: 'Alerta cuando el precio del mercado supera un umbral' },
  { key: 'savings_opportunity', label: 'Oportunidad de ahorro', description: 'Se detecta una tarifa más favorable' },
  { key: 'regulation_change', label: 'Cambio normativo', description: 'Nueva regulación relevante publicada' },
];

const CHANNELS = [
  { key: 'in_app', label: 'In-app', icon: Bell, available: true },
  { key: 'email', label: 'Email', icon: Mail, available: false },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, available: false },
  { key: 'sms', label: 'SMS', icon: Smartphone, available: false },
];

const FREQUENCIES = [
  { value: 'immediate', label: 'Inmediata' },
  { value: 'daily', label: 'Resumen diario' },
  { value: 'weekly', label: 'Resumen semanal' },
];

export function EnergyAlertPreferencesPanel({ companyId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['in_app']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['contract_expiry', 'price_spike', 'savings_opportunity', 'regulation_change']);
  const [frequency, setFrequency] = useState('immediate');
  const [clientEmail, setClientEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_alert_preferences')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setExistingId(data.id);
        setSelectedChannels((data as any).channels || ['in_app']);
        setSelectedTypes((data as any).alert_types || []);
        setFrequency((data as any).frequency || 'immediate');
        setClientEmail((data as any).client_email || '');
        setPhoneNumber((data as any).phone_number || '');
        setIsActive((data as any).is_active ?? true);
      }
    } catch (err) {
      console.error('[EnergyAlertPreferences] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, user?.id]);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        user_id: user.id,
        channels: selectedChannels,
        alert_types: selectedTypes,
        frequency,
        client_email: clientEmail || null,
        phone_number: phoneNumber || null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await supabase.from('energy_alert_preferences').update(payload as any).eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('energy_alert_preferences').insert([payload] as any).select().single();
        if (error) throw error;
        setExistingId((data as any).id);
      }
      toast.success('Preferencias de alertas guardadas');
    } catch (err) {
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Alertas Proactivas</h2>
          <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Activas' : 'Pausadas'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Channels */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Canales de notificación</CardTitle>
          <CardDescription className="text-xs">Selecciona cómo quieres recibir las alertas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CHANNELS.map(ch => {
              const Icon = ch.icon;
              const selected = selectedChannels.includes(ch.key);
              return (
                <button
                  key={ch.key}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  } ${!ch.available && ch.key !== 'in_app' ? 'opacity-60' : ''}`}
                  onClick={() => ch.available ? toggleChannel(ch.key) : toast.info(`${ch.label}: Requiere integración externa (próximamente)`)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{ch.label}</span>
                  </div>
                  {!ch.available && ch.key !== 'in_app' ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> Próximamente
                    </div>
                  ) : (
                    <Badge variant={selected ? 'default' : 'outline'} className="text-[10px]">
                      {selected ? 'Activo' : 'Inactivo'}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alert types */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tipos de alerta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALERT_TYPES.map(at => (
            <div key={at.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{at.label}</p>
                <p className="text-xs text-muted-foreground">{at.description}</p>
              </div>
              <Switch checked={selectedTypes.includes(at.key)} onCheckedChange={() => toggleType(at.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Frequency + contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Frecuencia</CardTitle></CardHeader>
          <CardContent>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Datos de contacto</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Email (para alertas por email)</Label>
              <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Teléfono (para WhatsApp/SMS)</Label>
              <Input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+34 600 000 000" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Canales en preparación</p>
              <p className="text-xs text-muted-foreground">
                Las alertas <strong>in-app</strong> funcionan de inmediato. Los canales <strong>Email</strong>, <strong>WhatsApp</strong> y <strong>SMS</strong> requieren integración con servicios externos (Resend, Twilio). Tus preferencias se guardan para activarlos cuando estén disponibles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnergyAlertPreferencesPanel;
