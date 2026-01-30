/**
 * Deal Rooms - Tendencia Disruptiva 2025-2026
 * Espacios colaborativos donde cliente y vendedor coeditan la propuesta
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  MessageSquare,
  FileText,
  Eye,
  Edit3,
  Clock,
  Lock,
  Unlock,
  Share2,
  Video,
  Phone,
  CheckCircle2,
  Circle,
  Plus,
  ExternalLink,
  Sparkles,
  Send,
  File,
  Image,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DealRoomMember {
  id: string;
  name: string;
  role: 'seller' | 'buyer' | 'stakeholder';
  company: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface DealRoomDocument {
  id: string;
  name: string;
  type: 'proposal' | 'contract' | 'presentation' | 'spec' | 'other';
  status: 'draft' | 'review' | 'approved' | 'signed';
  lastModified: Date;
  modifiedBy: string;
  comments: number;
}

interface DealRoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'action';
}

interface DealRoom {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  status: 'active' | 'pending' | 'closed';
  members: DealRoomMember[];
  documents: DealRoomDocument[];
  messages: DealRoomMessage[];
  createdAt: Date;
  lastActivity: Date;
  engagementScore: number;
}

export function DealRooms() {
  const [selectedRoom, setSelectedRoom] = useState<string>('room-1');
  const [messageInput, setMessageInput] = useState('');

  const [rooms] = useState<DealRoom[]>([
    {
      id: 'room-1',
      opportunityId: 'opp-1',
      opportunityTitle: 'Implementación ERP Enterprise - Acme Corp',
      status: 'active',
      engagementScore: 92,
      createdAt: new Date(Date.now() - 604800000),
      lastActivity: new Date(Date.now() - 300000),
      members: [
        { id: 'm1', name: 'María García', role: 'seller', company: 'Nuestra Empresa', isOnline: true },
        { id: 'm2', name: 'Juan Pérez', role: 'buyer', company: 'Acme Corp', isOnline: true },
        { id: 'm3', name: 'Ana Torres', role: 'stakeholder', company: 'Acme Corp', isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
        { id: 'm4', name: 'Carlos Ruiz', role: 'stakeholder', company: 'Acme Corp', isOnline: false, lastSeen: new Date(Date.now() - 7200000) },
      ],
      documents: [
        { id: 'd1', name: 'Propuesta Comercial v3.pdf', type: 'proposal', status: 'review', lastModified: new Date(Date.now() - 86400000), modifiedBy: 'María García', comments: 5 },
        { id: 'd2', name: 'Contrato Marco.docx', type: 'contract', status: 'draft', lastModified: new Date(Date.now() - 172800000), modifiedBy: 'Legal Team', comments: 2 },
        { id: 'd3', name: 'Especificaciones Técnicas.xlsx', type: 'spec', status: 'approved', lastModified: new Date(Date.now() - 259200000), modifiedBy: 'Juan Pérez', comments: 0 },
      ],
      messages: [
        { id: 'msg1', senderId: 'm1', senderName: 'María García', content: 'He actualizado la propuesta con los nuevos precios', timestamp: new Date(Date.now() - 3600000), type: 'text' },
        { id: 'msg2', senderId: 'm2', senderName: 'Juan Pérez', content: 'Perfecto, la revisaré con el equipo esta tarde', timestamp: new Date(Date.now() - 1800000), type: 'text' },
        { id: 'msg3', senderId: 'm3', senderName: 'Ana Torres', content: '¿Podemos agendar una llamada para revisar los detalles técnicos?', timestamp: new Date(Date.now() - 900000), type: 'text' },
      ],
    },
    {
      id: 'room-2',
      opportunityId: 'opp-2',
      opportunityTitle: 'Licencias SaaS - TechStart',
      status: 'active',
      engagementScore: 78,
      createdAt: new Date(Date.now() - 259200000),
      lastActivity: new Date(Date.now() - 7200000),
      members: [
        { id: 'm5', name: 'Carlos López', role: 'seller', company: 'Nuestra Empresa', isOnline: true },
        { id: 'm6', name: 'Pedro Sánchez', role: 'buyer', company: 'TechStart', isOnline: false },
      ],
      documents: [
        { id: 'd4', name: 'Propuesta SaaS.pdf', type: 'proposal', status: 'draft', lastModified: new Date(Date.now() - 86400000), modifiedBy: 'Carlos López', comments: 1 },
      ],
      messages: [
        { id: 'msg4', senderId: 'm5', senderName: 'Carlos López', content: 'Bienvenido al Deal Room!', timestamp: new Date(Date.now() - 86400000), type: 'text' },
      ],
    },
  ]);

  const currentRoom = rooms.find(r => r.id === selectedRoom);

  const getStatusColor = (status: DealRoomDocument['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'review': return 'bg-yellow-500';
      case 'signed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: DealRoomMember['role']) => {
    switch (role) {
      case 'seller': return 'bg-primary text-primary-foreground';
      case 'buyer': return 'bg-blue-500 text-white';
      default: return 'bg-muted';
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    toast.success('Mensaje enviado');
    setMessageInput('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Deal Rooms</h3>
          <Badge variant="outline">{rooms.length} activas</Badge>
        </div>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Nueva Sala
        </Button>
      </div>

      {/* Room Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room.id)}
            className={cn(
              "flex-shrink-0 p-3 rounded-lg border text-left transition-all min-w-[200px]",
              selectedRoom === room.id 
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/50"
            )}
          >
            <div className="text-sm font-medium truncate">{room.opportunityTitle.split(' - ')[0]}</div>
            <div className="text-xs text-muted-foreground">{room.members.length} participantes</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {room.engagementScore}% engagement
              </Badge>
              {room.members.some(m => m.isOnline) && (
                <span className="flex items-center gap-1 text-green-600 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  En línea
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {currentRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content - Documents & Chat */}
          <div className="lg:col-span-2 space-y-4">
            {/* Documents */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos Compartidos
                  </CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Subir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentRoom.documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{doc.name}</span>
                          <Badge className={cn("text-[10px] text-white", getStatusColor(doc.status))}>
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Modificado por {doc.modifiedBy} • {doc.comments} comentarios
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] mb-3">
                  <div className="space-y-3">
                    {currentRoom.messages.map((msg) => {
                      const member = currentRoom.members.find(m => m.id === msg.senderId);
                      const isSeller = member?.role === 'seller';
                      return (
                        <div 
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            isSeller && "flex-row-reverse"
                          )}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className={cn("text-xs", getRoleColor(member?.role || 'stakeholder'))}>
                              {msg.senderName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "max-w-[70%] p-2 rounded-lg",
                            isSeller 
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-muted rounded-tl-none"
                          )}>
                            <div className="text-xs font-medium mb-0.5">{msg.senderName}</div>
                            <div className="text-sm">{msg.content}</div>
                            <div className={cn(
                              "text-[10px] mt-1",
                              isSeller ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Escribe un mensaje..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Members & Actions */}
          <div className="space-y-4">
            {/* Members */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentRoom.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn("text-xs", getRoleColor(member.role))}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
                          member.isOnline ? "bg-green-500" : "bg-gray-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.company}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 gap-1">
                  <Plus className="h-3 w-3" />
                  Invitar
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Video className="h-4 w-4" />
                  Iniciar Videollamada
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Share2 className="h-4 w-4" />
                  Compartir Pantalla
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  <Link2 className="h-4 w-4" />
                  Copiar Link de Sala
                </Button>
              </CardContent>
            </Card>

            {/* Engagement Score */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Engagement Score</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{currentRoom.engagementScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                El cliente está muy activo en la sala. Momento ideal para avanzar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DealRooms;
