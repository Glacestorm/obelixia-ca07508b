import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ShoppingCart, HardHat, Heart, Truck, Scale,
  Package, Settings, Euro, TrendingUp, Save, X
} from 'lucide-react';

interface VerticalPack {
  id: string;
  vertical_key: string;
  vertical_name: string;
  description: string | null;
  cnae_codes: string[];
  included_modules: string[];
  pricing_config: { setup_fee?: number; monthly_fee?: number } | null;
  is_active: boolean | null;
  icon_name: string | null;
}

const iconMap: Record<string, any> = {
  ShoppingCart, HardHat, Heart, Truck, Scale
};

export const VerticalPacksManager: React.FC = () => {
  const [packs, setPacks] = useState<VerticalPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<VerticalPack | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    vertical_name: '',
    description: '',
    setup_fee: 0,
    monthly_fee: 0,
    is_active: true
  });

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('vertical_packs')
      .select('id, vertical_key, vertical_name, description, cnae_codes, included_modules, pricing_config, is_active, icon_name')
      .order('display_order');
    if (data) setPacks(data as VerticalPack[]);
    setLoading(false);
  };

  const handleOpenConfig = (pack: VerticalPack) => {
    setSelectedPack(pack);
    setEditForm({
      vertical_name: pack.vertical_name,
      description: pack.description || '',
      setup_fee: pack.pricing_config?.setup_fee || 0,
      monthly_fee: pack.pricing_config?.monthly_fee || 0,
      is_active: pack.is_active ?? true
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedPack) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('vertical_packs')
        .update({
          vertical_name: editForm.vertical_name,
          description: editForm.description,
          pricing_config: {
            setup_fee: editForm.setup_fee,
            monthly_fee: editForm.monthly_fee
          },
          is_active: editForm.is_active
        })
        .eq('id', selectedPack.id);

      if (error) throw error;

      toast.success('Configuración guardada correctamente');
      setIsConfigOpen(false);
      fetchPacks();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Package;
    return Icon;
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Packs Verticales</h2>
          <p className="text-muted-foreground">Gestión de soluciones sectoriales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const Icon = getIcon(pack.icon_name || 'Package');
          return (
            <Card key={pack.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{pack.vertical_name}</CardTitle>
                  </div>
                  <Badge variant={pack.is_active ? 'default' : 'outline'}>
                    {pack.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{pack.description || 'Sin descripción'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>CNAEs incluidos:</span>
                  <Badge variant="outline">{pack.cnae_codes?.length || 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Módulos:</span>
                  <Badge variant="outline">{pack.included_modules?.length || 0}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Setup</p>
                    <p className="font-bold">{pack.pricing_config?.setup_fee?.toLocaleString() || 0} €</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Mensual</p>
                    <p className="font-bold">{pack.pricing_config?.monthly_fee || 0} €</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleOpenConfig(pack)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de Configuración */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Pack: {selectedPack?.vertical_name}
            </DialogTitle>
            <DialogDescription>
              Modifica los parámetros del pack vertical
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="vertical_name">Nombre del Pack</Label>
                <Input
                  id="vertical_name"
                  value={editForm.vertical_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, vertical_name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setup_fee">Tarifa Setup (€)</Label>
                  <Input
                    id="setup_fee"
                    type="number"
                    value={editForm.setup_fee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, setup_fee: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_fee">Tarifa Mensual (€)</Label>
                  <Input
                    id="monthly_fee"
                    type="number"
                    value={editForm.monthly_fee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, monthly_fee: Number(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Estado del Pack</Label>
                  <p className="text-sm text-muted-foreground">
                    {editForm.is_active ? 'Activo y disponible' : 'Inactivo'}
                  </p>
                </div>
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
              
              {selectedPack && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Información del Pack</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">CNAEs: </span>
                      <Badge variant="outline">{selectedPack.cnae_codes?.length || 0}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Módulos: </span>
                      <Badge variant="outline">{selectedPack.included_modules?.length || 0}</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};