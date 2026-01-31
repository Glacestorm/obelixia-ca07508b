/**
 * HRKnowledgeUploader - Subida de documentación a base de conocimiento RRHH
 * Normativa laboral, convenios, PRL según CNAE
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  BookOpen, Upload, FileText, Plus, Search, Trash2,
  CheckCircle, ExternalLink, Download, RefreshCw, Sparkles,
  Shield, Building2, Users, Calendar, Scale
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRKnowledgeUploaderProps {
  companyId: string;
}

interface KnowledgeEntry {
  id: string;
  knowledge_type: string;
  title: string;
  content: string;
  source_url?: string;
  tags?: string[];
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export function HRKnowledgeUploader({ companyId }: HRKnowledgeUploaderProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    knowledge_type: 'regulation',
    title: '',
    content: '',
    source_url: '',
    tags: ''
  });

  // Demo entries
  const demoEntries: KnowledgeEntry[] = [
    {
      id: '1',
      knowledge_type: 'regulation',
      title: 'Estatuto de los Trabajadores - Art. 1-60',
      content: 'Real Decreto Legislativo 2/2015 por el que se aprueba el texto refundido del ET.',
      source_url: 'https://boe.es/buscar/act.php?id=BOE-A-2015-11430',
      tags: ['ET', 'legislación', 'contratación'],
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      knowledge_type: 'prl',
      title: 'Ley de Prevención de Riesgos Laborales',
      content: 'Ley 31/1995 de 8 de noviembre, de prevención de Riesgos Laborales.',
      source_url: 'https://boe.es/buscar/act.php?id=BOE-A-1995-24292',
      tags: ['PRL', 'seguridad', 'obligaciones'],
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      knowledge_type: 'collective_agreement',
      title: 'Convenio Colectivo del Metal - Madrid',
      content: 'Convenio colectivo del sector del metal para la Comunidad de Madrid.',
      source_url: 'https://bocm.es',
      tags: ['convenio', 'metal', 'Madrid'],
      is_active: true,
      is_verified: false,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      knowledge_type: 'guide',
      title: 'Guía de Contratación Laboral 2026',
      content: 'Guía práctica sobre tipos de contratos, requisitos y bonificaciones.',
      tags: ['contratos', 'guía', 'bonificaciones'],
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      knowledge_type: 'news',
      title: 'Reforma laboral 2026 - Resumen ejecutivo',
      content: 'Principales cambios de la última reforma laboral.',
      tags: ['reforma', 'actualidad'],
      is_active: true,
      is_verified: false,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
  ];

  useEffect(() => {
    // En producción, cargar desde erp_hr_knowledge_base
    setEntries(demoEntries);
    setIsLoading(false);
  }, []);

  const knowledgeTypes = [
    { value: 'regulation', label: 'Normativa legal', icon: Scale },
    { value: 'prl', label: 'Prevención de Riesgos', icon: Shield },
    { value: 'collective_agreement', label: 'Convenio Colectivo', icon: Building2 },
    { value: 'guide', label: 'Guía práctica', icon: BookOpen },
    { value: 'news', label: 'Noticia/Actualidad', icon: FileText },
    { value: 'internal', label: 'Documento interno', icon: Users },
  ];

  const getTypeBadge = (type: string) => {
    const typeInfo = knowledgeTypes.find(t => t.value === type);
    if (!typeInfo) return <Badge variant="outline">Otro</Badge>;
    
    const Icon = typeInfo.icon;
    return (
      <Badge variant="outline" className="gap-1">
        <Icon className="h-3 w-3" />
        {typeInfo.label}
      </Badge>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error('Título y contenido son obligatorios');
      return;
    }

    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const newEntry: KnowledgeEntry = {
        id: Date.now().toString(),
        knowledge_type: formData.knowledge_type,
        title: formData.title,
        content: formData.content,
        source_url: formData.source_url || undefined,
        tags: tags.length > 0 ? tags : undefined,
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      };

      // En producción, guardar en Supabase
      setEntries(prev => [newEntry, ...prev]);
      
      // Reset form
      setFormData({
        knowledge_type: 'regulation',
        title: '',
        content: '',
        source_url: '',
        tags: ''
      });
      
      setActiveTab('browse');
      toast.success('Documento añadido a la base de conocimiento');
    } catch (error) {
      console.error('Error adding knowledge:', error);
      toast.error('Error al añadir documento');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('Documento eliminado');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleAutoDownload = async () => {
    toast.info('Descargando normativa laboral actualizada...');
    
    // Simular descarga
    setTimeout(() => {
      const newEntries: KnowledgeEntry[] = [
        {
          id: Date.now().toString(),
          knowledge_type: 'regulation',
          title: 'SMI 2026 - Real Decreto',
          content: 'Real Decreto por el que se fija el salario mínimo interprofesional para 2026.',
          source_url: 'https://boe.es',
          tags: ['SMI', 'salarios', '2026'],
          is_active: true,
          is_verified: true,
          created_at: new Date().toISOString()
        }
      ];
      
      setEntries(prev => [...newEntries, ...prev]);
      toast.success('Normativa actualizada descargada');
    }, 2000);
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (categoryFilter === 'all') return matchesSearch;
    return matchesSearch && entry.knowledge_type === categoryFilter;
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="browse" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Explorar
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Subir documento
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm" onClick={handleAutoDownload}>
            <Download className="h-4 w-4 mr-1" />
            Descargar normativa
          </Button>
        </div>

        {/* Explorar base de conocimiento */}
        <TabsContent value="browse" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Base de Conocimiento RRHH</CardTitle>
                  <CardDescription>
                    Normativa laboral, convenios, PRL y documentación interna
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-[180px]"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {knowledgeTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Cargando base de conocimiento...</p>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay documentos que mostrar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                      <Card key={entry.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getTypeBadge(entry.knowledge_type)}
                                {entry.is_verified && (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Verificado
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-sm mb-1">{entry.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {entry.content}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(entry.created_at), { 
                                    addSuffix: true, 
                                    locale: es 
                                  })}
                                </span>
                                {entry.source_url && (
                                  <a 
                                    href={entry.source_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-primary"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Fuente
                                  </a>
                                )}
                              </div>
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-2 flex-wrap">
                                  {entry.tags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subir documento */}
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Añadir Documento
              </CardTitle>
              <CardDescription>
                Sube normativa, convenios o documentación relevante para el agente IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de documento</Label>
                    <Select 
                      value={formData.knowledge_type} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, knowledge_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {knowledgeTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>URL de fuente (opcional)</Label>
                    <Input
                      type="url"
                      placeholder="https://boe.es/..."
                      value={formData.source_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Nombre del documento o normativa"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contenido / Resumen *</Label>
                  <Textarea
                    placeholder="Contenido o resumen del documento..."
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Etiquetas (separadas por coma)</Label>
                  <Input
                    placeholder="PRL, seguridad, obligaciones..."
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('browse')}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir a conocimiento
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRKnowledgeUploader;
