"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Home, Bath, Utensils, Archive } from 'lucide-react'

const quickCategories = [
  { name: 'Base Cabinets', icon: Home, slug: 'base', count: 45 },
  { name: 'Wall Cabinets', icon: Archive, slug: 'wall', count: 38 },
  { name: 'Tall Cabinets', icon: Archive, slug: 'tall', count: 22 },
  { name: 'Vanity Cabinets', icon: Bath, slug: 'vanity', count: 18 },
]

const popularFinishes = [
  'White Shaker',
  'Espresso',
  'Gray',
  'Cherry',
  'Maple',
  'Oak'
]

export function QuickFilters() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <Card className="filter-section">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Find Your Perfect Cabinets</h2>
          <p className="text-muted-foreground">
            Search our collection or browse by category to get started
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search cabinets by name, size, or style..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </form>

        {/* Quick Categories */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Browse by Category
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickCategories.map((category) => {
              const Icon = category.icon
              return (
                <Link 
                  key={category.slug} 
                  href={`/catalog?category=${category.slug}`}
                  className="block"
                >
                  <Card className="cabinet-card-hover cursor-pointer h-full">
                    <CardContent className="p-4 text-center">
                      <div className="bg-primary/10 rounded-lg w-12 h-12 flex items-center justify-center mx-auto mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="font-medium text-sm mb-1">{category.name}</div>
                      <Badge variant="secondary" className="text-xs">
                        {category.count} items
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Popular Finishes */}
        <div>
          <h3 className="font-semibold mb-4">Popular Finishes</h3>
          <div className="flex flex-wrap gap-2">
            {popularFinishes.map((finish) => (
              <Button
                key={finish}
                variant="outline"
                size="sm"
                asChild
              >
                <Link href={`/catalog?finish=${encodeURIComponent(finish)}`}>
                  {finish}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}