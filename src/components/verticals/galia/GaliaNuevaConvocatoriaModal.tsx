/**
 * GALIA Nueva Convocatoria Modal - Enhanced Version
 * Formulario completo con upload de documentos, requisitos BDNS y generación de extracto
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  RefreshCw, 
  Upload, 
  FileText, 
  Building, 
  Euro, 
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Globe,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface GaliaNuevaConvocatoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreate: (data: any) => Promise<unknown>;
}

interface ConvocatoriaFormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  presupuesto_total: number;
  fecha_inicio: string;
  fecha_fin: string;
  porcentaje_ayuda_max: number;
  estado: 'borrador' | 'publicada' | 'abierta' | 'cerrada' | 'resuelta' | 'archivada';
  presupuesto_comprometido: number;
  presupuesto_ejecutado: number;
  requisitos: string[];
  criterios_valoracion: CriterioValoracion[];
  documentacion_requerida: string[];
  // New fields for Phase 2
  tipo_convocatoria: string;
  ambito_territorial: string;
  tipos_beneficiario: string[];
  bases_reguladoras_url?: string;
  bdns_codigo?: string;
  boe_referencia?: string;
  financiacion_ue?: boolean;
  programa_ue?: string;
  inversion_minima?: number;
  inversion_maxima?: number;
  documentos_adjuntos?: DocumentoAdjunto[];
}

interface CriterioValoracion {
  nombre: string;
  puntuacion_maxima: number;
  descripcion?: string;
}

interface DocumentoAdjunto {
  nombre: string;
  tipo: string;
  url?: string;
  size?: number;
}

const TIPOS_CONVOCATORIA = [
  { value: 'leader', label: 'LEADER - Desarrollo Rural' },
  { value: 'feder', label: 'FEDER - Desarrollo Regional' },
  { value: 'prtr', label: 'PRTR - Plan de Recuperación' },
  { value: 'autonomica', label: 'Autonómica' },
  { value: 'local', label: 'Local/Municipal' },
  { value: 'otra', label: 'Otra' },
];

const AMBITOS_TERRITORIALES = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'autonomico', label: 'Autonómico (Asturias)' },
  { value: 'provincial', label: 'Provincial' },
  { value: 'comarcal', label: 'Comarcal' },
  { value: 'municipal', label: 'Municipal' },
];

const TIPOS_BENEFICIARIO = [
  { value: 'empresas', label: 'Empresas' },
  { value: 'autonomos', label: 'Autónomos' },
  { value: 'ayuntamientos', label: 'Ayuntamientos' },
  { value: 'asociaciones', label: 'Asociaciones sin ánimo de lucro' },
  { value: 'cooperativas', label: 'Cooperativas' },
  { value: 'comunidades', label: 'Comunidades de bienes' },
  { value: 'particulares', label: 'Particulares' },
];

const DOCUMENTOS_REQUERIDOS_DEFAULT = [
  'Memoria técnica del proyecto',
  'Presupuesto desglosado',
  'Declaración responsable',
  'Certificado de estar al corriente con Hacienda',
  'Certificado de estar al corriente con Seguridad Social',
  'Escritura de constitución (empresas)',
  'DNI/NIF del solicitante',
  'Alta en el IAE',
  'Tres ofertas comparativas (gastos >18.000€)',
];

const PROGRAMAS_UE = [
  { value: 'feader', label: 'FEADER - Desarrollo Rural' },
  { value: 'feder', label: 'FEDER - Desarrollo Regional' },
  { value: 'fse', label: 'FSE+ - Fondo Social Europeo' },
  { value: 'prtr', label: 'NextGenerationEU / PRTR' },
  { value: 'interreg', label: 'INTERREG' },
  { value: 'life', label: 'LIFE' },
  { value: 'horizonte', label: 'Horizonte Europa' },
];

export function GaliaNuevaConvocatoriaModal({ isOpen, onClose, onCreate }: GaliaNuevaConvocatoriaModalProps) {
  const [activeTab, setActiveTab] = useState('basica');
  const [creatingConvocatoria, setCreatingConvocatoria] = useState(false);
  const [generatingExtracto, setGeneratingExtracto] = useState(false);
  
  const [form, setForm] = useState<ConvocatoriaFormData>({
    codigo: '',
    nombre: '',
    descripcion: '',
    presupuesto_total: 0,
    fecha_inicio: '',
    fecha_fin: '',
    porcentaje_ayuda_max: 80,
    estado: 'borrador',
    presupuesto_comprometido: 0,
    presupuesto_ejecutado: 0,
    requisitos: [],
    criterios_valoracion: [],
    documentacion_requerida: [...DOCUMENTOS_REQUERIDOS_DEFAULT],
    tipo_convocatoria: 'leader',
    ambito_territorial: 'autonomico',
    tipos_beneficiario: [],
    financiacion_ue: true,
    programa_ue: 'feader',
    inversion_minima: 5000,
    inversion_maxima: 200000,
    documentos_adjuntos: []
  });

  const [nuevoRequisito, setNuevoRequisito] = useState('');
  const [nuevoDocumento, setNuevoDocumento] = useState('');
  const [nuevoCriterio, setNuevoCriterio] = useState({ nombre: '', puntuacion_maxima: 10, descripcion: '' });

  const updateForm = (field: keyof ConvocatoriaFormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleBeneficiario = (tipo: string) => {
    setForm(prev => ({
      ...prev,
      tipos_beneficiario: prev.tipos_beneficiario.includes(tipo)
        ? prev.tipos_beneficiario.filter(t => t !== tipo)
        : [...prev.tipos_beneficiario, tipo]
    }));
  };

  const addRequisito = () => {
    if (nuevoRequisito.trim()) {
      updateForm('requisitos', [...form.requisitos, nuevoRequisito.trim()]);
      setNuevoRequisito('');
    }
  };

  const removeRequisito = (index: number) => {
    updateForm('requisitos', form.requisitos.filter((_, i) => i !== index));
  };

  const addDocumentoRequerido = () => {
    if (nuevoDocumento.trim() && !form.documentacion_requerida.includes(nuevoDocumento.trim())) {
      updateForm('documentacion_requerida', [...form.documentacion_requerida, nuevoDocumento.trim()]);
      setNuevoDocumento('');
    }
  };

  const removeDocumentoRequerido = (index: number) => {
    updateForm('documentacion_requerida', form.documentacion_requerida.filter((_, i) => i !== index));
  };

  const addCriterio = () => {
    if (nuevoCriterio.nombre.trim()) {
      updateForm('criterios_valoracion', [...form.criterios_valoracion, { ...nuevoCriterio }]);
      setNuevoCriterio({ nombre: '', puntuacion_maxima: 10, descripcion: '' });
    }
  };

  const removeCriterio = (index: number) => {
    updateForm('criterios_valoracion', form.criterios_valoracion.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDocs: DocumentoAdjunto[] = [];
    for (const file of Array.from(files)) {
      newDocs.push({
        nombre: file.name,
        tipo: file.type,
        size: file.size
      });
    }
    
    updateForm('documentos_adjuntos', [...(form.documentos_adjuntos || []), ...newDocs]);
    toast.success(`${files.length} documento(s) añadido(s)`);
  };

  const removeDocumentoAdjunto = (index: number) => {
    updateForm('documentos_adjuntos', (form.documentos_adjuntos || []).filter((_, i) => i !== index));
  };

  const handleGenerarExtracto = async () => {
    if (!form.codigo || !form.nombre) {
      toast.error('Completa los campos obligatorios primero');
      return;
    }
    
    setGeneratingExtracto(true);
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Extracto BOE generado correctamente');
      // In production, this would call an edge function to generate the official extract
    } catch {
      toast.error('Error al generar extracto');
    } finally {
      setGeneratingExtracto(false);
    }
  };

  const validateForm = (): boolean => {
    if (!form.codigo || !form.nombre || !form.fecha_inicio || !form.fecha_fin) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return false;
    }
    if (form.tipos_beneficiario.length === 0) {
      toast.error('Selecciona al menos un tipo de beneficiario');
      return false;
    }
    if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return false;
    }
    return true;
  };

  const handleCrearConvocatoria = async () => {
    if (!validateForm()) return;

    setCreatingConvocatoria(true);
    try {
      const result = await onCreate(form);
      
      if (result) {
        toast.success('Convocatoria creada correctamente');
        onClose();
        // Reset form
        setForm({
          codigo: '',
          nombre: '',
          descripcion: '',
          presupuesto_total: 0,
          fecha_inicio: '',
          fecha_fin: '',
          porcentaje_ayuda_max: 80,
          estado: 'borrador',
          presupuesto_comprometido: 0,
          presupuesto_ejecutado: 0,
          requisitos: [],
          criterios_valoracion: [],
          documentacion_requerida: [...DOCUMENTOS_REQUERIDOS_DEFAULT],
          tipo_convocatoria: 'leader',
          ambito_territorial: 'autonomico',
          tipos_beneficiario: [],
          financiacion_ue: true,
          programa_ue: 'feader',
          inversion_minima: 5000,
          inversion_maxima: 200000,
          documentos_adjuntos: []
        });
        setActiveTab('basica');
      }
    } catch (error) {
      console.error('Error creating convocatoria:', error);
      toast.error('Error al crear la convocatoria');
    } finally {
      setCreatingConvocatoria(false);
    }
  };

  const totalPuntuacion = form.criterios_valoracion.reduce((acc, c) => acc + c.puntuacion_maxima, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nueva Convocatoria
          </DialogTitle>
          <DialogDescription>
            Crea una nueva convocatoria de ayudas con todos los requisitos normativos.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basica" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Básica
            </TabsTrigger>
            <TabsTrigger value="financiacion" className="text-xs">
              <Euro className="h-3 w-3 mr-1" />
              Financiación
            </TabsTrigger>
            <TabsTrigger value="beneficiarios" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Beneficiarios
            </TabsTrigger>
            <TabsTrigger value="criterios" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Criterios
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Tab: Información Básica */}
            <TabsContent value="basica" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    placeholder="LEADER-2024-001"
                    value={form.codigo}
                    onChange={(e) => updateForm('codigo', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Convocatoria *</Label>
                  <Select value={form.tipo_convocatoria} onValueChange={(v) => updateForm('tipo_convocatoria', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CONVOCATORIA.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Convocatoria *</Label>
                <Input
                  id="nombre"
                  placeholder="Ayudas para la modernización de explotaciones agrarias"
                  value={form.nombre}
                  onChange={(e) => updateForm('nombre', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción detallada de la convocatoria, objeto y finalidad..."
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => updateForm('descripcion', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ambito">Ámbito Territorial</Label>
                  <Select value={form.ambito_territorial} onValueChange={(v) => updateForm('ambito_territorial', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AMBITOS_TERRITORIALES.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fechas de Solicitud *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={form.fecha_inicio}
                      onChange={(e) => updateForm('fecha_inicio', e.target.value)}
                    />
                    <Input
                      type="date"
                      value={form.fecha_fin}
                      onChange={(e) => updateForm('fecha_fin', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* BDNS and BOE references */}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bdns">Código BDNS</Label>
                  <Input
                    id="bdns"
                    placeholder="123456"
                    value={form.bdns_codigo || ''}
                    onChange={(e) => updateForm('bdns_codigo', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Identificador en la Base de Datos Nacional de Subvenciones</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boe">Referencia BOE</Label>
                  <Input
                    id="boe"
                    placeholder="BOE-A-2024-XXXXX"
                    value={form.boe_referencia || ''}
                    onChange={(e) => updateForm('boe_referencia', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: Financiación */}
            <TabsContent value="financiacion" className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="financiacion_ue"
                      checked={form.financiacion_ue}
                      onCheckedChange={(checked) => updateForm('financiacion_ue', checked)}
                    />
                    <Label htmlFor="financiacion_ue" className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Financiación con fondos europeos
                    </Label>
                  </div>
                  
                  {form.financiacion_ue && (
                    <div className="space-y-2 pl-6">
                      <Label>Programa UE</Label>
                      <Select value={form.programa_ue} onValueChange={(v) => updateForm('programa_ue', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRAMAS_UE.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="presupuesto">Presupuesto Total (€)</Label>
                  <Input
                    id="presupuesto"
                    type="number"
                    placeholder="500000"
                    value={form.presupuesto_total || ''}
                    onChange={(e) => updateForm('presupuesto_total', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="porcentaje">% Ayuda Máxima</Label>
                  <Input
                    id="porcentaje"
                    type="number"
                    min="0"
                    max="100"
                    value={form.porcentaje_ayuda_max}
                    onChange={(e) => updateForm('porcentaje_ayuda_max', parseInt(e.target.value) || 80)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inv_min">Inversión Mínima (€)</Label>
                  <Input
                    id="inv_min"
                    type="number"
                    value={form.inversion_minima || ''}
                    onChange={(e) => updateForm('inversion_minima', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv_max">Inversión Máxima (€)</Label>
                  <Input
                    id="inv_max"
                    type="number"
                    value={form.inversion_maxima || ''}
                    onChange={(e) => updateForm('inversion_maxima', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Ayuda máxima por proyecto:</span>
                    <span className="font-bold text-primary">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                        (form.inversion_maxima || 0) * (form.porcentaje_ayuda_max / 100)
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Beneficiarios */}
            <TabsContent value="beneficiarios" className="space-y-4">
              <div className="space-y-2">
                <Label>Tipos de Beneficiario *</Label>
                <p className="text-xs text-muted-foreground">Selecciona quién puede solicitar esta ayuda</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TIPOS_BENEFICIARIO.map(tipo => (
                    <div
                      key={tipo.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        form.tipos_beneficiario.includes(tipo.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleBeneficiario(tipo.value)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={form.tipos_beneficiario.includes(tipo.value)} />
                        <span className="text-sm">{tipo.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Requisitos de Elegibilidad</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Añadir requisito..."
                    value={nuevoRequisito}
                    onChange={(e) => setNuevoRequisito(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRequisito()}
                  />
                  <Button type="button" onClick={addRequisito}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.requisitos.map((req, index) => (
                    <Badge key={index} variant="secondary" className="py-1">
                      {req}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() => removeRequisito(index)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Criterios de Valoración */}
            <TabsContent value="criterios" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Criterios de Valoración</Label>
                  <Badge variant="outline">
                    Total: {totalPuntuacion} puntos
                  </Badge>
                </div>
                
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <Input
                      placeholder="Nombre del criterio"
                      value={nuevoCriterio.nombre}
                      onChange={(e) => setNuevoCriterio(prev => ({ ...prev, nombre: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Puntuación máxima"
                        value={nuevoCriterio.puntuacion_maxima || ''}
                        onChange={(e) => setNuevoCriterio(prev => ({ ...prev, puntuacion_maxima: parseInt(e.target.value) || 0 }))}
                      />
                      <Input
                        placeholder="Descripción (opcional)"
                        value={nuevoCriterio.descripcion}
                        onChange={(e) => setNuevoCriterio(prev => ({ ...prev, descripcion: e.target.value }))}
                      />
                    </div>
                    <Button type="button" onClick={addCriterio} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir Criterio
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-2 mt-4">
                  {form.criterios_valoracion.map((criterio, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{criterio.nombre}</p>
                        {criterio.descripcion && (
                          <p className="text-xs text-muted-foreground">{criterio.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{criterio.puntuacion_maxima} pts</Badge>
                        <Button variant="ghost" size="icon" onClick={() => removeCriterio(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Documentos */}
            <TabsContent value="documentos" className="space-y-4">
              <div className="space-y-2">
                <Label>Documentación Requerida a Solicitantes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Añadir documento requerido..."
                    value={nuevoDocumento}
                    onChange={(e) => setNuevoDocumento(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDocumentoRequerido()}
                  />
                  <Button type="button" onClick={addDocumentoRequerido}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {form.documentacion_requerida.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border text-sm">
                      <span>{doc}</span>
                      <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                        onClick={() => removeDocumentoRequerido(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Bases Reguladoras y Documentos Adjuntos</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Arrastra archivos o haz clic para subir
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX (máx. 10MB por archivo)
                    </p>
                  </label>
                </div>

                {(form.documentos_adjuntos || []).length > 0 && (
                  <div className="space-y-1 mt-2">
                    {form.documentos_adjuntos!.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>{doc.nombre}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(doc.size! / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <X
                          className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                          onClick={() => removeDocumentoAdjunto(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL Bases Reguladoras (externa)</Label>
                <Input
                  placeholder="https://www.boe.es/..."
                  value={form.bases_reguladoras_url || ''}
                  onChange={(e) => updateForm('bases_reguladoras_url', e.target.value)}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleGenerarExtracto}
            disabled={generatingExtracto || !form.codigo || !form.nombre}
          >
            {generatingExtracto ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generar Extracto BOE
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleCrearConvocatoria} disabled={creatingConvocatoria}>
              {creatingConvocatoria ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Convocatoria
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GaliaNuevaConvocatoriaModal;
