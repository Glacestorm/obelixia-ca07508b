import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Plus, Trash2, Key } from 'lucide-react';
import { useERPRoles } from '@/hooks/erp/useERPRoles';

export function ERPRolesPanel() {
  const { roles, permissions, isLoading, fetchRoles, fetchPermissions, createRole, updateRolePermissions, deleteRole } = useERPRoles();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const handleCreate = async () => {
    if (!form.name) return;
    await createRole({ name: form.name, description: form.description, permission_ids: selectedPermissions });
    setForm({ name: '', description: '' });
    setSelectedPermissions([]);
    setIsCreateOpen(false);
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const role = roles.find(r => r.id === roleId);
    setSelectedPermissions(role?.permissions?.map(p => p.id) || []);
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    await updateRolePermissions(selectedRoleId, selectedPermissions);
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Roles</CardTitle>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Rol</DialogTitle>
                  <DialogDescription>Crea un nuevo rol</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate}>Crear</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>Gestión de roles y permisos</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className={`p-3 rounded-lg border cursor-pointer ${selectedRoleId === role.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => handleSelectRole(role.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">{role.name}{role.is_system && <Badge variant="outline" className="text-xs">Sistema</Badge>}</div>
                      <p className="text-sm text-muted-foreground">{role.description || 'Sin descripción'}</p>
                    </div>
                    {!role.is_system && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Permisos {selectedRole ? `- ${selectedRole.name}` : ''}</CardTitle>
            </div>
            {selectedRoleId && !selectedRole?.is_system && (
              <Button size="sm" onClick={handleSavePermissions}>Guardar</Button>
            )}
          </div>
          <CardDescription>{selectedRole ? 'Asigna permisos' : 'Selecciona un rol'}</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedRoleId ? (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">Selecciona un rol</div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Accordion type="multiple" className="w-full">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <AccordionItem key={module} value={module}>
                    <AccordionTrigger><Badge variant="outline" className="capitalize">{module}</Badge></AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-4">
                        {perms.map(perm => (
                          <div key={perm.id} className="flex items-start gap-3 py-2">
                            <Checkbox id={perm.id} checked={selectedPermissions.includes(perm.id)} onCheckedChange={() => handleTogglePermission(perm.id)} disabled={selectedRole?.is_system} />
                            <label htmlFor={perm.id} className="text-sm cursor-pointer"><span className="font-medium">{perm.key}</span><p className="text-xs text-muted-foreground">{perm.description}</p></label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ERPRolesPanel;
