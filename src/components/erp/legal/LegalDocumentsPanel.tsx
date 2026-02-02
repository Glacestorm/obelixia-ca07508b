/**
 * LegalDocumentsPanel - Generador de documentos legales con plantillas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Plus, 
  Download, 
  Eye,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalDocumentsPanelProps {
  companyId: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  jurisdiction: string;
  description: string;
  variables: string[];
  lastUpdated: string;
  version: string;
}

interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  generatedAt: string;
  status: 'draft' | 'review' | 'approved';
  jurisdiction: string;
}

export function LegalDocumentsPanel({ companyId }: LegalDocumentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: 'Contrato Laboral Indefinido',
      category: 'Laboral',
      jurisdiction: 'ES',
      description: 'Contrato de trabajo indefinido según normativa española',
      variables: ['nombre_empleado', 'puesto', 'salario', 'fecha_inicio'],
      lastUpdated: new Date().toISOString(),
      version: '2.1'
    },
    {
      id: '2',
      name: 'NDA - Acuerdo Confidencialidad',
      category: 'Mercantil',
      jurisdiction: 'EU',
      description: 'Acuerdo de confidencialidad bilateral',
      variables: ['parte_a', 'parte_b', 'duracion', 'ambito'],
      lastUpdated: new Date().toISOString(),
      version: '1.5'
    },
    {
      id: '3',
      name: 'Política de Privacidad GDPR',
      category: 'Protección Datos',
      jurisdiction: 'EU',
      description: 'Política de privacidad conforme a GDPR',
      variables: ['empresa', 'dpo_email', 'finalidades'],
      lastUpdated: new Date().toISOString(),
      version: '3.0'
    },
    {
      id: '4',
      name: 'Contrat de Treball Andorra',
      category: 'Laboral',
      jurisdiction: 'AD',
      description: 'Contracte laboral segons normativa andorrana',
      variables: ['nom_treballador', 'lloc', 'salari', 'data_inici'],
      lastUpdated: new Date().toISOString(),
      version: '1.2'
    },
    {
      id: '5',
      name: 'Contrato de Servicios',
      category: 'Mercantil',
      jurisdiction: 'ES',
      description: 'Contrato de prestación de servicios profesionales',
      variables: ['prestador', 'cliente', 'servicios', 'honorarios'],
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    }
  ]);

  const [generatedDocs] = useState<GeneratedDocument[]>([
    {
      id: '1',
      templateId: '1',
      templateName: 'Contrato Laboral Indefinido',
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: 'approved',
      jurisdiction: 'ES'
    },
    {
      id: '2',
      templateId: '2',
      templateName: 'NDA - Acuerdo Confidencialidad',
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: 'review',
      jurisdiction: 'EU'
    }
  ]);

  const categories = [...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleGenerate = async (template: Template) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'generate_document',
          context: {
            companyId,
            templateId: template.id,
            variables: {} // Would be filled from form
          }
        }
      });

      if (error) throw error;
      toast.success(`Documento "${template.name}" generado correctamente`);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar documento');
    } finally {
      setIsGenerating(false);
      setSelectedTemplate(null);
    }
  };

  const getStatusBadge = (status: GeneratedDocument['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'review':
        return <Badge className="bg-amber-600">En Revisión</Badge>;
      case 'approved':
        return <Badge className="bg-green-600">Aprobado</Badge>;
    }
  };

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = { 'AD': '🇦🇩', 'ES': '🇪🇸', 'EU': '🇪🇺', 'INT': '🌍' };
    return flags[code] || '🏳️';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Plantillas */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plantillas Documentales
          </h2>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid de plantillas */}
        <ScrollArea className="h-[500px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <Badge variant="outline">
                      {getJurisdictionFlag(template.jurisdiction)} {template.jurisdiction}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{template.category}</Badge>
                      <span>v{template.version}</span>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedTemplate(template)}>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Generar: {template.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Variables requeridas:
                          </p>
                          {template.variables.map((variable) => (
                            <div key={variable}>
                              <label className="text-sm font-medium block mb-1">
                                {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </label>
                              <Input placeholder={`Ingrese ${variable}`} />
                            </div>
                          ))}
                          <Button 
                            className="w-full" 
                            onClick={() => handleGenerate(template)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? 'Generando...' : 'Generar Documento'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Documentos generados */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Documentos Recientes
        </h3>
        <ScrollArea className="h-[540px]">
          <div className="space-y-3">
            {generatedDocs.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">{doc.templateName}</span>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>{getJurisdictionFlag(doc.jurisdiction)}</span>
                    <span>{new Date(doc.generatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default LegalDocumentsPanel;
