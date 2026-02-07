/**
 * API Keys Management Panel
 * Fase 9: Gestión de API Keys para integraciones externas
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye,
  EyeOff,
  Trash2,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { useCRMIntegrations } from '@/hooks/crm/integrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const API_PERMISSIONS = [
  { value: 'leads:read', label: 'Leer Leads' },
  { value: 'leads:write', label: 'Escribir Leads' },
  { value: 'deals:read', label: 'Leer Oportunidades' },
  { value: 'deals:write', label: 'Escribir Oportunidades' },
  { value: 'contacts:read', label: 'Leer Contactos' },
  { value: 'contacts:write', label: 'Escribir Contactos' },
  { value: 'activities:read', label: 'Leer Actividades' },
  { value: 'activities:write', label: 'Escribir Actividades' },
  { value: 'reports:read', label: 'Leer Reportes' },
  { value: 'webhooks:manage', label: 'Gestionar Webhooks' }
];

export function APIKeysPanel() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState<{ open: boolean; key: string }>({ 
    open: false, 
    key: '' 
  });
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; id: string }>({ 
    open: false, 
    id: '' 
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate_limit_per_minute: 60,
    rate_limit_per_day: 10000
  });

  const { apiKeys, isLoading, createApiKey, revokeApiKey } = useCRMIntegrations();

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('El nombre es requerido');
      return;
    }

    const result = await createApiKey({
      ...formData,
      permissions: selectedPermissions
    });

    if (result?.fullKey) {
      setIsCreateDialogOpen(false);
      setNewKeyDialog({ open: true, key: result.fullKey });
      setFormData({
        name: '',
        description: '',
        rate_limit_per_minute: 60,
        rate_limit_per_day: 10000
      });
      setSelectedPermissions([]);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API Key copiada al portapapeles');
  };

  const handleTogglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleRevoke = async () => {
    if (revokeDialog.id) {
      await revokeApiKey(revokeDialog.id);
      setRevokeDialog({ open: false, id: '' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona API Keys para acceso programático
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Mi API Key"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Para qué se usará esta API Key..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Límite/minuto</Label>
                  <Input
                    type="number"
                    value={formData.rate_limit_per_minute}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      rate_limit_per_minute: parseInt(e.target.value) || 60 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Límite/día</Label>
                  <Input
                    type="number"
                    value={formData.rate_limit_per_day}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      rate_limit_per_day: parseInt(e.target.value) || 10000 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permisos</Label>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {API_PERMISSIONS.map((permission) => (
                      <div
                        key={permission.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={permission.value}
                          checked={selectedPermissions.includes(permission.value)}
                          onCheckedChange={() => handleTogglePermission(permission.value)}
                        />
                        <label
                          htmlFor={permission.value}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {permission.label}
                        </label>
                        <Badge variant="outline" className="text-xs">
                          {permission.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={isLoading}>
                Crear API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Display Dialog */}
      <Dialog open={newKeyDialog.open} onOpenChange={(open) => setNewKeyDialog({ ...newKeyDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Shield className="h-5 w-5" />
              API Key Creada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-600 font-medium mb-2">
                ⚠️ Guarda esta clave de forma segura
              </p>
              <p className="text-xs text-muted-foreground">
                Esta es la única vez que verás la clave completa. 
                No podrás recuperarla después de cerrar este diálogo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={newKeyDialog.key}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopyKey(newKeyDialog.key)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialog.open} onOpenChange={(open) => setRevokeDialog({ ...revokeDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Las aplicaciones que usen esta clave 
              dejarán de funcionar inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Keys List */}
      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No hay API Keys</h3>
              <p className="text-sm text-muted-foreground">
                Crea tu primera API Key para acceso programático
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className={cn(!apiKey.is_active && "opacity-60")}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-amber-500" />
                      <h3 className="font-medium">{apiKey.name}</h3>
                      <Badge variant={apiKey.is_active ? "default" : "destructive"}>
                        {apiKey.is_active ? 'Activa' : 'Revocada'}
                      </Badge>
                    </div>
                    {apiKey.description && (
                      <p className="text-sm text-muted-foreground">
                        {apiKey.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {apiKey.key_prefix}...
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {apiKey.permissions.length} permisos
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {apiKey.permissions.slice(0, 4).map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                      {apiKey.permissions.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{apiKey.permissions.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="text-right text-sm space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        <span>{apiKey.usage_count.toLocaleString()} usos</span>
                      </div>
                      {apiKey.last_used_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(apiKey.last_used_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Límite: {apiKey.rate_limit_per_minute}/min
                      </p>
                    </div>

                    {apiKey.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRevokeDialog({ open: true, id: apiKey.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default APIKeysPanel;
