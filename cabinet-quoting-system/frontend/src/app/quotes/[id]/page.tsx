"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { quoteApi } from '@/lib/api'
import { formatPrice, formatDimensions } from '@/lib/utils'
import {
  ArrowLeft,
  Download,
  Send,
  Edit,
  Eye,
  Calendar,
  User,
  Package,
  DollarSign,
  FileText
} from 'lucide-react'
import type { Quote } from '@/types'

interface QuotePageProps {
  params: { id: string }
}

export default function QuotePage({ params }: QuotePageProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
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

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', params.id],
    queryFn: () => quoteApi.getQuote(params.id),
    enabled: !!params.id && isAuthenticated,
  })

  if (!mounted || authLoading) {
    return <LoadingSkeleton count={6} />
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <LoadingSkeleton count={8} />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Quote not found</p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

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
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Quote #{quote.quote_number}
          </h1>
          <p className="text-muted-foreground">
            Created on {new Date(quote.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {quote.status === 'draft' && (
            <Button variant="outline" size="sm">
              <Send className="mr-2 h-4 w-4" />
              Send Quote
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit Quote
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quote Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Quote Information
                </span>
                <Badge variant={getStatusColor(quote.status)}>
                  {getStatusText(quote.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Quote Number</span>
                <p className="font-semibold">#{quote.quote_number}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Valid Until</span>
                <p className="font-semibold">
                  {new Date(quote.valid_until).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-semibold">
                  {new Date(quote.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <p className="font-semibold">
                  {new Date(quote.updated_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          {quote.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {quote.customer.first_name} {quote.customer.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{quote.customer.email}</p>
                  {quote.customer.phone && (
                    <p className="text-sm text-muted-foreground">{quote.customer.phone}</p>
                  )}
                  {quote.customer.company && (
                    <p className="text-sm text-muted-foreground">{quote.customer.company}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Quote Items
                <Badge variant="secondary">{quote.items.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quote.items.map((item, index) => (
                  <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                    {/* Product Image Placeholder */}
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1">
                        {item.product_variant.product?.name || 'Product Name'}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {item.product_variant.color_option.display_name}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.box_material.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatPrice(item.unit_price)}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.line_total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quote Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatPrice(quote.tax_amount)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(quote.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                View Full Quote
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {quote.status === 'draft' && (
                <Button variant="outline" className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send to Customer
                </Button>
              )}
              <Button variant="outline" className="w-full">
                <Edit className="mr-2 h-4 w-4" />
                Edit Quote
              </Button>
            </CardContent>
          </Card>

          {/* Quote Information */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>{quote.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={getStatusColor(quote.status)} className="text-xs">
                  {getStatusText(quote.status)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until:</span>
                <span>{new Date(quote.valid_until).toLocaleDateString()}</span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                <p>• Prices subject to final approval</p>
                <p>• Installation quotes available separately</p>
                <p>• Contact us for custom modifications</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}