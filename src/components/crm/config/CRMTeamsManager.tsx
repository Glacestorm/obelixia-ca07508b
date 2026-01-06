/**
 * CRM Teams Manager
 * Gestión de equipos dentro de un workspace
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  UserPlus,
  Crown,
  Loader2
} from 'lucide-react';
import { useCRMTeams } from '@/hooks/crm/useCRMTeams';
import { useCRMContext } from '@/hooks/crm/useCRMContext';
import { CRMTeam, CreateTeamForm } from '@/types/crm';
import { cn } from '@/lib/utils';

const TEAM_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
];

export function CRMTeamsManager() {
  const { currentWorkspace, hasPermission } = useCRMContext();
  const { teams, isLoading, createTeam, updateTeam, deleteTeam } = useCRMTeams();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<CRMTeam | null>(null);
  const [formData, setFormData] = useState<CreateTeamForm>({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
  });

  const canManage = hasPermission('teams.manage');

  const resetForm = () => {
    setFormData({ name: '', description: '', color: TEAM_COLORS[0] });
    setEditingTeam(null);
  };

  const handleOpenDialog = (team?: CRMTeam) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        description: team.description || '',
        color: team.color || TEAM_COLORS[0],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingTeam) {
      await updateTeam(editingTeam.id, formData);
    } else {
      await createTeam(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (teamId: string) => {
    await deleteTeam(teamId);
  };

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona un workspace para gestionar equipos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipos
          </CardTitle>
          <CardDescription>
            Gestiona los equipos de trabajo del CRM
          </CardDescription>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Equipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTeam ? 'Editar Equipo' : 'Crear Equipo'}
                </DialogTitle>
                <DialogDescription>
                  {editingTeam 
                    ? 'Modifica la información del equipo'
                    : 'Define un nuevo equipo de trabajo'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Ventas Enterprise"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del equipo..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TEAM_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          formData.color === color 
                            ? "ring-2 ring-offset-2 ring-primary scale-110" 
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
                  {editingTeam ? 'Guardar' : 'Crear'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay equipos creados</p>
            {canManage && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear primer equipo
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: team.color || TEAM_COLORS[0] }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-medium">{team.name}</h4>
                      {team.description && (
                        <p className="text-sm text-muted-foreground">{team.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {team.members?.length || 0}
                    </Badge>
                    {canManage && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenDialog(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción desactivará el equipo "{team.name}". 
                                Los miembros no serán afectados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(team.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default CRMTeamsManager;
