/**
 * HRDocumentTemplatesPanel - Plantillas de documentos por jurisdicción
 * Biblioteca de contratos, finiquitos, anexos con generación IA
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  FileText, Plus, Search, Filter, Eye, Copy, Edit,
  Globe, FileSignature, Scale, Building2, Sparkles,
  RefreshCw, Loader2, Download, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { HRDocumentGeneratorDialog } from './HRDocumentGeneratorDialog';

interface HRDocumentTemplatesPanelProps {
  companyId: string;
}

interface DocumentTemplate {
  id: string;
  template_code: string;
  document_type: string;
  template_name: string;
  description?: string;
  jurisdiction: string;
  language_code: string;
  applicable_contract_types: string[];
  legal_references?: string;
  version: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface Jurisdiction {
  id: string;
  jurisdiction_code: string;
  jurisdiction_name: string;
  country_name: string;
  currency: string;
  vacation_days_default: number;
  vacation_type: string;
  probation_max_days: number;
  minimum_wage: number;
  minimum_wage_year: number;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  annex: 'Anexo',
  severance: 'Finiquito',
  termination: 'Carta de despido',
  warning: 'Amonestación',
  certificate: 'Certificado',
  letter: 'Carta',
  other: 'Otro'
};

const JURISDICTION_FLAGS: Record<string, string> = {
  ES: '🇪🇸',
  AD: '🇦🇩',
  PT: '🇵🇹',
  FR: '🇫🇷',
  UK: '🇬🇧',
  AE: '🇦🇪',
  US: '🇺🇸',
  GLOBAL: '🌍'
};

export function HRDocumentTemplatesPanel({ companyId }: HRDocumentTemplatesPanelProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both system and company templates
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_document_templates?or=(is_system.eq.true,company_id.eq.${companyId})&is_active=eq.true&select=*&order=jurisdiction,document_type,template_name`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch jurisdictions
  const fetchJurisdictions = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_hr_jurisdictions?is_active=eq.true&select=*&order=jurisdiction_name`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch jurisdictions');
      const data = await response.json();
      setJurisdictions(data || []);
    } catch (err) {
      console.error('Error fetching jurisdictions:', err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchJurisdictions();
  }, [fetchTemplates, fetchJurisdictions]);

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJurisdiction = selectedJurisdiction === 'all' || t.jurisdiction === selectedJurisdiction;
    const matchesType = selectedType === 'all' || t.document_type === selectedType;
    return matchesSearch && matchesJurisdiction && matchesType;
  });

  // Stats
  const stats = {
    totalTemplates: templates.length,
    systemTemplates: templates.filter(t => t.is_system).length,
    customTemplates: templates.filter(t => !t.is_system).length,
    jurisdictions: [...new Set(templates.map(t => t.jurisdiction))].length
  };

  const handleGenerateDocument = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowGenerator(true);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Plantillas</p>
                <p className="text-lg font-bold">{stats.totalTemplates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Oficiales</p>
                <p className="text-lg font-bold">{stats.systemTemplates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Personalizadas</p>
                <p className="text-lg font-bold">{stats.customTemplates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Jurisdicciones</p>
                <p className="text-lg font-bold">{stats.jurisdictions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Modelos Contractuales
                <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Multi-jurisdicción
                </Badge>
              </CardTitle>
              <CardDescription>
                Plantillas oficiales de contratos, finiquitos y documentos laborales
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { fetchTemplates(); fetchJurisdictions(); }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nueva plantilla
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="templates">Plantillas</TabsTrigger>
              <TabsTrigger value="jurisdictions">Jurisdicciones</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-0">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar plantillas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                  <SelectTrigger className="w-[180px]">
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Jurisdicción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {jurisdictions.map((j) => (
                      <SelectItem key={j.jurisdiction_code} value={j.jurisdiction_code}>
                        {JURISDICTION_FLAGS[j.jurisdiction_code]} {j.jurisdiction_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates table */}
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plantilla</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Jurisdicción</TableHead>
                        <TableHead>Contratos</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">{template.template_name}</span>
                              {template.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                  {template.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {DOCUMENT_TYPE_LABELS[template.document_type] || template.document_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-lg mr-1">{JURISDICTION_FLAGS[template.jurisdiction]}</span>
                            <span className="text-sm">{template.jurisdiction}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {template.applicable_contract_types?.slice(0, 2).map(type => (
                                <Badge key={type} variant="secondary" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                              {(template.applicable_contract_types?.length || 0) > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{template.applicable_contract_types!.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {template.is_system ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Oficial
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Personalizada
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Ver plantilla"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Generar documento"
                                onClick={() => handleGenerateDocument(template)}
                              >
                                <FileSignature className="h-4 w-4" />
                              </Button>
                              {!template.is_system && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Duplicar"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              {!loading && filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No se encontraron plantillas</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="jurisdictions" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jurisdictions.map((j) => (
                    <Card key={j.id} className="border-muted">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{JURISDICTION_FLAGS[j.jurisdiction_code]}</span>
                          <div className="flex-1">
                            <h4 className="font-medium">{j.jurisdiction_name}</h4>
                            <p className="text-sm text-muted-foreground">{j.country_name}</p>
                            
                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Vacaciones:</span>
                                <span className="ml-1 font-medium">
                                  {j.vacation_days_default} días ({j.vacation_type === 'natural_days' ? 'naturales' : 'laborales'})
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Prueba máx:</span>
                                <span className="ml-1 font-medium">{j.probation_max_days} días</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">SMI:</span>
                                <span className="ml-1 font-medium">
                                  {j.minimum_wage > 0 ? `${j.minimum_wage.toLocaleString()} ${j.currency}` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Año:</span>
                                <span className="ml-1 font-medium">{j.minimum_wage_year}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generator Dialog */}
      <HRDocumentGeneratorDialog
        open={showGenerator}
        onOpenChange={setShowGenerator}
        companyId={companyId}
        template={selectedTemplate}
        onSuccess={() => {
          setShowGenerator(false);
          toast.success('Documento generado correctamente');
        }}
      />
    </div>
  );
}

export default HRDocumentTemplatesPanel;
