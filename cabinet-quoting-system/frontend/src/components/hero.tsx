import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Home, Heart, Calculator } from 'lucide-react'

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-primary/5 to-background pt-16 pb-12">
      <div className="container max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Build Your Dream Kitchen
            <span className="block text-primary">with Premium Cabinets</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover our extensive collection of high-quality kitchen and bathroom cabinets. 
            Get instant quotes and bring your vision to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/catalog">
                <Search className="mr-2 h-5 w-5" />
                Browse Catalog
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/quote-builder">
                <Calculator className="mr-2 h-5 w-5" />
                Start Quote
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card className="cabinet-card-hover">
            <CardContent className="p-6 text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Easy Browsing</h3>
              <p className="text-muted-foreground">
                Search and filter through our extensive cabinet collection with advanced filters
              </p>
            </CardContent>
          </Card>

          <Card className="cabinet-card-hover">
            <CardContent className="p-6 text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Instant Quotes</h3>
              <p className="text-muted-foreground">
                Get accurate pricing instantly with our intelligent quote builder
              </p>
            </CardContent>
          </Card>

          <Card className="cabinet-card-hover">
            <CardContent className="p-6 text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quality Materials</h3>
              <p className="text-muted-foreground">
                Premium wood materials and finishes for lasting beauty and durability
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}