import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Puzzle, Search, Star, Download, ShieldCheck, Sparkles,
  Package, TrendingUp, DollarSign, RefreshCw, ExternalLink,
  ChevronRight, Filter, X, Plus, Send
} from 'lucide-react';
import { useMarketplaceExtensions, type MarketplaceExtension } from '@/hooks/admin/useMarketplaceExtensions';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface MarketplaceExtensionsPanelProps {
  installationId?: string;
  className?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  analytics: { label: 'Analytics', color: 'bg-blue-500/20 text-blue-400', icon: '📊' },
  ai: { label: 'IA', color: 'bg-purple-500/20 text-purple-400', icon: '🤖' },
  workflow: { label: 'Workflow', color: 'bg-green-500/20 text-green-400', icon: '⚙️' },
  security: { label: 'Seguridad', color: 'bg-red-500/20 text-red-400', icon: '🛡️' },
  integration: { label: 'Integración', color: 'bg-amber-500/20 text-amber-400', icon: '🔗' },
  utility: { label: 'Utilidad', color: 'bg-slate-500/20 text-slate-400', icon: '🔧' },
};

export function MarketplaceExtensionsPanel({ installationId, className }: MarketplaceExtensionsPanelProps) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');

  const {
    extensions,
    selectedExtension,
    reviews,
    stats,
    isLoading,
    fetchExtensions,
    fetchExtensionDetail,
    installExtension,
    purchaseExtension,
    submitReview,
    fetchStats,
    setSelectedExtension,
  } = useMarketplaceExtensions();

  const handleSearch = useCallback(() => {
    fetchExtensions({
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
    });
  }, [searchQuery, selectedCategory, fetchExtensions]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleOpenDetail = async (ext: MarketplaceExtension) => {
    setDetailOpen(true);
    await fetchExtensionDetail(ext.id);
  };

  const handleInstall = async (ext: MarketplaceExtension) => {
    if (ext.is_free) {
      await installExtension(ext.id, installationId);
    } else {
      await purchaseExtension(ext.id, installationId);
    }
    fetchExtensions();
  };

  const handleSubmitReview = async () => {
    if (!selectedExtension) return;
    await submitReview(selectedExtension.id, {
      rating: reviewRating,
      content: reviewContent,
    });
    setReviewContent('');
    fetchExtensionDetail(selectedExtension.id);
  };

  const featuredExtensions = extensions.filter(e => e.is_featured);
  const filteredExtensions = extensions;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Extensiones', value: stats?.total_extensions || extensions.length, icon: Puzzle, color: 'text-blue-400' },
          { label: 'Developers', value: stats?.total_developers || 0, icon: Package, color: 'text-green-400' },
          { label: 'Compras', value: stats?.total_purchases || 0, icon: Download, color: 'text-amber-400' },
          { label: 'Revenue Total', value: `${(stats?.total_revenue || 0).toFixed(0)}€`, icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Revenue Plat.', value: `${(stats?.platform_revenue || 0).toFixed(0)}€`, icon: DollarSign, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 flex items-center gap-2">
              <stat.icon className={cn("h-4 w-4", stat.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-3">
          <TabsTrigger value="catalog" className="text-xs gap-1"><Puzzle className="h-3 w-3" /> Catálogo</TabsTrigger>
          <TabsTrigger value="featured" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> Destacadas</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Revenue</TabsTrigger>
        </TabsList>

        {/* ==================== CATALOG TAB ==================== */}
        <TabsContent value="catalog" className="mt-0">
          {/* Search & Filters */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar extensiones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-800/50 border-slate-700 text-sm"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchExtensions()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedCategory(null)}
            >
              Todas
            </Button>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
              >
                {cfg.icon} {cfg.label}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[420px]">
            <div className="space-y-2">
              {filteredExtensions.map((ext) => (
                <ExtensionCard
                  key={ext.id}
                  extension={ext}
                  onDetail={() => handleOpenDetail(ext)}
                  onInstall={() => handleInstall(ext)}
                />
              ))}
              {filteredExtensions.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Puzzle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No se encontraron extensiones</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ==================== FEATURED TAB ==================== */}
        <TabsContent value="featured" className="mt-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-3">
              {featuredExtensions.map((ext) => (
                <Card key={ext.id} className="bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer" onClick={() => handleOpenDetail(ext)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-xl">
                        {CATEGORY_CONFIG[ext.category]?.icon || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{ext.extension_name}</h4>
                          {ext.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />}
                          <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Destacada</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ext.short_description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {ext.rating_average.toFixed(1)} ({ext.rating_count})
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {ext.download_count.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground/60">por {ext.author_name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-sm font-bold", ext.is_free ? 'text-green-400' : 'text-foreground')}>
                          {ext.is_free ? 'Gratis' : `${ext.price}€`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {featuredExtensions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay extensiones destacadas</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ==================== REVENUE TAB ==================== */}
        <TabsContent value="revenue" className="mt-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-4">
              {/* Revenue Split Explanation */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Revenue Sharing Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Developer Share</span>
                    <span className="text-sm font-bold text-green-400">70%</span>
                  </div>
                  <Progress value={70} className="h-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Platform Fee</span>
                    <span className="text-sm font-bold text-blue-400">30%</span>
                  </div>
                  <Progress value={30} className="h-2" />
                </CardContent>
              </Card>

              {/* Top Extensions by Revenue */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Extensiones por Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extensions
                      .filter(e => !e.is_free)
                      .sort((a, b) => (b.download_count * b.price) - (a.download_count * a.price))
                      .slice(0, 5)
                      .map((ext, i) => {
                        const estimatedRevenue = ext.download_count * ext.price;
                        return (
                          <div key={ext.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <div>
                                <p className="text-xs font-medium text-foreground">{ext.extension_name}</p>
                                <p className="text-[10px] text-muted-foreground">{ext.author_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-emerald-400">{estimatedRevenue.toFixed(0)}€</p>
                              <p className="text-[10px] text-muted-foreground">{ext.download_count} ventas</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribución por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const count = extensions.filter(e => e.category === key).length;
                      const percent = extensions.length > 0 ? (count / extensions.length) * 100 : 0;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm">{cfg.icon}</span>
                          <span className="text-xs text-muted-foreground w-20">{cfg.label}</span>
                          <Progress value={percent} className="flex-1 h-1.5" />
                          <span className="text-xs font-medium text-foreground w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* ==================== DETAIL DIALOG ==================== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedExtension && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                    {CATEGORY_CONFIG[selectedExtension.category]?.icon || '📦'}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      {selectedExtension.extension_name}
                      {selectedExtension.is_verified && <ShieldCheck className="h-4 w-4 text-blue-400" />}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      por {selectedExtension.author_name} • v{selectedExtension.version}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-lg font-bold", selectedExtension.is_free ? 'text-green-500' : 'text-foreground')}>
                      {selectedExtension.is_free ? 'Gratis' : `${selectedExtension.price}€`}
                    </p>
                    <Button size="sm" className="mt-1 gap-1" onClick={() => handleInstall(selectedExtension)}>
                      <Download className="h-3 w-3" />
                      {selectedExtension.is_free ? 'Instalar' : 'Comprar'}
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">{selectedExtension.short_description}</p>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {selectedExtension.rating_average.toFixed(1)} ({selectedExtension.rating_count} reseñas)
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {selectedExtension.download_count.toLocaleString()} descargas
                  </span>
                  <Badge className={CATEGORY_CONFIG[selectedExtension.category]?.color}>
                    {CATEGORY_CONFIG[selectedExtension.category]?.label}
                  </Badge>
                </div>

                {/* Tags */}
                {selectedExtension.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {selectedExtension.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Revenue Split */}
                {!selectedExtension.is_free && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-3">
                      <p className="text-xs font-medium mb-2">Revenue Split</p>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Developer</p>
                          <p className="text-sm font-bold text-green-500">{selectedExtension.revenue_share_percent}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Plataforma</p>
                          <p className="text-sm font-bold text-blue-500">{100 - selectedExtension.revenue_share_percent}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dev gana</p>
                          <p className="text-sm font-bold text-emerald-500">{(selectedExtension.price * selectedExtension.revenue_share_percent / 100).toFixed(2)}€</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Reviews */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Reseñas ({reviews.length})</h4>
                  {reviews.length > 0 ? (
                    <div className="space-y-2">
                      {reviews.slice(0, 5).map(review => (
                        <div key={review.id} className="p-2 rounded-lg bg-muted/20 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={cn("h-3 w-3", s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{review.user_name}</span>
                            {review.is_verified_purchase && (
                              <Badge variant="outline" className="text-[9px]">Compra verificada</Badge>
                            )}
                          </div>
                          {review.content && <p className="text-xs text-muted-foreground">{review.content}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin reseñas todavía</p>
                  )}

                  {/* Add Review */}
                  <div className="mt-3 p-3 rounded-lg bg-muted/10 border border-border/50">
                    <p className="text-xs font-medium mb-2">Escribe una reseña</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setReviewRating(s)}>
                          <Star className={cn("h-5 w-5 cursor-pointer transition-colors", s <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-400/50")} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="Tu opinión..."
                      className="text-xs min-h-[60px] mb-2"
                    />
                    <Button size="sm" onClick={handleSubmitReview} disabled={!reviewContent} className="gap-1">
                      <Send className="h-3 w-3" /> Publicar
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== EXTENSION CARD ====================
function ExtensionCard({
  extension,
  onDetail,
  onInstall,
}: {
  extension: MarketplaceExtension;
  onDetail: () => void;
  onInstall: () => void;
}) {
  const cfg = CATEGORY_CONFIG[extension.category] || CATEGORY_CONFIG.utility;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
      onClick={onDetail}
    >
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-lg flex-shrink-0">
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {extension.extension_name}
          </h4>
          {extension.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
          {extension.is_featured && <Sparkles className="h-3 w-3 text-amber-400 flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">{extension.short_description}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
            {extension.rating_average.toFixed(1)}
          </span>
          <span className="flex items-center gap-0.5">
            <Download className="h-2.5 w-2.5" />
            {extension.download_count.toLocaleString()}
          </span>
          <Badge className={cn("text-[9px] px-1 py-0", cfg.color)}>{cfg.label}</Badge>
          <span className="text-muted-foreground/50">{extension.author_name}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn("text-xs font-bold", extension.is_free ? 'text-green-400' : 'text-foreground')}>
          {extension.is_free ? 'Gratis' : `${extension.price}€`}
        </span>
        <Button
          size="sm"
          variant={extension.is_free ? "outline" : "default"}
          className="text-[10px] h-6 px-2 gap-1"
          onClick={(e) => { e.stopPropagation(); onInstall(); }}
        >
          <Download className="h-2.5 w-2.5" />
          {extension.is_free ? 'Instalar' : 'Comprar'}
        </Button>
      </div>
    </div>
  );
}

export default MarketplaceExtensionsPanel;
