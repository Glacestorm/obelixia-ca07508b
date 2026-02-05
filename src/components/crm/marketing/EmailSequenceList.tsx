/**
 * Email Sequence List Component - Marketing Automation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  Mail,
  Clock,
  Users,
  GitBranch,
  Zap
} from 'lucide-react';
import { useEmailSequences, EmailSequence } from '@/hooks/crm/marketing';
import { EmailSequenceFormDialog } from './EmailSequenceFormDialog';

interface EmailSequenceListProps {
  companyId?: string;
}

const triggerLabels: Record<string, string> = {
  form_submit: 'Formulario enviado',
  tag_added: 'Tag añadido',
  deal_stage: 'Etapa deal',
  contact_created: 'Contacto creado',
  manual: 'Manual',
  date_based: 'Fecha programada',
};

export function EmailSequenceList({ companyId }: EmailSequenceListProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  
  const { 
    sequences, 
    isLoading, 
    createSequence, 
    updateSequence, 
    deleteSequence,
    toggleActive
  } = useEmailSequences(companyId);

  const filteredSequences = sequences.filter(seq =>
    seq.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedSequence(null);
    setIsFormOpen(true);
  };

  const handleEdit = (sequence: EmailSequence) => {
    setSelectedSequence(sequence);
    setIsFormOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Secuencias de Email</CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Secuencia
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar secuencias..."
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
          ) : filteredSequences.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay secuencias creadas</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera secuencia
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Secuencia</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Pasos</TableHead>
                  <TableHead>Inscritos</TableHead>
                  <TableHead>Completados</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSequences.map((sequence, index) => (
                  <motion.tr
                    key={sequence.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{sequence.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {sequence.steps?.length || 0} emails
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Zap className="h-3 w-3" />
                        {triggerLabels[sequence.trigger_type] || sequence.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {sequence.steps?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {sequence.stats?.enrolled || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sequence.stats?.completed || 0}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={sequence.is_active}
                        onCheckedChange={() => toggleActive(sequence.id, !sequence.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sequence)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteSequence(sequence.id)}
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

      <EmailSequenceFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        sequence={selectedSequence}
        onSubmit={async (data) => {
          if (selectedSequence) {
            await updateSequence(selectedSequence.id, data);
          } else {
            await createSequence(data as Omit<EmailSequence, 'id' | 'created_at' | 'updated_at'>);
          }
          setIsFormOpen(false);
        }}
      />
    </>
  );
}

export default EmailSequenceList;
