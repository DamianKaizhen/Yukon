"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { formatPrice } from '@/lib/utils'
import { QuoteItemCard } from './quote-item-card'
import { QuoteSummary } from './quote-summary'
import { quoteApi, customerApi } from '@/lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { 
  ShoppingCart, 
  Plus, 
  Calculator,
  FileText,
  Send,
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { QuickAddForm } from './quick-add-form'

const customerSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
})

type CustomerForm = z.infer<typeof customerSchema>

export function QuoteBuilder() {
  const router = useRouter()
  const cart = useCartStore((state) => state.cart)
  const clearCart = useCartStore((state) => state.clearCart)
  const { user, isAuthenticated } = useAuthStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuote, setGeneratedQuote] = useState<any>(null)
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: '',
      company: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: '',
        company: '',
        notes: '',
      })
    }
  }, [user, form])

  const handleGenerateQuote = async (customerData?: CustomerForm) => {
    if (cart.items.length === 0) {
      toast.error('Add items to your cart first')
      return
    }

    setIsGenerating(true)

    try {
      let customerId = user?.id

      // Create customer if not authenticated or custom customer data provided
      if (!isAuthenticated || (customerData && customerData.email !== user?.email)) {
        if (!customerData) {
          setShowCustomerForm(true)
          setIsGenerating(false)
          return
        }

        const customer = await customerApi.createCustomer(customerData)
        customerId = customer.id
      }

      if (!customerId) {
        throw new Error('Customer information is required')
      }

      // Create quote
      const quoteItems = cart.items.map(item => ({
        product_variant_id: item.productVariantId,
        box_material_id: item.boxMaterialId,
        quantity: item.quantity,
      }))

      const quote = await quoteApi.createQuote({
        customer_id: customerId,
        notes: customerData?.notes || '',
        items: quoteItems,
      })

      setGeneratedQuote(quote)
      toast.success('Quote generated successfully!')
      
      // Clear cart after successful quote generation
      clearCart()
      
    } catch (error: any) {
      console.error('Quote generation error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate quote'
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const onSubmit = (values: CustomerForm) => {
    handleGenerateQuote(values)
    setShowCustomerForm(false)
  }

  // Show generated quote success message
  if (generatedQuote) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Quote #{generatedQuote.quote_number} has been generated successfully!
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Quote Generated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quote Number:</span>
                <p className="font-semibold">#{generatedQuote.quote_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <p className="font-semibold">{formatPrice(generatedQuote.total_amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Items:</span>
                <p className="font-semibold">{generatedQuote.items.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary">Draft</Badge>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button asChild>
                <Link href={`/quotes/${generatedQuote.id}`}>
                  View Quote
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setGeneratedQuote(null)}>
                Create Another Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Quote Items */}
      <div className="lg:col-span-2 space-y-6">
        {/* Quick Add Form */}
        <QuickAddForm />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Quote Items
              {cart.itemCount > 0 && (
                <Badge variant="secondary">{cart.itemCount} items</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.items.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No Items in Quote</h3>
                <p className="text-muted-foreground mb-4">
                  Add cabinets to your quote to get started
                </p>
                <Button asChild>
                  <Link href="/catalog">
                    <Plus className="mr-2 h-4 w-4" />
                    Browse Catalog
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.items.map((item, index) => (
                  <QuoteItemCard key={`${item.productVariantId}-${item.boxMaterialId}`} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {cart.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => handleGenerateQuote()}
                  disabled={isGenerating}
                  className="flex-1 min-w-48"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate Quote'}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/catalog">
                    <Plus className="mr-2 h-4 w-4" />
                    Add More Items
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Form Modal */}
        {showCustomerForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any special requirements or notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isGenerating}>
                      {isGenerating ? 'Generating...' : 'Generate Quote'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowCustomerForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quote Summary */}
      <div className="space-y-6">
        <QuoteSummary />
        
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.first_name} {user.last_name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Quotes will be saved to your account
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>Customer details will be collected when generating the quote.</p>
                <p className="mt-2">
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link> to save quotes to your account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Information */}
        {cart.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>{cart.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>{formatPrice(cart.taxAmount)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatPrice(cart.totalAmount)}</span>
                </div>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                <p>• Prices subject to final approval</p>
                <p>• Installation quotes available separately</p>
                <p>• Valid for 30 days from generation</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}