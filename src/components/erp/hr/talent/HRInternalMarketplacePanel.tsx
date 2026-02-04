/**
 * HRInternalMarketplacePanel - Marketplace Interno de Oportunidades
 * Fase 2: Gestión del Talento Avanzada
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Briefcase,
  Users,
  GraduationCap,
  Lightbulb,
  Clock,
  MapPin,
  Star,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Heart,
  Share2,
  Bookmark,
  TrendingUp,
  Target,
  Calendar,
  Building2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Opportunity {
  id: string;
  type: 'project' | 'rotation' | 'mentoring' | 'committee' | 'stretch';
  title: string;
  description: string;
  department: string;
  duration: string;
  time_commitment: string;
  skills_required: string[];
  skills_developed: string[];
  posted_by: string;
  posted_date: string;
  applicants: number;
  spots: number;
  deadline: string;
  match_score?: number;
  is_bookmarked?: boolean;
}

// Mock Data
const mockOpportunities: Opportunity[] = [
  {
    id: 'opp_1',
    type: 'project',
    title: 'Proyecto de Transformación Digital - Fase 2',
    description: 'Liderar la implementación de nuevas herramientas de automatización en el área comercial.',
    department: 'Tecnología + Comercial',
    duration: '6 meses',
    time_commitment: '30%',
    skills_required: ['Project Management', 'Change Management', 'Digital Tools'],
    skills_developed: ['Strategic Planning', 'Cross-functional Leadership', 'Stakeholder Management'],
    posted_by: 'María García - CTO',
    posted_date: '2026-01-28',
    applicants: 8,
    spots: 2,
    deadline: '2026-02-15',
    match_score: 92,
    is_bookmarked: true
  },
  {
    id: 'opp_2',
    type: 'rotation',
    title: 'Rotación - Business Development LATAM',
    description: 'Oportunidad de rotación de 12 meses en el equipo de desarrollo de negocio para la región LATAM.',
    department: 'Business Development',
    duration: '12 meses',
    time_commitment: '100%',
    skills_required: ['Sales', 'Spanish', 'B2B'],
    skills_developed: ['International Business', 'Market Analysis', 'Cultural Intelligence'],
    posted_by: 'Carlos López - VP Sales',
    posted_date: '2026-01-25',
    applicants: 15,
    spots: 1,
    deadline: '2026-02-28',
    match_score: 78
  },
  {
    id: 'opp_3',
    type: 'mentoring',
    title: 'Programa de Mentoring - Future Leaders',
    description: 'Programa de mentoring de 6 meses con ejecutivos senior para desarrollar habilidades de liderazgo.',
    department: 'RRHH - Talent Development',
    duration: '6 meses',
    time_commitment: '5%',
    skills_required: ['High Potential', 'Leadership Interest'],
    skills_developed: ['Executive Presence', 'Strategic Thinking', 'Networking'],
    posted_by: 'Ana Martínez - CHRO',
    posted_date: '2026-01-20',
    applicants: 25,
    spots: 10,
    deadline: '2026-02-10',
    match_score: 95
  },
  {
    id: 'opp_4',
    type: 'committee',
    title: 'Comité de Innovación y Sostenibilidad',
    description: 'Participación en el comité estratégico que define las iniciativas de innovación y ESG de la compañía.',
    department: 'Estrategia',
    duration: 'Indefinido',
    time_commitment: '10%',
    skills_required: ['Innovation Mindset', 'ESG Knowledge'],
    skills_developed: ['Board Exposure', 'Strategic Decision Making', 'ESG'],
    posted_by: 'CEO Office',
    posted_date: '2026-01-15',
    applicants: 12,
    spots: 3,
    deadline: '2026-02-05',
    match_score: 85
  },
  {
    id: 'opp_5',
    type: 'stretch',
    title: 'Stretch Assignment - Lanzamiento Producto B2C',
    description: 'Liderar el go-to-market de un nuevo producto B2C. Exposición directa al comité ejecutivo.',
    department: 'Marketing + Producto',
    duration: '4 meses',
    time_commitment: '50%',
    skills_required: ['Marketing', 'Product Launch', 'Communication'],
    skills_developed: ['GTM Strategy', 'P&L Ownership', 'Executive Communication'],
    posted_by: 'VP Marketing',
    posted_date: '2026-01-30',
    applicants: 6,
    spots: 1,
    deadline: '2026-02-20',
    match_score: 88
  }
];

const opportunityTypeConfig = {
  project: { 
    icon: Briefcase, 
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    label: 'Proyecto'
  },
  rotation: { 
    icon: ArrowRight, 
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    label: 'Rotación'
  },
  mentoring: { 
    icon: Users, 
    color: 'bg-green-100 text-green-700 border-green-300',
    label: 'Mentoring'
  },
  committee: { 
    icon: Building2, 
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    label: 'Comité'
  },
  stretch: { 
    icon: TrendingUp, 
    color: 'bg-red-100 text-red-700 border-red-300',
    label: 'Stretch Assignment'
  }
};

export function HRInternalMarketplacePanel() {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('match');

  const filteredOpportunities = mockOpportunities
    .filter(opp => 
      (typeFilter === 'all' || opp.type === typeFilter) &&
      (opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
       opp.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'match') return (b.match_score || 0) - (a.match_score || 0);
      if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === 'recent') return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
      return 0;
    });

  const renderOpportunityCard = (opp: Opportunity) => {
    const TypeIcon = opportunityTypeConfig[opp.type].icon;
    const spotsRemaining = opp.spots - Math.floor(opp.applicants / 3);
    
    return (
      <Card 
        key={opp.id} 
        className={cn(
          "group hover:shadow-lg transition-all cursor-pointer",
          opp.match_score && opp.match_score >= 90 && "ring-2 ring-primary/30"
        )}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                opportunityTypeConfig[opp.type].color.split(' ')[0]
              )}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs mb-1", opportunityTypeConfig[opp.type].color)}
                >
                  {opportunityTypeConfig[opp.type].label}
                </Badge>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {opp.title}
                </h3>
              </div>
            </div>
            
            {opp.match_score && (
              <div className="flex flex-col items-end">
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-bold",
                  opp.match_score >= 90 ? "bg-green-100 text-green-700" :
                  opp.match_score >= 75 ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  {opp.match_score}% match
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {opp.description}
          </p>

          {/* Meta Info */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {opp.duration}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="h-3 w-3" />
              {opp.time_commitment} dedicación
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {opp.department}
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Requisitos:</p>
              <div className="flex flex-wrap gap-1">
                {opp.skills_required.slice(0, 3).map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {opp.skills_required.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{opp.skills_required.length - 3}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Desarrollarás:</p>
              <div className="flex flex-wrap gap-1">
                {opp.skills_developed.slice(0, 3).map((skill, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-green-50 text-green-700">
                    <TrendingUp className="h-2 w-2 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Progress & Actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {opp.applicants} aplicantes
              </span>
              <span className={cn(
                "font-medium",
                spotsRemaining <= 1 ? "text-red-600" : "text-green-600"
              )}>
                {spotsRemaining > 0 ? `${spotsRemaining} plaza${spotsRemaining > 1 ? 's' : ''} disponible${spotsRemaining > 1 ? 's' : ''}` : 'Completo'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
              >
                <Bookmark className={cn("h-4 w-4", opp.is_bookmarked && "fill-current text-amber-500")} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button size="sm">
                Aplicar
              </Button>
            </div>
          </div>

          {/* Deadline Warning */}
          {new Date(opp.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
            <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Cierra el {new Date(opp.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Marketplace de Oportunidades
          </h2>
          <p className="text-muted-foreground">
            Descubre proyectos, rotaciones y oportunidades de desarrollo interno
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Publicar Oportunidad
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(opportunityTypeConfig).map(([type, config]) => {
          const count = mockOpportunities.filter(o => o.type === type).length;
          const Icon = config.icon;
          return (
            <Card 
              key={type} 
              className={cn(
                "p-3 cursor-pointer hover:shadow-md transition-shadow",
                typeFilter === type && "ring-2 ring-primary"
              )}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", config.color.split(' ')[0])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Recomendadas
          </TabsTrigger>
          <TabsTrigger value="applied" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Mis Aplicaciones
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Guardadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar oportunidades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(opportunityTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Mejor match</SelectItem>
                <SelectItem value="deadline">Fecha límite</SelectItem>
                <SelectItem value="recent">Más recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <div className="grid md:grid-cols-2 gap-4">
            {filteredOpportunities.map(renderOpportunityCard)}
          </div>

          {filteredOpportunities.length === 0 && (
            <Card className="p-8 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">No se encontraron oportunidades</h3>
              <p className="text-sm text-muted-foreground">
                Intenta ajustar los filtros o buscar con otros términos
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommended" className="mt-6">
          <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Recomendaciones personalizadas</p>
                <p className="text-sm text-muted-foreground">
                  Basadas en tu perfil, competencias y objetivos de carrera
                </p>
              </div>
            </div>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-4">
            {mockOpportunities
              .filter(o => o.match_score && o.match_score >= 85)
              .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
              .map(renderOpportunityCard)}
          </div>
        </TabsContent>

        <TabsContent value="applied" className="mt-6">
          <Card className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">Sin aplicaciones activas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explora oportunidades y aplica a las que te interesen
            </p>
            <Button onClick={() => setActiveTab('browse')}>
              Explorar Oportunidades
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {mockOpportunities
              .filter(o => o.is_bookmarked)
              .map(renderOpportunityCard)}
          </div>
          
          {mockOpportunities.filter(o => o.is_bookmarked).length === 0 && (
            <Card className="p-8 text-center">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">No tienes oportunidades guardadas</h3>
              <p className="text-sm text-muted-foreground">
                Guarda oportunidades para revisarlas más tarde
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRInternalMarketplacePanel;
