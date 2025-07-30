"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { 
  ShoppingCart, 
  User, 
  Menu,
  Search,
  Heart,
  Calculator
} from 'lucide-react'

export function Header() {
  const itemCount = useCartStore((state) => state.getItemCount())
  const { isAuthenticated, user } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary rounded-lg w-8 h-8 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-xl">CabinetPro</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/catalog" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Browse Catalog
            </Link>
            <Link 
              href="/quote-builder" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Quote Builder
            </Link>
            <Link 
              href="/about" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/catalog">
                <Search className="h-5 w-5" />
              </Link>
            </Button>

            {/* Favorites */}
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>

            {/* Quote Builder */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/quote-builder">
                <Calculator className="h-5 w-5" />
              </Link>
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}