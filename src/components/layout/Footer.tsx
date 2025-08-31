import { Twitter, Linkedin } from "lucide-react"

export function Footer() {
  const navigationLinks = [
    { name: "Home", href: "/home" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Explore Talent", href: "/explore-talent" },
  ]

  const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "LinkedIn", icon: Linkedin, href: "#" },
  ]

  return (
    <footer className="w-full bg-background border-t border-border/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            {navigationLinks.map((link, index) => (
              <span key={link.name} className="flex items-center">
                <a
                  href={link.href}
                  className="text-foreground hover:text-primary transition-colors duration-200 font-sans"
                >
                  {link.name}
                </a>
                {index < navigationLinks.length - 1 && (
                  <span className="ml-6 text-muted-foreground">|</span>
                )}
              </span>
            ))}
          </nav>

          {/* Social Icons */}
          <div className="flex items-center space-x-6">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-foreground hover:text-primary transition-colors duration-200"
                  aria-label={social.name}
                >
                  <Icon size={20} />
                </a>
              )
            })}
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-muted-foreground font-sans">
            <p>&copy; 2024 Cinehublk. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}