import React from 'react';
import { Search, Filter, MapPin, Tag, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface FilterGroupProps {
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  location?: string;
  onLocationChange?: (location: string) => void;
  keywords?: string[];
  selectedKeywords?: string[];
  onKeywordToggle?: (keyword: string) => void;
  onKeywordAdd?: (keyword: string) => void;
  onClearFilters?: () => void;
  className?: string;
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  categories = ['All', 'Actor', 'Director', 'Producer', 'Cinematographer', 'Editor'],
  selectedCategory = 'All',
  onCategoryChange,
  location = '',
  onLocationChange,
  keywords = ['drama', 'comedy', 'action', 'sci-fi', 'documentary', 'commercial'],
  selectedKeywords = [],
  onKeywordToggle,
  onKeywordAdd,
  onClearFilters,
  className,
}) => {
  const [keywordInput, setKeywordInput] = React.useState('');
  const [isKeywordPopoverOpen, setIsKeywordPopoverOpen] = React.useState(false);

  const handleKeywordInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywordInput.trim() && onKeywordAdd) {
      onKeywordAdd(keywordInput.trim());
      setKeywordInput('');
    }
  };

  const hasActiveFilters = selectedCategory !== 'All' || location || selectedKeywords.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Filters</h3>
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Category</label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full backdrop-blur-glass bg-card/50 border-border">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="backdrop-blur-glass bg-popover border-border z-50">
            {categories.map((category) => (
              <SelectItem 
                key={category} 
                value={category}
                className="hover:bg-muted/50"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter location..."
            value={location}
            onChange={(e) => onLocationChange?.(e.target.value)}
            className="pl-10 backdrop-blur-glass bg-card/50 border-border"
          />
        </div>
      </div>

      {/* Keywords Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Keywords</label>
        
        {/* Selected Keywords */}
        {selectedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-glass backdrop-blur-glass bg-card/30 border border-border">
            {selectedKeywords.map((keyword) => (
              <Badge
                key={keyword}
                variant="secondary"
                className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
              >
                {keyword}
                <button
                  onClick={() => onKeywordToggle?.(keyword)}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Remove ${keyword} keyword`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Keyword Selection */}
        <Popover open={isKeywordPopoverOpen} onOpenChange={setIsKeywordPopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              role="combobox"
              aria-expanded={isKeywordPopoverOpen}
              className="w-full justify-between backdrop-blur-glass bg-card/50 border-border hover:bg-card/70"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Add keywords
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 backdrop-blur-glass bg-popover border-border">
            <div className="p-3 border-b border-border">
              <form onSubmit={handleKeywordInputSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type to add custom keyword..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  className="pl-10 bg-transparent border-border"
                />
              </form>
            </div>
            <div className="max-h-60 overflow-y-auto p-2">
              {keywords
                .filter(keyword => !selectedKeywords.includes(keyword))
                .filter(keyword => keyword.toLowerCase().includes(keywordInput.toLowerCase()))
                .map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => {
                      onKeywordToggle?.(keyword);
                      setIsKeywordPopoverOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 text-sm"
                  >
                    {keyword}
                  </button>
                ))}
              {keywordInput && !keywords.includes(keywordInput.toLowerCase()) && (
                <button
                  onClick={() => {
                    onKeywordAdd?.(keywordInput.trim());
                    setKeywordInput('');
                    setIsKeywordPopoverOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 text-sm text-primary"
                >
                  Add "{keywordInput}"
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default FilterGroup;