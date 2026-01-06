/**
 * CRM Workspace Selector
 * Equivalente a ERPCompanySelector
 */

import React from 'react';
import { useCRMContext } from '@/hooks/crm/useCRMContext';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Loader2,
  Plus,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRMWorkspaceSelectorProps {
  className?: string;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

export function CRMWorkspaceSelector({ 
  className,
  showCreateButton = false,
  onCreateClick
}: CRMWorkspaceSelectorProps) {
  const { 
    workspaces, 
    currentWorkspace, 
    setCurrentWorkspace, 
    isLoading 
  } = useCRMContext();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Cargando...
      </Button>
    );
  }

  // Sin workspaces
  if (workspaces.length === 0) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onCreateClick}
        className={className}
      >
        <Plus className="h-4 w-4 mr-2" />
        Crear Workspace
      </Button>
    );
  }

  // Solo un workspace
  if (workspaces.length === 1 && !showCreateButton) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted", className)}>
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium truncate max-w-[150px]">
          {currentWorkspace?.name || workspaces[0].name}
        </span>
      </div>
    );
  }

  // Múltiples workspaces - dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Users className="h-4 w-4 text-primary" />
          <span className="truncate max-w-[150px]">
            {currentWorkspace?.name || 'Seleccionar'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => setCurrentWorkspace(workspace)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{workspace.name}</span>
            {currentWorkspace?.id === workspace.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        {showCreateButton && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateClick} className="text-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Workspace
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CRMWorkspaceSelector;
