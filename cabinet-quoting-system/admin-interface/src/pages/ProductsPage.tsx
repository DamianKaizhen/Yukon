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
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/services/api';
import { Product, SearchParams } from '@/types';
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
  DialogTrigger,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  item_code: z.string().min(1, 'Item code is required'),
  description: z.string().optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  depth: z.number().min(0).optional(),
  door_count: z.number().min(0).optional(),
  drawer_count: z.number().min(0).optional(),
  is_left_right: z.boolean(),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const ProductsPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch products with search and pagination
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', pagination, globalFilter, columnFilters],
    queryFn: () => {
      const params: SearchParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter || undefined,
      };
      return apiClient.getProducts(params);
    },
  });

  // Mutations
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      apiClient.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: () => {
      toast.error('Failed to update product');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });

  // Export functionality
  const handleExport = async () => {
    try {
      const blob = await apiClient.exportProducts();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Products exported successfully');
    } catch {
      toast.error('Failed to export products');
    }
  };

  // Form handling
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      item_code: '',
      description: '',
      is_left_right: false,
      is_active: true,
    },
  });

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    form.reset({
      name: product.name,
      item_code: product.item_code,
      description: product.description || '',
      width: product.width || undefined,
      height: product.height || undefined,
      depth: product.depth || undefined,
      door_count: product.door_count || undefined,
      drawer_count: product.drawer_count || undefined,
      is_left_right: product.is_left_right,
      is_active: product.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (values: ProductFormValues) => {
    if (selectedProduct) {
      updateProductMutation.mutate({
        id: selectedProduct.id,
        data: values,
      });
    }
  };

  // Table columns
  const columns: ColumnDef<Product>[] = useMemo(
    () => [
      {
        accessorKey: 'item_code',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 h-auto font-medium"
            >
              Item Code
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue('item_code')}</div>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 h-auto font-medium"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate">{row.getValue('name')}</div>
        ),
      },
      {
        accessorKey: 'cabinet_type.name',
        header: 'Type',
        cell: ({ row }) => {
          const cabinetType = row.original.cabinet_type;
          return cabinetType ? (
            <Badge variant="outline">{cabinetType.name}</Badge>
          ) : (
            <span className="text-gray-400">-</span>
          );
        },
      },
      {
        id: 'dimensions',
        header: 'Dimensions',
        cell: ({ row }) => {
          const { width, height, depth } = row.original;
          if (!width && !height && !depth) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="text-sm">
              {width && `W: ${width}"`}
              {height && ` H: ${height}"`}
              {depth && ` D: ${depth}"`}
            </div>
          );
        },
      },
      {
        id: 'counts',
        header: 'Doors/Drawers',
        cell: ({ row }) => {
          const { door_count, drawer_count } = row.original;
          if (!door_count && !drawer_count) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="text-sm">
              {door_count && `${door_count} doors`}
              {door_count && drawer_count && ', '}
              {drawer_count && `${drawer_count} drawers`}
            </div>
          );
        },
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
            {row.getValue('is_active') ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const product = row.original;
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
                <DropdownMenuItem onClick={() => handleEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedProduct(product);
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
    []
  );

  const table = useReactTable({
    data: productsData?.products || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true, // Enable server-side pagination
    pageCount: productsData?.meta?.pages || 0, // Total pages from server
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
  if (error) return <div>Error loading products</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
          <p className="text-gray-600">
            Manage your cabinet inventory ({productsData?.meta?.total || 0} products)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={(table.getColumn('is_active')?.getFilterValue() as string) ?? 'all'}
                onValueChange={(value) =>
                  table.getColumn('is_active')?.setFilterValue(value === 'all' ? '' : value === 'active')
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Products
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
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.pageIndex * pagination.pageSize) + 1} to{' '}
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, productsData?.meta?.total || 0)} of{' '}
              {productsData?.meta?.total || 0} products
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(value) => {
                  setPagination(prev => ({
                    ...prev,
                    pageSize: Number(value),
                    pageIndex: 0 // Reset to first page when changing page size
                  }));
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                Page {pagination.pageIndex + 1} of {productsData?.meta?.pages || 1}
              </div>
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

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="item_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width (inches)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (inches)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depth (inches)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="door_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Door Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="drawer_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drawer Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action
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
                if (selectedProduct) {
                  deleteProductMutation.mutate(selectedProduct.id);
                }
              }}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;