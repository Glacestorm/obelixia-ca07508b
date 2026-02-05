/**
 * Audience Segment List Component - Marketing Automation
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
  Edit, 
  Trash2,
  Users,
  RefreshCw,
  Filter,
  Target
} from 'lucide-react';
import { useAudienceSegments, AudienceSegment } from '@/hooks/crm/marketing';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AudienceSegmentFormDialog } from './AudienceSegmentFormDialog';

interface AudienceSegmentListProps {
  companyId?: string;
}

export function AudienceSegmentList({ companyId }: AudienceSegmentListProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<AudienceSegment | null>(null);
  
  const { 
    segments, 
    isLoading, 
    createSegment, 
    updateSegment, 
    deleteSegment,
    calculateSegment
  } = useAudienceSegments(companyId);

  const filteredSegments = segments.filter(seg =>
    seg.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedSegment(null);
    setIsFormOpen(true);
  };

  const handleEdit = (segment: AudienceSegment) => {
    setSelectedSegment(segment);
    setIsFormOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Segmentos de Audiencia</CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Segmento
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar segmentos..."
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
          ) : filteredSegments.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay segmentos creados</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer segmento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Condiciones</TableHead>
                  <TableHead>Contactos</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSegments.map((segment, index) => (
                  <motion.tr
                    key={segment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/50">
                          <Users className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{segment.name}</div>
                          {segment.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {segment.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={segment.filter_type === 'dynamic' ? 'default' : 'secondary'}>
                        {segment.filter_type === 'dynamic' ? 'Dinámico' : 'Estático'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Filter className="h-3 w-3 text-muted-foreground" />
                        {segment.conditions?.length || 0} reglas
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {segment.contact_count?.toLocaleString() || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {segment.last_calculated_at 
                        ? format(new Date(segment.last_calculated_at), 'dd MMM HH:mm', { locale: es })
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
                          <DropdownMenuItem onClick={() => handleEdit(segment)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {segment.filter_type === 'dynamic' && (
                            <DropdownMenuItem onClick={() => calculateSegment(segment.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Recalcular
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteSegment(segment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AudienceSegmentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        segment={selectedSegment}
        onSubmit={async (data) => {
          if (selectedSegment) {
            await updateSegment(selectedSegment.id, data);
          } else {
            await createSegment(data as Omit<AudienceSegment, 'id' | 'created_at' | 'updated_at'>);
          }
          setIsFormOpen(false);
        }}
      />
    </>
  );
}

export default AudienceSegmentList;
