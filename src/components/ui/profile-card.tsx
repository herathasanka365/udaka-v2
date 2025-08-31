import React from 'react';
import { MapPin, Eye, Star, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ProfileCardProps {
  name: string;
  category: string;
  location?: string;
  keywords?: string[];
  image?: string;
  rating?: number;
  viewCount?: number;
  description?: string;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  onCardClick?: () => void;
  className?: string;
  compact?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  category,
  location,
  keywords = [],
  image,
  rating,
  viewCount,
  description,
  actionButtons = [{ label: 'View Profile', onClick: () => {} }],
  onCardClick,
  className,
  compact = false,
}) => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onCardClick?.();
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-glass',
        'backdrop-blur-glass border border-border',
        'bg-gradient-glass shadow-lg',
        'transition-all duration-300 ease-in-out',
        'hover:shadow-xl hover:border-primary/30',
        'hover:transform hover:scale-[1.02]',
        onCardClick && 'cursor-pointer',
        compact ? 'p-4' : 'p-6',
        className
      )}
      onClick={handleCardClick}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onCardClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onCardClick();
        }
      }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-start gap-4',
        compact ? 'mb-3' : 'mb-4'
      )}>
        <Avatar className={cn(
          'ring-2 ring-border group-hover:ring-primary/50 transition-all',
          compact ? 'w-12 h-12' : 'w-16 h-16'
        )}>
          <AvatarImage src={image} alt={`${name}'s profile`} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="w-1/2 h-1/2" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-semibold text-foreground truncate group-hover:text-primary transition-colors',
            compact ? 'text-base' : 'text-lg'
          )}>
            {name}
          </h3>
          <p className={cn(
            'text-muted-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {category}
          </p>
          
          {location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className={cn(
                'text-muted-foreground truncate',
                compact ? 'text-xs' : 'text-sm'
              )}>
                {location}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        {(rating || viewCount) && (
          <div className="text-right space-y-1">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium text-foreground">
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
            {viewCount && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {viewCount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {description && !compact && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className={cn(
          'flex flex-wrap gap-1.5',
          compact ? 'mb-3' : 'mb-4'
        )}>
          {keywords.slice(0, compact ? 3 : 5).map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              className={cn(
                'bg-muted/50 text-muted-foreground border-border hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-colors',
                compact ? 'text-xs px-2 py-0.5' : 'text-xs'
              )}
            >
              {keyword}
            </Badge>
          ))}
          {keywords.length > (compact ? 3 : 5) && (
            <Badge
              variant="outline"
              className={cn(
                'bg-transparent border-border text-muted-foreground',
                compact ? 'text-xs px-2 py-0.5' : 'text-xs'
              )}
            >
              +{keywords.length - (compact ? 3 : 5)}
            </Badge>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={cn(
        'flex gap-2',
        actionButtons.length > 2 ? 'flex-col' : 'flex-row'
      )}>
        {actionButtons.map((button, index) => {
          const Icon = button.icon;
          return (
            <Button
              key={index}
              variant={button.variant || (index === 0 ? 'default' : 'outline')}
              size={compact ? 'sm' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                button.onClick();
              }}
              className={cn(
                'flex-1',
                button.variant === 'default' && 'bg-primary hover:bg-primary-hover',
                button.variant === 'outline' && 'border-border hover:bg-muted/50'
              )}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {button.label}
            </Button>
          );
        })}
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-glass opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-glass bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      </div>
    </div>
  );
};

export default ProfileCard;