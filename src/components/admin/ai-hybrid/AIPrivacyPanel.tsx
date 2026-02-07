/**
 * AI Privacy Panel
 * Gestión de reglas de privacidad y clasificación de datos
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  FileSearch,
  Fingerprint,
  Server,
  Cloud,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { 
  useDataPrivacyGateway, 
  DataClassification, 
  ClassificationRule,
  ClassificationResult,
} from '@/hooks/admin/ai-hybrid';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIPrivacyPanelProps {
  className?: string;
}

const CLASSIFICATION_COLORS: Record<DataClassification, string> = {
  public: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  internal: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  confidential: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  restricted: 'bg-destructive/10 text-destructive border-destructive/30',
};

const CLASSIFICATION_ICONS: Record<DataClassification, React.ReactNode> = {
  public: <Eye className="h-4 w-4" />,
  internal: <Shield className="h-4 w-4" />,
  confidential: <EyeOff className="h-4 w-4" />,
  restricted: <Lock className="h-4 w-4" />,
};

export function AIPrivacyPanel({ className }: AIPrivacyPanelProps) {
  const {
    rules,
    isLoading,
    lastClassification,
    fetchRules,
    classifyData,
    sanitizeForExternal,
  } = useDataPrivacyGateway();

  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<ClassificationResult | null>(null);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [anonymizedPreview, setAnonymizedPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const handleTestClassification = async () => {
    if (!testInput.trim()) {
      toast.error('Ingresa texto para clasificar');
      return;
    }

    try {
      // Parse input as JSON or create simple object
      let dataToClassify: Record<string, unknown>;
      try {
        dataToClassify = JSON.parse(testInput);
      } catch {
        dataToClassify = { content: testInput };
      }

      // Use the built-in classification
      const result = classifyData(dataToClassify);
      setTestResult(result);

      // Get anonymized version
      const anon = sanitizeForExternal(dataToClassify, { anonymize: true });
      setAnonymizedPreview(JSON.stringify(anon.anonymizedData, null, 2));
    } catch (error) {
      toast.error('Error al clasificar datos');
    }
  };

  const groupedRules = rules.reduce((acc, rule) => {
    const category = rule.data_category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {} as Record<string, ClassificationRule[]>);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gateway de Privacidad
          </h3>
          <p className="text-sm text-muted-foreground">
            Clasificación y protección automática de datos sensibles
          </p>
        </div>
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FileSearch className="h-4 w-4" />
              Probar Clasificación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Probar Clasificación de Datos</DialogTitle>
              <DialogDescription>
                Ingresa texto o JSON para ver cómo se clasifica y anonimiza
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Texto de prueba (texto plano o JSON)</Label>
                <Textarea
                  placeholder='{"nif": "12345678A", "email": "test@ejemplo.com", "iban": "ES12 1234..."}'
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={handleTestClassification} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Analizar
              </Button>

              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Classification Result */}
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Clasificación Final</span>
                      <Badge className={cn('gap-1', CLASSIFICATION_COLORS[testResult.level])}>
                        {CLASSIFICATION_ICONS[testResult.level]}
                        {testResult.level.toUpperCase()}
                      </Badge>
                    </div>

                    {testResult.matchedRules.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Reglas aplicadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {testResult.matchedRules.map((rule, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {rule}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {testResult.sensitiveFields.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">Campos sensibles:</p>
                        <div className="flex flex-wrap gap-2">
                          {testResult.sensitiveFields.map((field, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Routing Recommendation */}
                  <div className="p-4 rounded-lg border">
                    <h4 className="text-sm font-medium mb-2">Enrutamiento Recomendado</h4>
                    <div className="flex items-center gap-3">
                      {testResult.level === 'restricted' || 
                       testResult.level === 'confidential' ? (
                        <>
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Server className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Solo IA Local</p>
                            <p className="text-xs text-muted-foreground">
                              Datos sensibles - no enviar a la nube
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Cloud className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">IA Híbrida Permitida</p>
                            <p className="text-xs text-muted-foreground">
                              Puede usar proveedores en la nube
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Anonymized Preview */}
                  {anonymizedPreview && (
                    <div className="p-4 rounded-lg border bg-muted/50">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Fingerprint className="h-4 w-4" />
                        Vista Anonimizada
                      </h4>
                      <pre className="text-xs font-mono bg-background p-2 rounded border overflow-auto max-h-32">
                        {anonymizedPreview}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Classification Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Niveles de Clasificación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(['public', 'internal', 'confidential', 'restricted'] as DataClassification[]).map(level => (
              <div
                key={level}
                className={cn(
                  'p-3 rounded-lg border flex items-center gap-3',
                  CLASSIFICATION_COLORS[level]
                )}
              >
                <div className="p-2 rounded-lg bg-background">
                  {CLASSIFICATION_ICONS[level]}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{level}</p>
                  <p className="text-xs opacity-80">
                    {level === 'public' && 'Información pública'}
                    {level === 'internal' && 'Uso interno'}
                    {level === 'confidential' && 'Datos confidenciales'}
                    {level === 'restricted' && 'Máxima protección'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Reglas de Clasificación
              </CardTitle>
              <CardDescription>
                {rules.length} reglas activas para detección de datos sensibles
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => fetchRules()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedRules).map(([category, categoryRules]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryRules.map((rule) => (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            CLASSIFICATION_COLORS[rule.classification_level]
                          )}>
                            {CLASSIFICATION_ICONS[rule.classification_level]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{rule.rule_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {rule.data_category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={cn('text-xs', CLASSIFICATION_COLORS[rule.classification_level])}
                          >
                            {rule.classification_level}
                          </Badge>
                          {rule.is_active ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Privacy Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Server className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-muted-foreground">Datos locales protegidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Reglas activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Fingerprint className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Auto</p>
                <p className="text-sm text-muted-foreground">Anonimización activa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AIPrivacyPanel;
