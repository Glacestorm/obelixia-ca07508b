/**
 * HRDepartmentsPanel - Gestión de departamentos
 * H1.1: Connected to real DB (erp_hr_departments) with demo fallback
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, Users, Plus, Search, Edit,
  ChevronRight, ChevronDown, User, Briefcase, MapPin, AlertTriangle
} from 'lucide-react';
import { HRDepartmentFormDialog } from './dialogs';
import { supabase } from '@/integrations/supabase/client';

interface HRDepartmentsPanelProps {
  companyId: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  manager_name: string | null;
  location: string | null;
  budget: number | null;
  parent_id: string | null;
  children?: Department[];
}

export function HRDepartmentsPanel({ companyId }: HRDepartmentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_departments')
        .select('id, name, code, location, budget, parent_id, manager_id')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setIsDemo(true);
        setDepartments(DEMO_DEPARTMENTS);
        setExpandedDepts(new Set(['demo-1']));
      } else {
        setIsDemo(false);

        // Resolve manager names
        const managerIds = data.map(d => d.manager_id).filter(Boolean) as string[];
        let managerMap: Record<string, string> = {};
        if (managerIds.length > 0) {
          const { data: employees } = await supabase
            .from('erp_hr_employees')
            .select('id, first_name, last_name')
            .in('id', managerIds);
          employees?.forEach(e => {
            managerMap[e.id] = `${e.first_name} ${e.last_name}`.trim();
          });
        }

        // Get employee counts per department
        const { data: empCounts } = await supabase
          .from('erp_hr_employees')
          .select('department_id')
          .eq('company_id', companyId)
          .eq('is_active', true);
        
        const counts: Record<string, number> = {};
        empCounts?.forEach(e => {
          if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1;
        });
        setEmployeeCounts(counts);

        const mapped: Department[] = data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
          manager_name: d.manager_id ? managerMap[d.manager_id] || null : null,
          location: d.location,
          budget: d.budget ? Number(d.budget) : null,
          parent_id: d.parent_id,
        }));

        // Build tree
        const tree = buildTree(mapped);
        setDepartments(tree);
        if (tree.length > 0) setExpandedDepts(new Set([tree[0].id]));
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setIsDemo(true);
      setDepartments(DEMO_DEPARTMENTS);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedDepts(newExpanded);
  };

  const handleEdit = (dept: Department) => {
    if (isDemo) return;
    setEditingDepartment(dept);
    setShowDepartmentDialog(true);
  };

  const handleDialogClose = (open: boolean) => {
    setShowDepartmentDialog(open);
    if (!open) {
      setEditingDepartment(null);
      fetchDepartments();
    }
  };

  const flatDepts = flattenTree(departments);
  const totalEmployees = flatDepts.reduce((sum, d) => sum + (employeeCounts[d.id] || (isDemo ? 0 : 0)), 0);
  const demoEmployeeTotal = isDemo ? 49 : totalEmployees;

  const renderDepartment = (dept: Department, level: number = 0) => {
    const hasChildren = dept.children && dept.children.length > 0;
    const isExpanded = expandedDepts.has(dept.id);
    const empCount = isDemo ? null : (employeeCounts[dept.id] || 0);

    return (
      <div key={dept.id}>
        <div 
          className={`
            flex items-center justify-between p-3 rounded-lg border 
            hover:bg-muted/50 transition-colors cursor-pointer
            ${level > 0 ? 'ml-6 border-l-2 border-l-primary/30' : ''}
          `}
          style={{ marginLeft: level * 24 }}
          onClick={() => hasChildren && toggleExpand(dept.id)}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : <div className="w-4" />}
            
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{dept.name}</span>
                <Badge variant="outline" className="text-xs">{dept.code}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {dept.manager_name && (
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{dept.manager_name}</span>
                )}
                {dept.location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{dept.location}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              {empCount !== null && (
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{empCount}</span>
                </div>
              )}
              {dept.budget && (
                <p className="text-xs text-muted-foreground">€{(dept.budget / 1000).toFixed(0)}k</p>
              )}
            </div>
            
            {!isDemo && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(dept); }}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {dept.children!.map(sub => renderDepartment(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Demo banner */}
      {isDemo && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm text-warning">Datos de ejemplo — No hay departamentos reales configurados para esta empresa</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Departamentos</p>
                <p className="text-lg font-bold">{flatDepts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Empleados</p>
                <p className="text-lg font-bold">{demoEmployeeTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Centros de Trabajo</p>
                <p className="text-lg font-bold">{isDemo ? '3' : new Set(flatDepts.map(d => d.location).filter(Boolean)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Presupuesto RRHH</p>
                <p className="text-lg font-bold">
                  {isDemo ? '€1.6M' : `€${(flatDepts.reduce((s, d) => s + (d.budget || 0), 0) / 1000000).toFixed(1)}M`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organigrama */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Estructura Organizativa</CardTitle>
              <CardDescription>Departamentos, talleres y centros de trabajo</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Button size="sm" onClick={() => { setEditingDepartment(null); setShowDepartmentDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Departamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Cargando departamentos…</p>
              ) : (
                departments.map(dept => renderDepartment(dept))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Department Form Dialog */}
      <HRDepartmentFormDialog
        open={showDepartmentDialog}
        onOpenChange={handleDialogClose}
        companyId={companyId}
        parentDepartments={flatDepts.map(d => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}

// === Helpers ===

function buildTree(flat: Department[]): Department[] {
  const map = new Map<string, Department>();
  flat.forEach(d => map.set(d.id, { ...d, children: [] }));
  const roots: Department[] = [];
  map.forEach(d => {
    if (d.parent_id && map.has(d.parent_id)) {
      map.get(d.parent_id)!.children!.push(d);
    } else {
      roots.push(d);
    }
  });
  return roots;
}

function flattenTree(tree: Department[]): Department[] {
  const result: Department[] = [];
  const walk = (nodes: Department[]) => {
    nodes.forEach(n => { result.push(n); if (n.children) walk(n.children); });
  };
  walk(tree);
  return result;
}

// Demo fallback data
const DEMO_DEPARTMENTS: Department[] = [
  {
    id: 'demo-1', name: 'Dirección General', code: 'DIR', manager_name: 'Carlos Rodríguez',
    location: 'Sede Central', budget: 180000, parent_id: null,
    children: [
      { id: 'demo-1.1', name: 'Administración', code: 'ADM', manager_name: 'María García', location: 'Sede Central', budget: 280000, parent_id: 'demo-1' },
      { id: 'demo-1.2', name: 'Recursos Humanos', code: 'RRHH', manager_name: 'Ana López', location: 'Sede Central', budget: 95000, parent_id: 'demo-1' },
    ],
  },
  {
    id: 'demo-2', name: 'Producción', code: 'PROD', manager_name: 'Juan Martínez',
    location: 'Nave Industrial', budget: 450000, parent_id: null,
    children: [
      { id: 'demo-2.1', name: 'Taller Mecánico', code: 'TM', manager_name: 'Pedro Sánchez', location: 'Nave 1', budget: 180000, parent_id: 'demo-2' },
      { id: 'demo-2.2', name: 'Taller Electrónico', code: 'TE', manager_name: 'Luis García', location: 'Nave 2', budget: 150000, parent_id: 'demo-2' },
    ],
  },
  {
    id: 'demo-3', name: 'Comercial', code: 'COM', manager_name: 'Elena Fernández',
    location: 'Sede Central', budget: 320000, parent_id: null,
  },
  {
    id: 'demo-4', name: 'Tecnología', code: 'IT', manager_name: 'Miguel Torres',
    location: 'Sede Central', budget: 250000, parent_id: null,
  },
];

export default HRDepartmentsPanel;
