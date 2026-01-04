/**
 * Selector de workspace para CRM multi-tenant
 */

import React from 'react';
import { Briefcase, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useCRMContext } from '@/hooks/crm/useCRMContext';
import { cn } from '@/lib/utils';

interface CRMWorkspaceSelectorProps {
  className?: string;
}

export function CRMWorkspaceSelector({ className }: CRMWorkspaceSelectorProps) {
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } = useCRMContext();

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={cn("gap-2", className)}>
        <Briefcase className="h-4 w-4" />
        Cargando...
      </Button>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Button variant="outline" disabled className={cn("gap-2", className)}>
        <Briefcase className="h-4 w-4" />
        Sin workspaces
      </Button>
    );
  }

  if (workspaces.length === 1) {
    return (
      <Button variant="outline" className={cn("gap-2 cursor-default", className)}>
        <Briefcase className="h-4 w-4" />
        {currentWorkspace?.name || 'Workspace'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Briefcase className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {currentWorkspace?.name || 'Seleccionar workspace'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel>Cambiar workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => setCurrentWorkspace(workspace)}
            className="gap-2 cursor-pointer"
          >
            <Briefcase className="h-4 w-4" />
            <span className="flex-1 truncate">{workspace.name}</span>
            {currentWorkspace?.id === workspace.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CRMWorkspaceSelector;
