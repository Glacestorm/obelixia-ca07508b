/**
 * CourseCatalog - Catálogo dinámico de cursos de ObelixIA Academia
 * Carga cursos publicados desde la base de datos
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Grid3X3, List, Star, Clock, Users,
  BookOpen, ArrowRight, GraduationCap, Play, X, SlidersHorizontal,
  ChevronDown, Award, TrendingUp, Sparkles, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { AIRecommendationsPanel } from '@/components/academia/AIRecommendationsPanel';
import { supabase } from '@/integrations/supabase/client';

interface DBCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category: string;
  level: string;
  price: number | null;
  is_free: boolean | null;
  is_featured: boolean | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  duration_hours: number | null;
  total_lessons: number | null;
  total_students: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  tags: string[] | null;
}

const CourseCatalog: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popular');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch courses from DB
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('academia_courses')
          .select('id, title, slug, description, short_description, category, level, price, is_free, is_featured, thumbnail_url, instructor_name, duration_hours, total_lessons, total_students, average_rating, total_reviews, tags')
          .eq('is_published', true)
          .order('is_featured', { ascending: false })
          .order('total_students', { ascending: false });

        if (error) throw error;
        setCourses((data || []) as DBCourse[]);
      } catch (err) {
        console.error('[CourseCatalog] Error fetching courses:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedLevel !== 'all') params.set('level', selectedLevel);
    if (sortBy !== 'popular') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, selectedLevel, sortBy]);

  // Extract unique categories from data
  const categories = useMemo(() => {
    const cats = new Set(courses.map(c => c.category));
    return Array.from(cats);
  }, [courses]);

  const levels = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

  const filteredCourses = useMemo(() => {
    let result = [...courses];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.instructor_name?.toLowerCase().includes(query) ||
        c.tags?.some(t => t.toLowerCase().includes(query)) ||
        c.category.toLowerCase().includes(query)
      );
    }
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedLevel !== 'all') {
      result = result.filter(c => c.level === selectedLevel);
    }
    if (showFreeOnly) {
      result = result.filter(c => c.is_free || (c.price ?? 0) === 0);
    }
    switch (sortBy) {
      case 'popular': result.sort((a, b) => (b.total_students ?? 0) - (a.total_students ?? 0)); break;
      case 'rating': result.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)); break;
      case 'price-low': result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case 'price-high': result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
    }
    return result;
  }, [courses, searchQuery, selectedCategory, selectedLevel, sortBy, showFreeOnly]);

  const activeFiltersCount = [selectedCategory !== 'all', selectedLevel !== 'all', showFreeOnly].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedLevel('all');
    setShowFreeOnly(false);
    setSearchQuery('');
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      beginner: { es: 'Principiante', en: 'Beginner' },
      intermediate: { es: 'Intermedio', en: 'Intermediate' },
      advanced: { es: 'Avanzado', en: 'Advanced' },
      expert: { es: 'Experto', en: 'Expert' },
    };
    return labels[level]?.[language as 'es' | 'en'] || level;
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      intermediate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      advanced: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      expert: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
    return colors[level] || 'bg-slate-500/20 text-slate-400';
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-white font-medium py-2">
          {language === 'es' ? 'Categorías' : 'Categories'}
          <ChevronDown className="w-4 h-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {categories.map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={selectedCategory === cat.toLowerCase()}
                onCheckedChange={(checked) => setSelectedCategory(checked ? cat.toLowerCase() : 'all')}
              />
              <span className="text-slate-300 group-hover:text-white transition-colors text-sm">{cat}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-white font-medium py-2">
          {language === 'es' ? 'Nivel' : 'Level'}
          <ChevronDown className="w-4 h-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {levels.map(level => (
            <label key={level} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={selectedLevel === level}
                onCheckedChange={(checked) => setSelectedLevel(checked ? level : 'all')}
              />
              <span className="text-slate-300 group-hover:text-white transition-colors text-sm">{getLevelLabel(level)}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="pt-2 border-t border-slate-700">
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox checked={showFreeOnly} onCheckedChange={(checked) => setShowFreeOnly(!!checked)} />
          <span className="text-slate-300 group-hover:text-white transition-colors text-sm">
            {language === 'es' ? 'Solo cursos gratis' : 'Free courses only'}
          </span>
        </label>
      </div>

      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">
          <X className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Limpiar filtros' : 'Clear filters'}
        </Button>
      )}
    </div>
  );

  const CourseCard = ({ course, index }: { course: DBCourse; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={viewMode === 'list' ? 'w-full' : ''}
    >
      <Link to={`/academia/curso/${course.slug}`}>
        <Card className={`bg-slate-800/50 border-slate-700 hover:border-primary/50 transition-all group overflow-hidden h-full ${viewMode === 'list' ? 'flex flex-row' : ''}`}>
          <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-64 flex-shrink-0' : 'aspect-video'}`}>
            <img
              src={course.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop'}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <Badge className={`absolute top-3 left-3 ${getLevelColor(course.level)}`}>
              {getLevelLabel(course.level)}
            </Badge>
            {course.is_featured && (
              <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                <Sparkles className="w-3 h-3 mr-1" /> Featured
              </Badge>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          </div>

          <CardContent className={`p-4 flex flex-col ${viewMode === 'list' ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span className="text-primary font-medium">{course.category}</span>
            </div>
            <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            {course.instructor_name && (
              <p className="text-sm text-slate-400 mb-3">{course.instructor_name}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
              {course.duration_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration_hours}h</span>
                </div>
              )}
              {course.total_lessons && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.total_lessons} {language === 'es' ? 'lecciones' : 'lessons'}</span>
                </div>
              )}
              {(course.total_students ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{(course.total_students ?? 0).toLocaleString()}</span>
                </div>
              )}
            </div>
            {(course.average_rating ?? 0) > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">{course.average_rating}</span>
                </div>
                {(course.total_reviews ?? 0) > 0 && (
                  <span className="text-slate-500 text-sm">({(course.total_reviews ?? 0).toLocaleString()})</span>
                )}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                {course.is_free || (course.price ?? 0) === 0 ? (
                  <span className="text-xl font-bold text-emerald-400">
                    {language === 'es' ? 'Gratis' : 'Free'}
                  </span>
                ) : (
                  <span className="text-xl font-bold text-white">€{course.price}</span>
                )}
              </div>
              <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                {language === 'es' ? 'Ver curso' : 'View course'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Link to="/academia" className="hover:text-white transition-colors">Academia</Link>
            <span>/</span>
            <span className="text-white">{language === 'es' ? 'Catálogo de Cursos' : 'Course Catalog'}</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {language === 'es' ? 'Catálogo de Cursos' : 'Course Catalog'}
              </h1>
              <p className="text-slate-400">
                {isLoading ? (language === 'es' ? 'Cargando...' : 'Loading...') : `${filteredCourses.length} ${language === 'es' ? 'cursos encontrados' : 'courses found'}`}
              </p>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('all')} className="ml-1"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {selectedLevel !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                    {getLevelLabel(selectedLevel)}
                    <button onClick={() => setSelectedLevel('all')} className="ml-1"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Search & Sort */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={language === 'es' ? 'Buscar cursos, instructores...' : 'Search courses, instructors...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden border-slate-700 text-white">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Filtros' : 'Filters'}
                {activeFiltersCount > 0 && <Badge className="ml-2 bg-primary text-white text-xs">{activeFiltersCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-slate-900 border-slate-700 w-80">
              <SheetHeader>
                <SheetTitle className="text-white">{language === 'es' ? 'Filtros' : 'Filters'}</SheetTitle>
              </SheetHeader>
              <div className="mt-6"><FilterContent /></div>
            </SheetContent>
          </Sheet>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder={language === 'es' ? 'Ordenar por' : 'Sort by'} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="popular">{language === 'es' ? 'Más populares' : 'Most popular'}</SelectItem>
              <SelectItem value="rating">{language === 'es' ? 'Mejor valorados' : 'Highest rated'}</SelectItem>
              <SelectItem value="price-low">{language === 'es' ? 'Precio: menor a mayor' : 'Price: low to high'}</SelectItem>
              <SelectItem value="price-high">{language === 'es' ? 'Precio: mayor a menor' : 'Price: high to low'}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? '' : 'border-slate-700 text-slate-400'}>
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? '' : 'border-slate-700 text-slate-400'}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex gap-8">
          <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28 bg-slate-800/30 rounded-xl p-5 border border-slate-700">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                {language === 'es' ? 'Filtros' : 'Filters'}
              </h3>
              <FilterContent />
            </div>
          </motion.aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredCourses.length > 0 ? (
                  <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={viewMode === 'grid' ? 'grid md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
                    {filteredCourses.map((course, index) => (
                      <CourseCard key={course.id} course={course} index={index} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
                    <GraduationCap className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {language === 'es' ? 'No se encontraron cursos' : 'No courses found'}
                    </h3>
                    <p className="text-slate-400 mb-4">
                      {language === 'es' ? 'Intenta ajustar los filtros o buscar con otros términos' : 'Try adjusting filters or search with different terms'}
                    </p>
                    <Button onClick={clearFilters} variant="outline" className="border-slate-600 text-white">
                      {language === 'es' ? 'Limpiar filtros' : 'Clear filters'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {!isLoading && filteredCourses.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-12 text-center py-10 border border-dashed border-slate-700 rounded-2xl">
                <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {language === 'es' ? 'Más cursos próximamente' : 'More courses coming soon'}
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  {language === 'es' ? 'Nuevos cursos con tutores IA cada mes' : 'New courses with AI tutors every month'}
                </p>
              </motion.div>
            )}

            {user && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8">
                <AIRecommendationsPanel className="bg-slate-800/30 border-slate-700" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;
