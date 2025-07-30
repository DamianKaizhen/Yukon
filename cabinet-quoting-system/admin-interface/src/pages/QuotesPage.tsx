import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import {
  FileText,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { apiClient } from '@/services/api';
import { Quote, QuoteStatus, SearchParams } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/LoadingSpinner';

const getStatusBadgeVariant = (status: QuoteStatus) => {
  switch (status) {
    case QuoteStatus.DRAFT:
      return 'secondary';
    case QuoteStatus.SENT:
      return 'default';
    case QuoteStatus.APPROVED:
      return 'default';
    case QuoteStatus.REJECTED:
      return 'destructive';
    case QuoteStatus.EXPIRED:
      return 'secondary';
    default:
      return 'secondary';
  }
};

const getStatusIcon = (status: QuoteStatus) => {
  switch (status) {
    case QuoteStatus.DRAFT:
      return <Clock className="h-3 w-3" />;
    case QuoteStatus.SENT:
      return <FileText className="h-3 w-3" />;
    case QuoteStatus.APPROVED:
      return <CheckCircle className="h-3 w-3" />;
    case QuoteStatus.REJECTED:
      return <XCircle className="h-3 w-3" />;
    case QuoteStatus.EXPIRED:
      return <Calendar className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const QuotesPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  // Fetch quotes
  const {
    data: quotesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quotes', pagination, globalFilter, columnFilters, statusFilter],
    queryFn: () => {
      const params: SearchParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter || undefined,
        filters: statusFilter !== 'all' ? { status: statusFilter } : undefined,
      };
      return apiClient.getQuotes(params);
    },
  });

  // Mutations
  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quote> }) =>
      apiClient.updateQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote updated successfully');
    },
    onError: () => {
      toast.error('Failed to update quote');
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedQuote(null);
    },
    onError: () => {
      toast.error('Failed to delete quote');
    },
  });

  // Export functionality
  const handleExport = async () => {
    try {
      const blob = await apiClient.exportQuotes();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `quotes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Quotes exported successfully');
    } catch {
      toast.error('Failed to export quotes');
    }
  };

  // Quick status update
  const handleStatusUpdate = (quote: Quote, newStatus: QuoteStatus) => {
    updateQuoteMutation.mutate({
      id: quote.id,
      data: { status: newStatus },
    });
  };

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsViewDialogOpen(true);
  };

  // Table columns
  const columns: ColumnDef<Quote>[] = useMemo(
    () => [
      {
        accessorKey: 'quote_number',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 h-auto font-medium"
          >
            Quote #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-mono text-sm font-medium">
            {row.getValue('quote_number')}
          </div>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => {
          const quote = row.original;
          return quote.customer ? (
            <div>
              <div className="font-medium">
                {quote.customer.first_name} {quote.customer.last_name}
              </div>
              {quote.customer.company_name && (
                <div className="text-sm text-gray-500">
                  {quote.customer.company_name}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Unknown Customer</span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as QuoteStatus;
          return (
            <Badge
              variant={getStatusBadgeVariant(status)}
              className="flex items-center gap-1 w-fit"
            >
              {getStatusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: 'totals',
        header: 'Amount',
        cell: ({ row }) => {
          const quote = row.original;
          return (
            <div className="text-right">
              <div className="font-medium flex items-center">
                <DollarSign className="h-3 w-3 mr-1" />
                {quote.total_amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </div>
              {quote.discount_amount > 0 && (
                <div className="text-sm text-gray-500">
                  Discount: ${quote.discount_amount.toFixed(2)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 h-auto font-medium"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-sm">
            {format(new Date(row.getValue('created_at')), 'MMM dd, yyyy')}
          </div>
        ),
      },
      {
        accessorKey: 'valid_until',
        header: 'Valid Until',
        cell: ({ row }) => {
          const validUntil = new Date(row.getValue('valid_until'));
          const isExpired = validUntil < new Date();
          return (
            <div className={`text-sm ${isExpired ? 'text-red-600' : ''}`}>
              {format(validUntil, 'MMM dd, yyyy')}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const quote = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleViewQuote(quote)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                {quote.status === QuoteStatus.DRAFT && (
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate(quote, QuoteStatus.SENT)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </DropdownMenuItem>
                )}
                {quote.status === QuoteStatus.SENT && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(quote, QuoteStatus.APPROVED)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusUpdate(quote, QuoteStatus.REJECTED)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedQuote(quote);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [updateQuoteMutation]
  );

  const table = useReactTable({
    data: quotesData?.quotes || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading quotes</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
          <p className="text-gray-600">
            Manage quotes and approval workflows ({quotesData?.quotes.length || 0} quotes)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-gray-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold">
                  {quotesData?.quotes.filter(q => q.status === QuoteStatus.DRAFT).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold">
                  {quotesData?.quotes.filter(q => q.status === QuoteStatus.SENT).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold">
                  {quotesData?.quotes.filter(q => q.status === QuoteStatus.APPROVED).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">
                  ${quotesData?.quotes
                    .filter(q => q.status === QuoteStatus.APPROVED)
                    .reduce((sum, q) => sum + q.total_amount, 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 0 }) || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search quotes..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={QuoteStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={QuoteStatus.SENT}>Sent</SelectItem>
                  <SelectItem value={QuoteStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={QuoteStatus.REJECTED}>Rejected</SelectItem>
                  <SelectItem value={QuoteStatus.EXPIRED}>Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No quotes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of{' '}
              {quotesData?.meta?.total || 0} quotes
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details - {selectedQuote?.quote_number}</DialogTitle>
            <DialogDescription>
              View quote information and line items
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Customer Information
                  </h3>
                  {selectedQuote.customer ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>{selectedQuote.customer.first_name} {selectedQuote.customer.last_name}</strong>
                      </div>
                      {selectedQuote.customer.company_name && (
                        <div>{selectedQuote.customer.company_name}</div>
                      )}
                      <div>{selectedQuote.customer.email}</div>
                      {selectedQuote.customer.phone && (
                        <div>{selectedQuote.customer.phone}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">No customer information</div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Quote Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={getStatusBadgeVariant(selectedQuote.status)}>
                        {selectedQuote.status.charAt(0).toUpperCase() + selectedQuote.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{format(new Date(selectedQuote.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Until:</span>
                      <span>{format(new Date(selectedQuote.valid_until), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote Items */}
              {selectedQuote.quote_items && selectedQuote.quote_items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Quote Items</h3>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuote.quote_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {item.product_variant?.product?.name || 'Unknown Product'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {item.product_variant?.color_option?.display_name} - {item.box_material?.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>${item.line_total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Quote Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${selectedQuote.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedQuote.discount_amount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount:</span>
                        <span>-${selectedQuote.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${selectedQuote.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>${selectedQuote.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedQuote.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedQuote.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete quote "{selectedQuote?.quote_number}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedQuote) {
                  deleteQuoteMutation.mutate(selectedQuote.id);
                }
              }}
              disabled={deleteQuoteMutation.isPending}
            >
              {deleteQuoteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotesPage;