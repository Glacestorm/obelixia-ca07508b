/**
 * Campaign List Component - Marketing Automation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  Mail,
  MessageSquare,
  Share2,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useMarketingCampaigns, MarketingCampaign } from '@/hooks/crm/marketing';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CampaignFormDialog } from './CampaignFormDialog';

interface CampaignListProps {
  companyId?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  scheduled: { label: 'Programada', variant: 'secondary' },
  active: { label: 'Activa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'secondary' },
  completed: { label: 'Completada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
  archived: { label: 'Archivada', variant: 'outline' },
};

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  multichannel: <Share2 className="h-4 w-4" />,
  social: <Share2 className="h-4 w-4" />,
  ads: <TrendingUp className="h-4 w-4" />,
};

export function CampaignList({ companyId }: CampaignListProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  
  const { 
    campaigns, 
    isLoading, 
    createCampaign, 
    updateCampaign, 
    deleteCampaign,
    changeStatus
  } = useMarketingCampaigns(companyId);

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedCampaign(null);
    setIsFormOpen(true);
  };

  const handleEdit = (campaign: MarketingCampaign) => {
    setSelectedCampaign(campaign);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (campaign: MarketingCampaign) => {
    if (campaign.status === 'active') {
      await changeStatus(campaign.id, 'paused');
    } else if (campaign.status === 'draft' || campaign.status === 'paused') {
      await changeStatus(campaign.id, 'active');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Campañas de Marketing</CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Campaña
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campañas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay campañas creadas</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera campaña
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign, index) => {
                  const sent = campaign.metrics?.sent || 0;
                  const opened = campaign.metrics?.opened || 0;
                  const clicked = campaign.metrics?.clicked || 0;
                  const openRate = sent > 0 ? (opened / sent) * 100 : 0;
                  const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
                  
                  return (
                    <motion.tr
                      key={campaign.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <TableCell>
                        <div className="font-medium">{campaign.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcons[campaign.type] || typeIcons.email}
                          <span className="capitalize">{campaign.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[campaign.status]?.variant || 'outline'}>
                          {statusConfig[campaign.status]?.label || campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          {sent.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {openRate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {clickRate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {campaign.start_date 
                          ? format(new Date(campaign.start_date), 'dd MMM yyyy', { locale: es })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            {(campaign.status === 'draft' || campaign.status === 'paused') && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                                <Play className="h-4 w-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pausar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CampaignFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        campaign={selectedCampaign}
        onSubmit={async (data) => {
          if (selectedCampaign) {
            await updateCampaign(selectedCampaign.id, data);
          } else {
            await createCampaign(data);
          }
          setIsFormOpen(false);
        }}
      />
    </>
  );
}

export default CampaignList;
