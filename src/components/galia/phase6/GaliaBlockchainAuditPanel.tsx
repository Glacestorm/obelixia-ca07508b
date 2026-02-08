/**
 * GaliaBlockchainAuditPanel - Blockchain Audit Trail UI
 * 
 * Immutable audit logging for FEDER/LEADER compliance.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Link,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Hash,
  Download,
  Eye,
  Loader2,
  Lock,
  Unlock,
  FileDigit,
  Fingerprint
} from 'lucide-react';
import { useGaliaBlockchainAudit, DecisionType } from '@/hooks/galia/useGaliaBlockchainAudit';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaBlockchainAuditPanelProps {
  expedienteId?: string;
  onDecisionRecorded?: (block: unknown) => void;
  className?: string;
}

export function GaliaBlockchainAuditPanel({
  expedienteId,
  onDecisionRecorded,
  className
}: GaliaBlockchainAuditPanelProps) {
  const [activeTab, setActiveTab] = useState('trail');
  const [searchExpediente, setSearchExpediente] = useState(expedienteId || '');

  const {
    isLoading,
    error,
    lastBlock,
    auditTrail,
    verificationStatus,
    recordDecision,
    verifyIntegrity,
    getAuditTrail,
    generateProof,
    anchorBatch,
    clearState
  } = useGaliaBlockchainAudit();

  const handleVerify = useCallback(async () => {
    await verifyIntegrity(searchExpediente || undefined);
  }, [verifyIntegrity, searchExpediente]);

  const handleGetTrail = useCallback(async () => {
    await getAuditTrail(searchExpediente || undefined);
  }, [getAuditTrail, searchExpediente]);

  const handleRecordDecision = useCallback(async (type: DecisionType) => {
    if (!expedienteId) return;
    
    const result = await recordDecision(expedienteId, type, {
      timestamp: new Date().toISOString(),
      reason: 'Decisión registrada desde panel de auditoría'
    });
    
    if (result?.block) {
      onDecisionRecorded?.(result.block);
    }
  }, [expedienteId, recordDecision, onDecisionRecorded]);

  const decisionTypes: { type: DecisionType; label: string; color: string }[] = [
    { type: 'aprobacion', label: 'Aprobación', color: 'bg-green-100 text-green-800' },
    { type: 'denegacion', label: 'Denegación', color: 'bg-red-100 text-red-800' },
    { type: 'subsanacion', label: 'Subsanación', color: 'bg-yellow-100 text-yellow-800' },
    { type: 'pago', label: 'Pago', color: 'bg-blue-100 text-blue-800' },
    { type: 'resolucion', label: 'Resolución', color: 'bg-purple-100 text-purple-800' }
  ];

  return (
    <Card className={cn("border-2 border-primary/20", className)}>
      <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Link className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Blockchain Audit
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  FEDER Compliant
                </Badge>
              </CardTitle>
              <CardDescription>
                Registro inmutable de decisiones críticas
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearState} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trail" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Pista
            </TabsTrigger>
            <TabsTrigger value="verify" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Verificar
            </TabsTrigger>
            <TabsTrigger value="record" className="text-xs">
              <FileDigit className="h-3 w-3 mr-1" />
              Registrar
            </TabsTrigger>
            <TabsTrigger value="proof" className="text-xs">
              <Fingerprint className="h-3 w-3 mr-1" />
              Pruebas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trail" className="mt-4 space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                value={searchExpediente}
                onChange={(e) => setSearchExpediente(e.target.value)}
                placeholder="Código expediente (opcional)"
                className="flex-1"
              />
              <Button onClick={handleGetTrail} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {/* Audit Trail */}
            <ScrollArea className="h-[300px]">
              {auditTrail ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-xs text-muted-foreground">
                      {auditTrail.auditTrail.totalEvents} eventos
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {auditTrail.auditTrail.period.from} - {auditTrail.auditTrail.period.to}
                    </span>
                  </div>

                  {auditTrail.auditTrail.events.map((event, idx) => (
                    <div 
                      key={event.id || idx}
                      className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                          {event.verified ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { 
                            locale: es, 
                            addSuffix: true 
                          })}
                        </span>
                      </div>
                      <p className="text-sm mb-1">{event.action}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{event.actor.name}</span>
                        <span>•</span>
                        <span>{event.actor.role}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="truncate">{event.blockHash.slice(0, 16)}...</span>
                      </div>
                    </div>
                  ))}

                  {auditTrail.summary.riskFlags.length > 0 && (
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Alertas de Riesgo</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside text-xs">
                          {auditTrail.summary.riskFlags.map((flag, i) => (
                            <li key={i}>{flag}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay pista de auditoría</p>
                  <p className="text-xs">Busca un expediente o visualiza todos</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="verify" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchExpediente}
                onChange={(e) => setSearchExpediente(e.target.value)}
                placeholder="Expediente o hash de bloque"
                className="flex-1"
              />
              <Button onClick={handleVerify} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Verificar
              </Button>
            </div>

            {verificationStatus && (
              <div className="space-y-4">
                <Alert variant={verificationStatus.verification.isValid ? "default" : "destructive"}>
                  {verificationStatus.verification.isValid ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {verificationStatus.verification.isValid 
                      ? 'Integridad Verificada' 
                      : 'Integridad Comprometida'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>Bloques verificados: {verificationStatus.verification.blocksVerified}</div>
                      <div>Algoritmo: {verificationStatus.verification.hashAlgorithm}</div>
                    </div>
                  </AlertDescription>
                </Alert>

                {verificationStatus.anomalies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Anomalías Detectadas</h4>
                    {verificationStatus.anomalies.map((anomaly, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "p-2 rounded text-xs",
                          anomaly.severity === 'critical' && "bg-red-50 border border-red-200",
                          anomaly.severity === 'warning' && "bg-yellow-50 border border-yellow-200",
                          anomaly.severity === 'info' && "bg-blue-50 border border-blue-200"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{anomaly.type}</Badge>
                          <span>Bloque #{anomaly.blockIndex}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{anomaly.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {verificationStatus.certificate && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Certificado de Verificación
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-1 font-mono">{verificationStatus.certificate.verificationId.slice(0, 12)}...</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Válido hasta:</span>
                        <span className="ml-1">{verificationStatus.certificate.validUntil}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="record" className="mt-4 space-y-4">
            {expedienteId ? (
              <>
                <Alert>
                  <FileDigit className="h-4 w-4" />
                  <AlertTitle>Registrar Decisión</AlertTitle>
                  <AlertDescription className="text-xs">
                    Las decisiones se registran de forma inmutable en la blockchain.
                    Una vez registradas, no pueden ser modificadas ni eliminadas.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2">
                  {decisionTypes.map(({ type, label, color }) => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => handleRecordDecision(type)}
                      disabled={isLoading}
                      className={cn("justify-start", color)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>

                {lastBlock && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Bloque Registrado
                    </h4>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono text-green-700">{lastBlock.hash.slice(0, 32)}...</span>
                      </div>
                      <div>Índice: #{lastBlock.index}</div>
                      <div>Timestamp: {lastBlock.timestamp}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona un expediente</p>
                <p className="text-xs">Para registrar decisiones necesitas un expediente activo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="proof" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => lastBlock && generateProof(expedienteId || '', lastBlock.hash)}
                disabled={isLoading || !lastBlock}
                className="h-auto py-4 flex-col"
              >
                <Fingerprint className="h-6 w-6 mb-2" />
                <span className="text-xs">Generar Prueba Merkle</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => anchorBatch(
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                  new Date().toISOString()
                )}
                disabled={isLoading}
                className="h-auto py-4 flex-col"
              >
                <Link className="h-6 w-6 mb-2" />
                <span className="text-xs">Anclar en Blockchain</span>
              </Button>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Información del Sistema</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Algoritmo Hash:</span>
                  <span className="font-mono">SHA-256</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Red Blockchain:</span>
                  <span>Polygon (Testnet)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conformidad:</span>
                  <span>FEDER / LEADER</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retención:</span>
                  <span>10 años</span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Exportar para Auditoría FEDER
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaBlockchainAuditPanel;
