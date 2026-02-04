/**
 * LegalEDiscoveryPanel
 * Fase 8: eDiscovery & Litigation Hold
 * Panel para búsqueda de documentos y preservación legal
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FileSearch,
  Lock,
  Users,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database
} from 'lucide-react';
import { useLegalEntityManagement } from '@/hooks/admin/legal/useLegalEntityManagement';
import { cn } from '@/lib/utils';

interface LegalEDiscoveryPanelProps {
  className?: string;
}

export function LegalEDiscoveryPanel({ className }: LegalEDiscoveryPanelProps) {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isLoading,
    eDiscovery,
    litigationHolds,
    searchEDiscovery,
    manageLitigationHolds,
  } = useLegalEntityManagement();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await searchEDiscovery({ 
      query: searchQuery,
      date_range: { start: '2023-01-01', end: new Date().toISOString() }
    });
  };

  const getPrivilegeColor = (status: string) => {
    switch (status) {
      case 'privileged': return 'bg-blue-500';
      case 'work_product': return 'bg-purple-500';
      case 'not_privileged': return 'bg-gray-500';
      case 'review_needed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={cn("transition-all duration-300", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-500/10 via-gray-500/10 to-zinc-500/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-gray-700">
            <FileSearch className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">eDiscovery & Litigation Hold</CardTitle>
            <p className="text-xs text-muted-foreground">
              Búsqueda de documentos y preservación legal
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="search" className="text-xs gap-1">
              <Search className="h-3 w-3" />
              Búsqueda
            </TabsTrigger>
            <TabsTrigger value="holds" className="text-xs gap-1">
              <Lock className="h-3 w-3" />
              Retenciones
            </TabsTrigger>
            <TabsTrigger value="custodians" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Custodios
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar en documentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                {eDiscovery ? (
                  <div className="space-y-4">
                    {/* Results Summary */}
                    <div className="grid grid-cols-4 gap-2">
                      <Card className="bg-muted/30">
                        <CardContent className="p-2 text-center">
                          <div className="text-lg font-bold">{eDiscovery.search_results?.total_documents || 0}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 dark:bg-green-950/20">
                        <CardContent className="p-2 text-center">
                          <div className="text-lg font-bold text-green-600">{eDiscovery.search_results?.relevant_documents || 0}</div>
                          <div className="text-xs text-muted-foreground">Relevantes</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 dark:bg-blue-950/20">
                        <CardContent className="p-2 text-center">
                          <div className="text-lg font-bold text-blue-600">{eDiscovery.search_results?.privileged_documents || 0}</div>
                          <div className="text-xs text-muted-foreground">Privilegiados</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 dark:bg-orange-950/20">
                        <CardContent className="p-2 text-center">
                          <div className="text-lg font-bold text-orange-600">{eDiscovery.search_results?.review_required || 0}</div>
                          <div className="text-xs text-muted-foreground">Revisión</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Documents List */}
                    <div className="space-y-2">
                      {eDiscovery.documents?.map((doc) => (
                        <Card key={doc.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                  <div className="font-medium text-sm">{doc.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {doc.author} • {doc.date} • {doc.type}
                                  </div>
                                  <p className="text-xs mt-1 line-clamp-2">{doc.summary}</p>
                                  <div className="flex gap-1 mt-2">
                                    {doc.key_terms_found?.slice(0, 3).map((term, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {term}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={getPrivilegeColor(doc.privilege_status)}>
                                  {doc.privilege_status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {doc.relevance_score}% relevante
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Review Workflow */}
                    {eDiscovery.review_workflow && (
                      <Card className="bg-muted/30">
                        <CardContent className="p-3">
                          <h4 className="text-sm font-medium mb-2">Flujo de Revisión</h4>
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div>
                              <div className="font-bold">{eDiscovery.review_workflow.first_pass_review}</div>
                              <div className="text-muted-foreground">1ª Revisión</div>
                            </div>
                            <div>
                              <div className="font-bold">{eDiscovery.review_workflow.second_pass_review}</div>
                              <div className="text-muted-foreground">2ª Revisión</div>
                            </div>
                            <div>
                              <div className="font-bold">{eDiscovery.review_workflow.final_review}</div>
                              <div className="text-muted-foreground">Final</div>
                            </div>
                            <div>
                              <div className="font-bold">{eDiscovery.review_workflow.estimated_hours}h</div>
                              <div className="text-muted-foreground">Estimado</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Search className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">Introduce términos de búsqueda</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Litigation Holds Tab */}
          <TabsContent value="holds">
            <ScrollArea className="h-[350px]">
              {litigationHolds ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="text-lg font-bold">{litigationHolds.active_holds?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Retenciones Activas</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 dark:bg-purple-950/20">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-purple-500" />
                          <div>
                            <div className="text-lg font-bold">
                              {litigationHolds.active_holds?.reduce((acc, h) => 
                                acc + (h.preserved_data?.total_size_gb || 0), 0
                              ).toFixed(1)} GB
                            </div>
                            <div className="text-xs text-muted-foreground">Datos Preservados</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Active Holds */}
                  <div className="space-y-2">
                    {litigationHolds.active_holds?.map((hold) => (
                      <Card key={hold.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{hold.matter_name}</span>
                            </div>
                            <Badge variant={hold.status === 'active' ? 'default' : 'secondary'}>
                              {hold.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{hold.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span>
                              {hold.custodians?.length || 0} custodios • 
                              {hold.preserved_data?.total_items || 0} elementos
                            </span>
                            <span className="text-muted-foreground">
                              Creado: {hold.created_date}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Risk Alerts */}
                  {litigationHolds.risk_alerts?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Alertas
                      </h4>
                      {litigationHolds.risk_alerts.map((alert, i) => (
                        <Card key={i} className="bg-orange-50 dark:bg-orange-950/20">
                          <CardContent className="p-2">
                            <div className="text-sm">{alert.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {alert.recommended_action}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Lock className="h-10 w-10 text-muted-foreground/50" />
                  <Button onClick={() => manageLitigationHolds({ company: 'Demo' })} disabled={isLoading}>
                    Cargar Litigation Holds
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Custodians Tab */}
          <TabsContent value="custodians">
            <ScrollArea className="h-[350px]">
              {eDiscovery?.custodians ? (
                <div className="space-y-2">
                  {eDiscovery.custodians.map((custodian, i) => (
                    <Card key={i} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{custodian.name}</div>
                              <div className="text-xs text-muted-foreground">{custodian.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{custodian.documents_held} docs</span>
                            <Badge variant={custodian.preservation_status === 'complete' ? 'default' : 'secondary'}>
                              {custodian.preservation_status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : litigationHolds?.active_holds?.[0]?.custodians ? (
                <div className="space-y-2">
                  {litigationHolds.active_holds[0].custodians.map((custodian, i) => (
                    <Card key={i} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{custodian.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {custodian.email} • {custodian.department}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {custodian.acknowledged ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-orange-500" />
                            )}
                            <Badge variant={
                              custodian.compliance_status === 'compliant' ? 'default' : 
                              custodian.compliance_status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {custodian.compliance_status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Realiza una búsqueda o carga litigation holds para ver custodios</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalEDiscoveryPanel;
