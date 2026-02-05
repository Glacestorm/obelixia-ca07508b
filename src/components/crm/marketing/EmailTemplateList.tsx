/**
 * Email Template List Component - Marketing Automation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Copy,
  Eye,
  FileText
} from 'lucide-react';
import { useEmailTemplates, EmailTemplate } from '@/hooks/crm/marketing';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EmailTemplateFormDialog } from './EmailTemplateFormDialog';

interface EmailTemplateListProps {
  companyId?: string;
}

const categoryColors: Record<string, string> = {
  marketing: 'bg-primary/10 text-primary border-primary/20',
  transactional: 'bg-accent/50 text-accent-foreground border-accent/20',
  newsletter: 'bg-secondary/50 text-secondary-foreground border-secondary/20',
  promotional: 'bg-destructive/10 text-destructive border-destructive/20',
  nurturing: 'bg-muted text-muted-foreground border-muted',
  notification: 'bg-muted text-muted-foreground border-muted',
};

export function EmailTemplateList({ companyId }: EmailTemplateListProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const { 
    templates, 
    isLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    duplicateTemplate
  } = useEmailTemplates(companyId);

  const filteredTemplates = templates.filter(tpl =>
    tpl.name.toLowerCase().includes(search.toLowerCase()) ||
    tpl.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Templates de Email</CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Template
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay templates creados</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Previsualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateTemplate(template.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h3 className="font-medium mb-1 line-clamp-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                        {template.subject || 'Sin asunto'}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        {template.category && (
                          <Badge 
                            variant="outline" 
                            className={categoryColors[template.category] || 'bg-muted'}
                          >
                            {template.category}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {template.variables?.length || 0} variables
                        </span>
                        <span>
                          {format(new Date(template.updated_at), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EmailTemplateFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        template={selectedTemplate}
        onSubmit={async (data) => {
          if (selectedTemplate) {
            await updateTemplate(selectedTemplate.id, data);
          } else {
            await createTemplate(data as Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>);
          }
          setIsFormOpen(false);
        }}
      />
    </>
  );
}

export default EmailTemplateList;
