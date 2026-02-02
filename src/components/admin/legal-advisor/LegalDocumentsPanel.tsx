/**
 * LegalDocumentsPanel - Panel de gestión de plantillas y documentos legales
 * Generación de documentos con IA y gestión de templates
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Copy,
  Sparkles,
  FolderOpen,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLegalDocuments, type LegalTemplate, type GeneratedDocument } from '@/hooks/admin/legal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function LegalDocumentsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('templates');

  const {
    isLoading,
    templates,
    generatedDocs,
    fetchTemplates,
    generateDocument
  } = useLegalDocuments();

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.template_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocuments = generatedDocs.filter(d =>
    d.template_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerate = useCallback(async (template: LegalTemplate) => {
    await generateDocument(template.template_type, {
      generated_date: new Date().toISOString(),
      template_version: template.version
    }, template.jurisdiction_code);
  }, [generateDocument]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      contract: 'bg-blue-500/10 text-blue-500',
      complaint: 'bg-red-500/10 text-red-500',
      response: 'bg-amber-500/10 text-amber-500',
      motion: 'bg-purple-500/10 text-purple-500',
      agreement: 'bg-emerald-500/10 text-emerald-500',
      policy: 'bg-cyan-500/10 text-cyan-500',
      notice: 'bg-orange-500/10 text-orange-500',
      letter: 'bg-pink-500/10 text-pink-500',
      memo: 'bg-indigo-500/10 text-indigo-500',
      report: 'bg-slate-500/10 text-slate-500'
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar plantillas o documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Plantillas ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="generated" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Generados ({generatedDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <Badge className={cn("text-xs mt-1", getCategoryColor(template.template_type))}>
                          {template.template_type}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      v{template.version}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {template.jurisdiction_code}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {template.legal_area}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <span>{template.variables.length} variables</span>
                    <span className="mx-2">•</span>
                    <span>{formatDistanceToNow(new Date(template.created_at), { addSuffix: true, locale: es })}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleGenerate(template)}
                      disabled={isLoading}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredTemplates.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No se encontraron plantillas</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="generated" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Documentos Generados</CardTitle>
                <CardDescription>Historial de documentos creados</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchTemplates()}>
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.template_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.status.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(doc.generated_at), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">No hay documentos generados</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalDocumentsPanel;
