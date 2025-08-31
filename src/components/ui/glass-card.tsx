import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "backdrop-blur-glass bg-glass-bg border border-glass-border rounded-glass p-6",
        "shadow-lg shadow-primary/10",
        className
      )}
      style={{
        backdropFilter: 'blur(10px)',
        background: 'rgba(18, 18, 18, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {children}
    </div>
  )
}