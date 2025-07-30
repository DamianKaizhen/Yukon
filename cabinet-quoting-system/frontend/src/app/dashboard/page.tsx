"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import { quoteApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import {
  User,
  FileText,
  ShoppingCart,
  Calculator,
  Eye,
  Download,
  Plus,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react'
import type { Quote } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const { cart } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [mounted, authLoading, isAuthenticated, router])

  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes', user?.id],
    queryFn: () => quoteApi.getQuotes(user?.id),
    enabled: !!user?.id,
  })

  if (!mounted || authLoading) {
    return <LoadingSkeleton count={6} />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const recentQuotes = quotes?.slice(0, 3) || []
  const totalQuotes = quotes?.length || 0
  const pendingQuotes = quotes?.filter(q => q.status === 'sent')?.length || 0
  const approvedQuotes = quotes?.filter(q => q.status === 'approved')?.length || 0

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'default'
      case 'sent': return 'secondary'
      case 'approved': return 'default'
      case 'rejected': return 'destructive'
      case 'expired': return 'outline'
      default: return 'default'
    }
  }

  const getStatusText = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'sent': return 'Pending'
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'expired': return 'Expired'
      default: return status
    }
  }

  return (
    <div className="container max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your quotes and account settings
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/catalog">
              <Package className="mr-2 h-4 w-4" />
              Browse Catalog
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/quote-builder">
              <Calculator className="mr-2 h-4 w-4" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{totalQuotes}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingQuotes}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedQuotes}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cart Items</p>
                <p className="text-2xl font-bold">{cart.itemCount}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="quotes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-6">
          {/* Recent Quotes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Quotes</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/quotes">
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <LoadingSkeleton count={3} />
              ) : recentQuotes.length > 0 ? (
                <div className="space-y-4">
                  {recentQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">Quote #{quote.quote_number}</h3>
                          <Badge variant={getStatusColor(quote.status)}>
                            {getStatusText(quote.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{quote.items.length} items</span>
                          <span>•</span>
                          <span>{formatPrice(quote.total_amount)}</span>
                          <span>•</span>
                          <span>
                            {new Date(quote.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/quotes/${quote.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by creating your first quote
                  </p>
                  <Button asChild>
                    <Link href="/quote-builder">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Quote
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Cart */}
          {cart.itemCount > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Current Cart</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/cart">
                    View Cart
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{cart.itemCount} items in cart</p>
                    <p className="text-sm text-muted-foreground">
                      Total: {formatPrice(cart.totalAmount)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/cart">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        View Cart
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/quote-builder">
                        <Calculator className="mr-2 h-4 w-4" />
                        Create Quote
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <p className="mt-1 text-sm text-muted-foreground">{user.first_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <p className="mt-1 text-sm text-muted-foreground">{user.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <p className="mt-1 text-sm text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
              <div className="pt-4">
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}