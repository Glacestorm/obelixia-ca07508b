/**
 * GALIA EU Funding Alerts Component
 * Panel de monitorización de fondos europeos y nacionales
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Bell,
  Euro,
  Calendar,
  ExternalLink,
  Star,
  Filter,
  Sparkles,
  Globe,
  FileText,
  Building,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useGaliaEUFundingMonitor, FundingAlert } from '@/hooks/galia/useGaliaEUFundingMonitor';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function GaliaEUFundingAlerts() {
  const [searchKeywords, setSearchKeywords] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const {
    isScanning,
    isAnalyzing,
    alerts,
    sources,
    lastScan,
    scanSources,
    analyzeOpportunity,
    getHighPriorityAlerts,
    alertCount,
    highPriorityCount
  } = useGaliaEUFundingMonitor();

  useEffect(() => {
    // Initial scan on mount
    scanSources();
  }, []);

  const handleScan = () => {
    const keywords = searchKeywords.split(',').map(k => k.trim()).filter(Boolean);
    scanSources(keywords.length > 0 ? { keywords } : undefined);
  };

  const handleAnalyze = async (alert: FundingAlert) => {
    await analyzeOpportunity(alert.url);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'BOE': return <FileText className="h-4 w-4" />;
      case 'PRTR': return <Building className="h-4 w-4" />;
      case 'BDNS': return <Globe className="h-4 w-4" />;
      case 'EURLEX': return <Star className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'BOE': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'PRTR': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'BDNS': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'EURLEX': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const filteredAlerts = activeTab === 'high' 
    ? getHighPriorityAlerts() 
    : activeTab === 'all' 
      ? alerts 
      : alerts.filter(a => a.source === activeTab);

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/D';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Monitor de Fondos UE
          </h3>
          <p className="text-sm text-muted-foreground">
            Detecta automáticamente nuevas oportunidades de financiación
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastScan && (
            <span className="text-xs text-muted-foreground">
              Última actualización: {formatDistanceToNow(lastScan, { locale: es, addSuffix: true })}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleScan}
            disabled={isScanning}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isScanning && "animate-spin")} />
            Escanear
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Alertas</span>
            </div>
            <p className="text-2xl font-bold">{alertCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Alta Prioridad</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{highPriorityCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Fuentes</span>
            </div>
            <p className="text-2xl font-bold">{sources.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Relevancia Media</span>
            </div>
            <p className="text-2xl font-bold">
              {alerts.length > 0 
                ? Math.round(alerts.reduce((acc, a) => acc + a.relevance_score, 0) / alerts.length)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Palabras clave: LEADER, rural, digitalización..."
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleScan} disabled={isScanning}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader className="pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todas ({alertCount})</TabsTrigger>
              <TabsTrigger value="high">
                <Star className="h-3 w-3 mr-1" />
                Prioritarias ({highPriorityCount})
              </TabsTrigger>
              <TabsTrigger value="BOE">BOE</TabsTrigger>
              <TabsTrigger value="PRTR">PRTR</TabsTrigger>
              <TabsTrigger value="BDNS">BDNS</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Escaneando fuentes de financiación...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-8 w-8 mb-4 opacity-50" />
                <p>No hay alertas disponibles</p>
                <Button variant="link" onClick={handleScan} className="mt-2">
                  Escanear ahora
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert, index) => (
                  <Card key={index} className="border-l-4" style={{
                    borderLeftColor: alert.relevance_score >= 90 ? '#22c55e' : 
                                    alert.relevance_score >= 70 ? '#f59e0b' : '#94a3b8'
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={cn("text-xs", getSourceColor(alert.source))}>
                              {getSourceIcon(alert.source)}
                              <span className="ml-1">{alert.source}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Star className={cn("h-3 w-3 mr-1", getRelevanceColor(alert.relevance_score))} />
                              {alert.relevance_score}%
                            </Badge>
                            {alert.relevance_score >= 90 && (
                              <Badge className="bg-green-500 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Muy Relevante
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                            {alert.title}
                          </h4>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {alert.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-2 text-xs">
                            {alert.amount && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Euro className="h-3 w-3" />
                                {formatCurrency(alert.amount)}
                              </span>
                            )}
                            {alert.deadline && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Calendar className="h-3 w-3" />
                                {new Date(alert.deadline).toLocaleDateString('es-ES')}
                              </span>
                            )}
                            {alert.territory_scope && (
                              <Badge variant="secondary" className="text-xs">
                                {alert.territory_scope}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAnalyze(alert)}
                            disabled={isAnalyzing}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Analizar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(alert.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
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

      {/* Sources Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fuentes Monitorizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sources.map((source) => (
              <div 
                key={source.id}
                className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50"
              >
                {getSourceIcon(source.type)}
                <div className="text-xs">
                  <p className="font-medium">{source.name}</p>
                  <p className="text-muted-foreground truncate">{source.url}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GaliaEUFundingAlerts;
