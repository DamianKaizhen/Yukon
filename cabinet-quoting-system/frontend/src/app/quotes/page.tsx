"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { quoteApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  FileText,
  DollarSign
} from 'lucide-react'
import type { Quote } from '@/types'

export default function QuotesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [mounted, authLoading, isAuthenticated, router])

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes', user?.id],
    queryFn: () => quoteApi.getQuotes(user?.id),
    enabled: !!user?.id,
  })

  if (!mounted || authLoading) {
    return <LoadingSkeleton count={6} />
  }

  if (!isAuthenticated) {
    return null
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

  // Filter quotes based on search and status
  const filteredQuotes = quotes?.filter(quote => {
    const matchesSearch = searchQuery === '' || 
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  const totalQuotes = quotes?.length || 0
  const pendingQuotes = quotes?.filter(q => q.status === 'sent')?.length || 0
  const approvedQuotes = quotes?.filter(q => q.status === 'approved')?.length || 0
  const totalValue = quotes?.reduce((sum, quote) => sum + quote.total_amount, 0) || 0

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
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground">
            Manage and track all your quotes
          </p>
        </div>
        <Button asChild>
          <Link href="/quote-builder">
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Link>
        </Button>
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
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatPrice(totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotes by number or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredQuotes.length === totalQuotes ? 'All Quotes' : `Filtered Quotes (${filteredQuotes.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton count={5} />
          ) : filteredQuotes.length > 0 ? (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">Quote #{quote.quote_number}</h3>
                      <Badge variant={getStatusColor(quote.status)}>
                        {getStatusText(quote.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {quote.customer && (
                        <>
                          <span>{quote.customer.first_name} {quote.customer.last_name}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{quote.items.length} items</span>
                      <span>•</span>
                      <span>{formatPrice(quote.total_amount)}</span>
                      <span>•</span>
                      <span>{new Date(quote.created_at).toLocaleDateString()}</span>
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
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No matching quotes' : 'No quotes yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by creating your first quote'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button asChild>
                  <Link href="/quote-builder">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quote
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}