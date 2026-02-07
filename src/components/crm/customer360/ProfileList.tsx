// src/components/crm/customer360/ProfileList.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Filter, MoreVertical, Star, Sparkles } from 'lucide-react';
import { useCustomer360 } from '@/hooks/crm/customer360';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProfileList() {
  const { profiles, setSelectedProfileId } = useCustomer360();

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Directorio de Perfiles</CardTitle>
          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, email, empresa..." className="pl-8" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-2">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div 
                key={profile.id}
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => setSelectedProfileId(profile.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.display_name}`} />
                      <AvatarFallback>{profile.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{profile.display_name}</h4>
                        {profile.account_tier === 'gold' && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {profile.job_title && `${profile.job_title} at `}
                        <span className="font-medium text-primary/80">{profile.company_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <Badge variant={profile.lifecycle_stage === 'customer' ? 'default' : 'secondary'} className="text-[10px]">
                        {profile.lifecycle_stage}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Score: {profile.total_score}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Activo {profile.last_activity_at 
                        ? formatDistanceToNow(new Date(profile.last_activity_at), { locale: es, addSuffix: true })
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
                
                {/* AI Insights hint */}
                {profile.requires_enrichment && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-purple-500 bg-purple-500/10 px-2 py-1 rounded w-fit">
                    <Sparkles className="h-3 w-3" />
                    Enriquecimiento disponible
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
