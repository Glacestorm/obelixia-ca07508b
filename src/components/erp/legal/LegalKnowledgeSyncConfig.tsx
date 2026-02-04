/**
 * LegalKnowledgeSyncConfig - Configuración de sincronización automática
 * Permite configurar hora, día de la semana, modo auto/manual y notificaciones
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Clock,
  Calendar,
  Bell,
  RefreshCw,
  Zap,
  CheckCircle,
  Loader2,
  Info,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface SyncConfig {
  enabled: boolean;
  syncHour: number;
  syncMinute: number;
  syncDays: string[];
  notifications: boolean;
  autoMode: boolean;
  lastSync: string | null;
  nextSync: string | null;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: i.toString().padStart(2, '0') + ':00'
}));

interface LegalKnowledgeSyncConfigProps {
  onSyncTriggered?: () => void;
}

export function LegalKnowledgeSyncConfig({ onSyncTriggered }: LegalKnowledgeSyncConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [config, setConfig] = useState<SyncConfig>({
    enabled: true,
    syncHour: 6,
    syncMinute: 0,
    syncDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    notifications: true,
    autoMode: true,
    lastSync: null,
    nextSync: null
  });

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load from localStorage for now (could be moved to DB)
      const savedConfig = localStorage.getItem('legal_sync_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
      
      // Get last sync info from legal_knowledge_base
      const { data } = await supabase
        .from('legal_knowledge_base')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setConfig(prev => ({ ...prev, lastSync: data.updated_at }));
      }
    } catch (error) {
      console.error('Error loading sync config:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('legal_sync_config', JSON.stringify({
        enabled: config.enabled,
        syncHour: config.syncHour,
        syncMinute: config.syncMinute,
        syncDays: config.syncDays,
        notifications: config.notifications,
        autoMode: config.autoMode
      }));

      toast.success('Configuración guardada');
      
      if (config.enabled && config.notifications) {
        toast.info(`Sincronización programada: ${config.syncHour.toString().padStart(2, '0')}:${config.syncMinute.toString().padStart(2, '0')} UTC`);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-knowledge-sync', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Sincronización completada: ${data.synced || 0} documentos actualizados`);
        setConfig(prev => ({ ...prev, lastSync: new Date().toISOString() }));
        onSyncTriggered?.();
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Error al sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleDay = (day: string) => {
    setConfig(prev => ({
      ...prev,
      syncDays: prev.syncDays.includes(day)
        ? prev.syncDays.filter(d => d !== day)
        : [...prev.syncDays, day]
    }));
  };

  const calculateNextSync = () => {
    if (!config.enabled || config.syncDays.length === 0) return 'No programada';
    
    const now = new Date();
    const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Find next sync day
    const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = daysOrder.indexOf(todayDay);
    
    for (let i = 0; i < 7; i++) {
      const checkIndex = (todayIndex + i) % 7;
      const checkDay = daysOrder[checkIndex];
      if (config.syncDays.includes(checkDay)) {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + i);
        nextDate.setHours(config.syncHour, config.syncMinute, 0, 0);
        
        if (nextDate > now) {
          return formatDistanceToNow(nextDate, { addSuffix: true, locale: es });
        }
      }
    }
    
    return 'Calculando...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configurar Sincronización
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Configuración de Sincronización
          </DialogTitle>
          <DialogDescription>
            Configura cuándo y cómo se actualizan automáticamente los datos jurídicos
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estado actual */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última sincronización:</span>
                <Badge variant="outline">
                  {config.lastSync 
                    ? formatDistanceToNow(new Date(config.lastSync), { addSuffix: true, locale: es })
                    : 'Nunca'
                  }
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Próxima sincronización:</span>
                <Badge variant={config.enabled ? 'default' : 'secondary'}>
                  {calculateNextSync()}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Modo de sincronización */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <Label htmlFor="autoMode">Modo automático</Label>
                </div>
                <Switch
                  id="autoMode"
                  checked={config.autoMode}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoMode: checked, enabled: checked }))}
                />
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Sincroniza automáticamente según la programación configurada
              </p>
            </div>

            {config.autoMode && (
              <>
                <Separator />

                {/* Hora de sincronización */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <Label>Hora de sincronización (UTC)</Label>
                  </div>
                  <Select
                    value={config.syncHour.toString()}
                    onValueChange={(val) => setConfig(prev => ({ ...prev, syncHour: parseInt(val) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour.value} value={hour.value}>
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Días de la semana */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label>Días de sincronización</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Badge
                        key={day.value}
                        variant={config.syncDays.includes(day.value) ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clic para activar/desactivar cada día
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Notificaciones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <Label htmlFor="notifications">Notificaciones</Label>
                </div>
                <Switch
                  id="notifications"
                  checked={config.notifications}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, notifications: checked }))}
                />
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Recibe alertas cuando haya nuevas actualizaciones normativas
              </p>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                La sincronización descarga novedades de CENDOJ, EUR-Lex, BOPA, DGT, TEAC y AEPD.
                Los documentos existentes se actualizan si hay cambios.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleManualSync}
            disabled={isSyncing || isSaving}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Sincronizar Ahora
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isSyncing}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LegalKnowledgeSyncConfig;
