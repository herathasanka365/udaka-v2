import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Save, Users, Filter as FilterIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { FilterGroup } from '@/components/ui/filter-group';
import { ProfileCard } from '@/components/ui/profile-card';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToastNotification } from '@/components/ui/toast-notification';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Creator {
  id: string;
  name: string;
  role: string;
  location: string;
  keywords: string[];
  portfolio_urls: string[];
  description: string;
}

interface FilterState {
  category: string;
  location: string;
  keywords: string[];
  searchQuery: string;
  sortBy: 'name' | 'recent';
}

const ITEMS_PER_PAGE = 12;
const DEFAULT_CATEGORIES = ['All', 'Actor', 'Director', 'Producer', 'Cinematographer', 'Editor', 'Makeup Artist', 'Sound Engineer'];
const DEFAULT_KEYWORDS = ['drama', 'comedy', 'action', 'sci-fi', 'documentary', 'commercial', 'indie', 'theater', 'music video', 'corporate'];

const ExploreTalent: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    location: '',
    keywords: [],
    searchQuery: '',
    sortBy: 'name',
  });
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const { addToast, ToastContainer } = useToastNotification();
  const queryClient = useQueryClient();

  // Fetch creators from Supabase
  const { data: allCreators, isLoading, error } = useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, location, keywords, portfolio_urls, description')
        .eq('role', 'creator')
        .order('name');

      if (error) throw error;
      return data as Creator[];
    },
  });

  // Client-side filtering and sorting
  const filteredCreators = useMemo(() => {
    if (!allCreators) return [];

    let filtered = allCreators.filter((creator) => {
      // Category filter
      if (filters.category !== 'All' && creator.role !== filters.category) {
        return false;
      }

      // Location filter
      if (filters.location && !creator.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Keywords filter
      if (filters.keywords.length > 0) {
        const hasMatchingKeywords = filters.keywords.some(keyword =>
          creator.keywords?.some(creatorKeyword =>
            creatorKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        if (!hasMatchingKeywords) return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          creator.name.toLowerCase().includes(query) ||
          creator.description?.toLowerCase().includes(query) ||
          creator.keywords?.some(keyword => keyword.toLowerCase().includes(query))
        );
      }

      return true;
    });

    // Sort results
    if (filters.sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [allCreators, filters]);

  // Paginated results for infinite scroll
  const paginatedCreators = useMemo(() => {
    return filteredCreators.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredCreators, page]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000
      ) {
        if (paginatedCreators.length < filteredCreators.length && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setPage(prev => prev + 1);
            setIsLoadingMore(false);
          }, 500);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [paginatedCreators.length, filteredCreators.length, isLoadingMore]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: { name: string; filters: any }) => {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: 'anonymous', // For anonymous users, we could use a session ID
          role: 'client',
          filters: {
            category: searchData.filters.category,
            location: searchData.filters.location,
            keywords: searchData.filters.keywords,
            search_query: searchData.filters.searchQuery,
            sort_by: searchData.filters.sortBy,
          },
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Search Saved',
        message: 'Your search criteria have been saved successfully.',
      });
      setIsSaveDialogOpen(false);
      setSaveSearchName('');
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Unable to save search. Please try again.',
      });
    },
  });

  const handleCategoryChange = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleLocationChange = (location: string) => {
    setFilters(prev => ({ ...prev, location }));
  };

  const handleKeywordToggle = (keyword: string) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.includes(keyword)
        ? prev.keywords.filter(k => k !== keyword)
        : [...prev.keywords, keyword]
    }));
  };

  const handleKeywordAdd = (keyword: string) => {
    if (!filters.keywords.includes(keyword)) {
      setFilters(prev => ({ ...prev, keywords: [...prev.keywords, keyword] }));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      category: 'All',
      location: '',
      keywords: [],
      searchQuery: '',
      sortBy: 'name',
    });
  };

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) {
      addToast({
        type: 'error',
        title: 'Invalid Name',
        message: 'Please enter a name for your saved search.',
      });
      return;
    }

    saveSearchMutation.mutate({
      name: saveSearchName,
      filters,
    });
  };

  const handleViewProfile = (creatorId: string) => {
    // Navigate to creator profile (would be implemented later)
    console.log('View profile:', creatorId);
    addToast({
      type: 'info',
      message: 'Profile preview feature coming soon!',
    });
  };

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Explore <span className="text-primary">Talent</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover incredible filmmakers and creatives ready to bring your vision to life
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <GlassCard className="p-6 sticky top-24">
                {/* Search Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by name or skills..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="pl-10 backdrop-blur-glass bg-card/50 border-border"
                    />
                  </div>
                </div>

                {/* Sort Options */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sort by
                  </label>
                  <Select value={filters.sortBy} onValueChange={(value: 'name' | 'recent') => setFilters(prev => ({ ...prev, sortBy: value }))}>
                    <SelectTrigger className="backdrop-blur-glass bg-card/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-glass bg-popover border-border">
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="recent">Most Recent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Group */}
                <FilterGroup
                  categories={DEFAULT_CATEGORIES}
                  selectedCategory={filters.category}
                  onCategoryChange={handleCategoryChange}
                  location={filters.location}
                  onLocationChange={handleLocationChange}
                  keywords={DEFAULT_KEYWORDS}
                  selectedKeywords={filters.keywords}
                  onKeywordToggle={handleKeywordToggle}
                  onKeywordAdd={handleKeywordAdd}
                  onClearFilters={handleClearFilters}
                />

                {/* Save Search */}
                <div className="mt-6 pt-6 border-t border-border">
                  <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full backdrop-blur-glass bg-card/50 border-border hover:bg-card/70"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Search
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="backdrop-blur-glass bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Save Search Criteria</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Enter search name..."
                          value={saveSearchName}
                          onChange={(e) => setSaveSearchName(e.target.value)}
                          className="backdrop-blur-glass bg-card/50 border-border"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveSearch} disabled={saveSearchMutation.isPending}>
                            {saveSearchMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </GlassCard>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {filteredCreators.length} creators found
                  </span>
                </div>

                {/* Active Filters */}
                {(filters.category !== 'All' || filters.location || filters.keywords.length > 0 || filters.searchQuery) && (
                  <div className="flex items-center gap-2">
                    <FilterIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Active filters:</span>
                    {filters.category !== 'All' && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        {filters.category}
                      </Badge>
                    )}
                    {filters.location && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        {filters.location}
                      </Badge>
                    )}
                    {filters.keywords.slice(0, 2).map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        {keyword}
                      </Badge>
                    ))}
                    {filters.keywords.length > 2 && (
                      <Badge variant="outline" className="border-border">
                        +{filters.keywords.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <GlassCard key={i} className="p-6 animate-pulse">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-muted rounded-full" />
                        <div className="flex-1">
                          <div className="h-5 bg-muted rounded mb-2" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                      <div className="flex gap-2 mb-4">
                        <div className="h-6 bg-muted rounded-full w-16" />
                        <div className="h-6 bg-muted rounded-full w-20" />
                        <div className="h-6 bg-muted rounded-full w-18" />
                      </div>
                      <div className="h-10 bg-muted rounded" />
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <GlassCard className="p-8 text-center">
                  <p className="text-destructive mb-4">Error loading creators</p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['creators'] })}>
                    Try Again
                  </Button>
                </GlassCard>
              )}

              {/* Results Grid */}
              {!isLoading && !error && (
                <>
                  {paginatedCreators.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {paginatedCreators.map((creator) => (
                        <ProfileCard
                          key={creator.id}
                          name={creator.name}
                          category={creator.role}
                          location={creator.location}
                          keywords={creator.keywords?.slice(0, 3) || []}
                          image={creator.portfolio_urls?.[0]}
                          description={creator.description}
                          actionButtons={[
                            {
                              label: 'View Profile',
                              onClick: () => handleViewProfile(creator.id),
                              variant: 'default',
                            },
                          ]}
                          onCardClick={() => handleViewProfile(creator.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <GlassCard className="p-8 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No creators found</h3>
                      <p className="text-muted-foreground mb-4">
                        Try adjusting your search criteria or filters
                      </p>
                      <Button onClick={handleClearFilters} variant="outline">
                        Clear Filters
                      </Button>
                    </GlassCard>
                  )}

                  {/* Load More Indicator */}
                  {isLoadingMore && (
                    <div className="flex justify-center mt-8">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading more creators...
                      </div>
                    </div>
                  )}

                  {/* End of Results Indicator */}
                  {paginatedCreators.length >= filteredCreators.length && filteredCreators.length > ITEMS_PER_PAGE && (
                    <div className="text-center mt-8">
                      <p className="text-muted-foreground">You've reached the end of the results</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </Layout>
  );
};

export default ExploreTalent;