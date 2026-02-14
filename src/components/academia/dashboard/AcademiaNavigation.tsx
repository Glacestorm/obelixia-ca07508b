/**
 * Academia Navigation - Modern Grouped Menu System
 */

import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3, BookOpen, Users, Award, MessageSquare, Bell, Brain,
  ChevronDown, LayoutDashboard, GraduationCap, Gamepad2, Trophy,
  Route, Sparkles, FileQuestion, Settings, TrendingUp, Menu, Play,
  Upload, Star, Target, UserCircle, ClipboardCheck, FileSpreadsheet,
  Film, Shield, Store, DollarSign, Filter, CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AcademiaNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface AcademiaNavCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: AcademiaNavItem[];
  defaultOpen?: boolean;
}

export const academiaNavCategories: AcademiaNavCategory[] = [
  {
    id: 'panel', label: 'Panel Principal', icon: <LayoutDashboard className="h-4 w-4" />, defaultOpen: true,
    items: [
      { id: 'resumen', label: 'Resumen Ejecutivo', shortLabel: 'Resumen', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'analytics', label: 'Analytics Avanzado', shortLabel: 'Analytics', icon: <TrendingUp className="h-4 w-4" />, badge: 'Pro' },
    ]
  },
  {
    id: 'cursos', label: 'Gestión de Cursos', icon: <BookOpen className="h-4 w-4" />,
    items: [
      { id: 'catalogo', label: 'Catálogo de Cursos', shortLabel: 'Catálogo', icon: <BookOpen className="h-4 w-4" /> },
      { id: 'gestion-cursos', label: 'Gestión de Cursos', shortLabel: 'Gestión', icon: <Settings className="h-4 w-4" /> },
      { id: 'contenido', label: 'Gestión de Contenido', shortLabel: 'Contenido', icon: <Upload className="h-4 w-4" /> },
      { id: 'instructor', label: 'Panel Instructor', shortLabel: 'Instructor', icon: <GraduationCap className="h-4 w-4" /> },
    ]
  },
  {
    id: 'alumnos', label: 'Estudiantes', icon: <Users className="h-4 w-4" />,
    items: [
      { id: 'perfil', label: 'Perfiles de Alumnos', shortLabel: 'Perfiles', icon: <Users className="h-4 w-4" /> },
      { id: 'progreso', label: 'Panel de Progreso', shortLabel: 'Progreso', icon: <Target className="h-4 w-4" /> },
      { id: 'notificaciones', label: 'Notificaciones', shortLabel: 'Notif.', icon: <Bell className="h-4 w-4" /> },
    ]
  },
  {
    id: 'estrategia', label: 'Estrategia y Nicho', icon: <Target className="h-4 w-4" />,
    items: [
      { id: 'nichos', label: 'Configuración de Nichos', shortLabel: 'Nichos', icon: <Target className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'avatar', label: 'Avatar del Alumno', shortLabel: 'Avatar', icon: <UserCircle className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'validacion', label: 'Validación Pre-Lanzamiento', shortLabel: 'Validar', icon: <ClipboardCheck className="h-4 w-4" />, badge: 'Nuevo' },
    ]
  },
  {
    id: 'estructura', label: 'Estructura y Recursos', icon: <FileSpreadsheet className="h-4 w-4" />,
    items: [
      { id: 'recursos', label: 'Gestor de Recursos', shortLabel: 'Recursos', icon: <FileSpreadsheet className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'capstone', label: 'Proyectos Capstone', shortLabel: 'Capstone', icon: <Award className="h-4 w-4" />, badge: 'Nuevo' },
    ]
  },
  {
    id: 'produccion', label: 'Producción y Legal', icon: <Film className="h-4 w-4" />,
    items: [
      { id: 'produccion-checklist', label: 'Checklist Producción', shortLabel: 'Producción', icon: <Film className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'legal', label: 'Compliance Legal', shortLabel: 'Legal', icon: <Shield className="h-4 w-4" />, badge: 'Nuevo' },
    ]
  },
  {
    id: 'negocio', label: 'Negocio y Ventas', icon: <Store className="h-4 w-4" />,
    items: [
      { id: 'modelo-negocio', label: 'Modelo de Negocio', shortLabel: 'Modelo', icon: <Store className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'pricing', label: 'Escalera de Precios', shortLabel: 'Pricing', icon: <DollarSign className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'cohortes', label: 'Gestor de Cohortes', shortLabel: 'Cohortes', icon: <Users className="h-4 w-4" />, badge: 'Nuevo' },
    ]
  },
  {
    id: 'marketing', label: 'Marketing y Funnel', icon: <Filter className="h-4 w-4" />,
    items: [
      { id: 'funnel', label: 'Funnel de Ventas', shortLabel: 'Funnel', icon: <Filter className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'kpis-ventas', label: 'KPIs de Ventas', shortLabel: 'KPIs', icon: <BarChart3 className="h-4 w-4" />, badge: 'Nuevo' },
      { id: 'best-practices', label: 'Mejores Prácticas', shortLabel: 'Prácticas', icon: <CheckSquare className="h-4 w-4" />, badge: 'Nuevo' },
    ]
  },
  {
    id: 'gamificacion', label: 'Gamificación', icon: <Gamepad2 className="h-4 w-4" />,
    items: [
      { id: 'gamification-dashboard', label: 'Dashboard Gamificación', shortLabel: 'Gamif.', icon: <Trophy className="h-4 w-4" /> },
      { id: 'logros', label: 'Sistema de Logros', shortLabel: 'Logros', icon: <Star className="h-4 w-4" /> },
      { id: 'desafios', label: 'Desafíos Semanales', shortLabel: 'Desafíos', icon: <Gamepad2 className="h-4 w-4" /> },
    ]
  },
  {
    id: 'certificados', label: 'Certificados', icon: <Award className="h-4 w-4" />,
    items: [
      { id: 'certificados', label: 'Gestión Certificados', shortLabel: 'Certificados', icon: <Award className="h-4 w-4" /> },
      { id: 'verificacion', label: 'Verificación', shortLabel: 'Verificar', icon: <Award className="h-4 w-4" /> },
    ]
  },
  {
    id: 'comunidad', label: 'Comunidad', icon: <MessageSquare className="h-4 w-4" />,
    items: [
      { id: 'comunidad', label: 'Foro y Comunidad', shortLabel: 'Comunidad', icon: <MessageSquare className="h-4 w-4" /> },
    ]
  },
  {
    id: 'ia', label: 'Inteligencia Artificial', icon: <Brain className="h-4 w-4" />,
    items: [
      { id: 'ai-recomendaciones', label: 'Recomendaciones IA', shortLabel: 'Recomend.', icon: <Sparkles className="h-4 w-4" />, badge: 'IA' },
      { id: 'ai-tutor', label: 'Asistente IA', shortLabel: 'Tutor IA', icon: <Brain className="h-4 w-4" />, badge: 'IA' },
      { id: 'quiz-adaptativo', label: 'Quizzes Adaptativos', shortLabel: 'Quiz IA', icon: <FileQuestion className="h-4 w-4" />, badge: 'IA' },
      { id: 'learning-path', label: 'Rutas de Aprendizaje', shortLabel: 'Rutas', icon: <Route className="h-4 w-4" />, badge: 'IA' },
    ]
  },
];

