/**
 * HRCredentialsPanel
 * Panel de gestión de credenciales digitales verificables
 * Fase 5: Credenciales Blockchain
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  QrCode,
  Link2,
  FileCheck,
  History,
  Sparkles,
  RefreshCw,
  Download,
  Share2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useHRCredentials, CredentialType, DigitalCredential } from '@/hooks/admin/hr/useHRCredentials';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const CREDENTIAL_TYPES: { value: CredentialType; label: string; icon: string }[] = [
  { value: 'employment', label: 'Certificado de Empleo', icon: '📋' },
  { value: 'training', label: 'Formación Completada', icon: '🎓' },
  { value: 'skills', label: 'Competencias Verificadas', icon: '⭐' },
  { value: 'compliance', label: 'Cumplimiento Normativo', icon: '✅' },
  { value: 'performance', label: 'Reconocimiento Desempeño', icon: '🏆' },
  { value: 'safety', label: 'Certificación PRL', icon: '🦺' },
];

export function HRCredentialsPanel() {
  const [activeTab, setActiveTab] = useState('credentials');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedType, setSelectedType] = useState<CredentialType>('employment');
  const [credentialData, setCredentialData] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [selectedCredential, setSelectedCredential] = useState<DigitalCredential | null>(null);

  const {
    isLoading,
    credentials,
    issuedCredential,
    verificationResult,
    selectiveProof,
    auditTrail,
    issueCredential,
    verifyCredential,
    revokeCredential,
    listCredentials,
    generateSelectiveProof,
    getAuditTrail,
  } = useHRCredentials();

  // Load credentials on employee select
  useEffect(() => {
    if (selectedEmployee) {
      listCredentials(selectedEmployee);
    }
  }, [selectedEmployee, listCredentials]);

  const handleIssueCredential = async () => {
    if (!selectedEmployee || !selectedType) return;
    
    let parsedData = {};
    try {
      parsedData = credentialData ? JSON.parse(credentialData) : {};
    } catch {
      parsedData = { description: credentialData };
    }

    await issueCredential(selectedType, selectedEmployee, parsedData);
  };

  const handleVerify = async () => {
    if (!verifyCode) return;
    await verifyCredential(verifyCode);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Activa</Badge>;
      case 'expired':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Expirada</Badge>;
      case 'revoked':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Revocada</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Credenciales Verificables</h2>
            <p className="text-sm text-muted-foreground">
              Sistema de credenciales digitales con registro blockchain
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Blockchain Ready
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="credentials" className="gap-1">
            <Award className="h-4 w-4" />
            Credenciales
          </TabsTrigger>
          <TabsTrigger value="issue" className="gap-1">
            <FileCheck className="h-4 w-4" />
            Emitir
          </TabsTrigger>
          <TabsTrigger value="verify" className="gap-1">
            <CheckCircle className="h-4 w-4" />
            Verificar
          </TabsTrigger>
          <TabsTrigger value="share" className="gap-1">
            <Share2 className="h-4 w-4" />
            Compartir
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1">
            <History className="h-4 w-4" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        {/* === CREDENTIALS LIST === */}
        <TabsContent value="credentials" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cartera de Credenciales</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="ID Empleado..."
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-40"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => listCredentials(selectedEmployee)}
                    disabled={isLoading || !selectedEmployee}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {credentials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mb-4 opacity-50" />
                    <p>No hay credenciales para mostrar</p>
                    <p className="text-sm">Introduce un ID de empleado para buscar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {credentials.map((cred) => (
                      <Card 
                        key={cred.id} 
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedCredential?.id === cred.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedCredential(cred)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="text-3xl">
                                {cred.badgeIcon || CREDENTIAL_TYPES.find(t => t.value === cred.type)?.icon || '📄'}
                              </div>
                              <div>
                                <h4 className="font-medium">{cred.title || cred.type}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Emitida: {format(new Date(cred.issuanceDate), 'dd MMM yyyy', { locale: es })}
                                </p>
                                {cred.expirationDate && (
                                  <p className="text-xs text-muted-foreground">
                                    Expira: {format(new Date(cred.expirationDate), 'dd MMM yyyy', { locale: es })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(cred.status)}
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
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

        {/* === ISSUE CREDENTIAL === */}
        <TabsContent value="issue" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Emitir Nueva Credencial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ID Empleado</Label>
                  <Input
                    placeholder="emp-12345..."
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Credencial</Label>
                  <Select value={selectedType} onValueChange={(v) => setSelectedType(v as CredentialType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREDENTIAL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Datos Adicionales (JSON o texto)</Label>
                  <Input
                    placeholder='{"curso": "Prevención de Riesgos", "horas": 60}'
                    value={credentialData}
                    onChange={(e) => setCredentialData(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={handleIssueCredential}
                  disabled={isLoading || !selectedEmployee}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Emitir y Registrar en Blockchain
                </Button>
              </CardContent>
            </Card>

            {issuedCredential && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    Credencial Emitida
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-background rounded-lg border">
                    <p className="text-sm font-medium mb-2">ID de Credencial:</p>
                    <code className="text-xs bg-muted p-2 rounded block break-all">
                      {issuedCredential.credential.id}
                    </code>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={issuedCredential.verificationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {issuedCredential.verificationUrl}
                    </a>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-2">Registro Blockchain:</p>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>Red: {issuedCredential.blockchain.network}</p>
                      <p className="truncate">TX: {issuedCredential.blockchain.txHash}</p>
                      <p>Bloque: #{issuedCredential.blockchain.blockNumber}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-1">
                      <QrCode className="h-4 w-4" />
                      Ver QR
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1">
                      <Download className="h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* === VERIFY CREDENTIAL === */}
        <TabsContent value="verify" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Verificar Credencial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ID o Código de Verificación</Label>
                  <Input
                    placeholder="cred-xxxx-xxxx o código QR..."
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={handleVerify}
                  disabled={isLoading || !verifyCode}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Verificar Autenticidad
                </Button>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">O escanea un código QR:</p>
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <QrCode className="h-4 w-4" />
                    Abrir Escáner
                  </Button>
                </div>
              </CardContent>
            </Card>

            {verificationResult && (
              <Card className={cn(
                "border-2",
                verificationResult.verified 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-red-500/30 bg-red-500/5"
              )}>
                <CardHeader>
                  <CardTitle className={cn(
                    "text-lg flex items-center gap-2",
                    verificationResult.verified ? "text-green-700" : "text-red-700"
                  )}>
                    {verificationResult.verified ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    {verificationResult.verified ? 'Credencial Válida' : 'Credencial No Válida'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {Object.entries(verificationResult.checks).map(([key, check]) => (
                      <div 
                        key={key}
                        className="flex items-center justify-between p-2 rounded bg-background"
                      >
                        <span className="text-sm capitalize">{key}</span>
                        <div className="flex items-center gap-2">
                          {check.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {check.details}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="text-sm space-y-1">
                    <p><strong>Tipo:</strong> {verificationResult.credential.type}</p>
                    <p><strong>Titular:</strong> {verificationResult.credential.subject}</p>
                    <p><strong>Emitida:</strong> {verificationResult.credential.issuedAt}</p>
                    {verificationResult.credential.expiresAt && (
                      <p><strong>Expira:</strong> {verificationResult.credential.expiresAt}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* === SELECTIVE DISCLOSURE === */}
        <TabsContent value="share" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Compartir con Revelación Selectiva
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-2">Zero-Knowledge Proofs</p>
                <p className="text-sm max-w-md mx-auto">
                  Selecciona una credencial y elige qué atributos revelar sin exponer toda la información.
                  Ideal para compartir certificaciones con terceros manteniendo la privacidad.
                </p>
                <div className="flex justify-center gap-4 mt-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-green-600" />
                    <span>Revelar</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <EyeOff className="h-4 w-4 text-amber-600" />
                    <span>Ocultar</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === AUDIT TRAIL === */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Auditoría Inmutable
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedCredential && getAuditTrail(selectedCredential.id)}
                  disabled={!selectedCredential || isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCredential ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona una credencial para ver su historial</p>
                </div>
              ) : auditTrail.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay eventos de auditoría</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {auditTrail.map((entry, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className={cn(
                          "p-2 rounded-full",
                          entry.action === 'issued' && "bg-green-100 text-green-600",
                          entry.action === 'verified' && "bg-blue-100 text-blue-600",
                          entry.action === 'shared' && "bg-purple-100 text-purple-600",
                          entry.action === 'revoked' && "bg-red-100 text-red-600"
                        )}>
                          {entry.action === 'issued' && <FileCheck className="h-4 w-4" />}
                          {entry.action === 'verified' && <CheckCircle className="h-4 w-4" />}
                          {entry.action === 'shared' && <Share2 className="h-4 w-4" />}
                          {entry.action === 'revoked' && <XCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium capitalize">{entry.action}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.timestamp), { 
                                addSuffix: true, 
                                locale: es 
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.details}</p>
                          {entry.txHash && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              TX: {entry.txHash}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRCredentialsPanel;
