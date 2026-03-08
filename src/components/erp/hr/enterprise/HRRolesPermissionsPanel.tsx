/**
 * HRRolesPermissionsPanel - Administración RBAC/ABAC
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Users, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { useHREnterprise } from '@/hooks/admin/hr/useHREnterprise';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props { companyId: string; }

export function HRRolesPermissionsPanel({ companyId }: Props) {
  const { roles, fetchRoles, permissions, fetchPermissions, loading } = useHREnterprise();
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  useEffect(() => { fetchRoles(companyId); fetchPermissions(); }, [companyId]);

  const toggleRole = (id: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group permissions by module
  const permsByModule = permissions.reduce<Record<string, typeof permissions>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Roles y Permisos Enterprise</h3>
          <p className="text-sm text-muted-foreground">RBAC + ABAC con permisos granulares por módulo y acción</p>
        </div>
      </div>

      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sin roles enterprise. Genera datos demo para crear la matriz de roles y permisos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRoles.has(role.id);
            const rolePerms = role.erp_hr_role_permissions || [];
            const permIds = new Set(rolePerms.map(rp => rp.permission_id));

            return (
              <Card key={role.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleRole(role.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <Users className="h-4 w-4" />
                          {role.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline"><code className="text-xs">{role.code}</code></Badge>
                          {role.is_system && <Badge variant="secondary">Sistema</Badge>}
                          <Badge>{rolePerms.length} permisos</Badge>
                          <Badge variant="outline">Prioridad: {role.priority}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {Object.entries(permsByModule).map(([module, modulePerms]) => (
                            <div key={module}>
                              <h4 className="text-sm font-medium capitalize mb-2 flex items-center gap-2">
                                <Shield className="h-3 w-3" /> {module}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {modulePerms.map((perm) => {
                                  const hasPermission = permIds.has(perm.id);
                                  return (
                                    <Badge
                                      key={perm.id}
                                      variant={hasPermission ? 'default' : 'outline'}
                                      className={`text-xs ${!hasPermission ? 'opacity-30' : ''} ${perm.is_sensitive ? 'border-destructive/50' : ''}`}
                                    >
                                      {hasPermission && <CheckCircle className="h-3 w-3 mr-1" />}
                                      {perm.action}
                                      {perm.is_sensitive && ' ⚠️'}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
