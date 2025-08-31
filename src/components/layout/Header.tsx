import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { UserMenu } from "@/components/auth/UserMenu"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)

  return (
    <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/home" className="block">
              <h1 className="text-2xl font-bold text-primary font-sans hover:text-primary-hover transition-colors">
                Cinehublk
              </h1>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <a href="/home">Home</a>
            </Button>
            
            {user ? (
              <UserMenu />
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary-outline">
                      For Creators
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-popover/95 backdrop-blur-lg border-border/50">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <a href="/auth/creator/sign-in" className="cursor-pointer">
                          Sign In
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="/auth/creator/register" className="cursor-pointer">
                          Register
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary-outline">
                      For Clients
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-popover/95 backdrop-blur-lg border-border/50">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <a href="/auth/client/sign-in" className="cursor-pointer">
                          Sign In
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="/auth/client/register" className="cursor-pointer">
                          Register
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="text-foreground"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "md:hidden transition-all duration-300 ease-in-out overflow-hidden",
            isMobileMenuOpen ? "max-h-64 pb-4" : "max-h-0"
          )}
        >
          <div className="space-y-3 pt-4">
            <a
              href="/home"
              className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-md transition-colors"
            >
              Home
            </a>
            {user ? (
              <div className="flex justify-center pt-2">
                <UserMenu />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground px-2">For Creators</p>
                  <div className="space-y-1">
                    <a
                      href="/auth/creator/sign-in"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    >
                      Sign In
                    </a>
                    <a
                      href="/auth/creator/register"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    >
                      Register
                    </a>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground px-2">For Clients</p>
                  <div className="space-y-1">
                    <a
                      href="/auth/client/sign-in"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    >
                      Sign In
                    </a>
                    <a
                      href="/auth/client/register"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    >
                      Register
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}