export const findAcademiaNavItem = (tabId: string): { category: AcademiaNavCategory; item: AcademiaNavItem } | null => {
  for (const category of academiaNavCategories) {
    const item = category.items.find(i => i.id === tabId);
    if (item) return { category, item };
  }
  return null;
};

interface AcademiaNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const AcademiaNavigationDesktop = memo(function AcademiaNavigationDesktop({ activeTab, onTabChange }: AcademiaNavigationProps) {
  return (
    <div className="hidden md:flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/50 backdrop-blur-sm overflow-x-auto">
      {academiaNavCategories.map((category) => {
        const isActiveCategory = category.items.some(item => item.id === activeTab);
        return (
          <DropdownMenu key={category.id}>
            <DropdownMenuTrigger asChild>
              <Button variant={isActiveCategory ? "default" : "ghost"} size="sm" className={cn("h-9 gap-1.5 text-xs font-medium transition-all shrink-0", isActiveCategory && "shadow-sm")}>
                {category.icon}
                <span className="hidden lg:inline">{category.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover/95 backdrop-blur-md border-border/50">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">{category.icon}{category.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {category.items.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => onTabChange(item.id)} className={cn("flex items-center justify-between cursor-pointer", activeTab === item.id && "bg-accent text-accent-foreground font-medium")}>
                  <span className="flex items-center gap-2">{item.icon}{item.label}</span>
                  {item.badge && <Badge variant={item.badgeVariant || 'secondary'} className="text-[10px] h-5 px-1.5">{item.badge}</Badge>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
});

export const AcademiaNavigationMobile = memo(function AcademiaNavigationMobile({ activeTab, onTabChange }: AcademiaNavigationProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(['panel']);
  const activeNavItem = findAcademiaNavItem(activeTab);
  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-12 bg-card border-border">
            <div className="flex items-center gap-2">{activeNavItem?.item.icon}<span className="font-medium">{activeNavItem?.item.label || 'Seleccionar'}</span></div>
            <div className="flex items-center gap-2">
              {activeNavItem?.item.badge && <Badge variant={activeNavItem.item.badgeVariant || 'secondary'} className="text-[10px]">{activeNavItem.item.badge}</Badge>}
              <Menu className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-popover/95 backdrop-blur-md" align="center">
          {academiaNavCategories.map((category, idx) => (
            <div key={category.id}>
              {idx > 0 && <DropdownMenuSeparator />}
              <Collapsible open={openCategories.includes(category.id)} onOpenChange={() => toggleCategory(category.id)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/50 rounded-md mx-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">{category.icon}{category.label}</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openCategories.includes(category.id) && "rotate-180")} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-2">
                    {category.items.map((item) => (
                      <DropdownMenuItem key={item.id} onClick={() => onTabChange(item.id)} className={cn("flex items-center justify-between cursor-pointer py-2.5", activeTab === item.id && "bg-accent text-accent-foreground font-medium")}>
                        <span className="flex items-center gap-2">{item.icon}{item.label}</span>
                        {item.badge && <Badge variant={item.badgeVariant || 'secondary'} className="text-[10px] h-5">{item.badge}</Badge>}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function AcademiaNavigation(props: AcademiaNavigationProps) {
  return (
    <>
      <AcademiaNavigationDesktop {...props} />
      <AcademiaNavigationMobile {...props} />
    </>
  );
}

export default AcademiaNavigation;
