import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from '@tanstack/react-table';
import {
  DollarSign,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  Calendar,
  Package,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { apiClient } from '@/services/api';
import { ProductPricing, ProductVariantForPricing, BoxMaterial } from '@/types';
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
import LoadingSpinner from '@/components/LoadingSpinner';

const pricingSchema = z.object({
  product_variant_id: z.string().min(1, 'Product variant is required'),
  box_material_id: z.string().min(1, 'Box material is required'),
  price: z.number().min(0, 'Price must be positive'),
  effective_date: z.string(),
  expiration_date: z.string().optional(),
});

type PricingFormValues = z.infer<typeof pricingSchema>;

const PricingPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [selectedPricing, setSelectedPricing] = useState<ProductPricing | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch pricing with pagination
  const {
    data: pricingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-pricing', pagination.pageIndex + 1, pagination.pageSize, globalFilter],
    queryFn: () => apiClient.getPricing({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: globalFilter,
    }),
  });

  // Fetch product variants for dropdowns
  const { data: productVariants = [] } = useQuery({
    queryKey: ['admin-product-variants'],
    queryFn: () => apiClient.getProductVariants(),
  });

  // Fetch box materials for dropdowns
  const { data: boxMaterials = [] } = useQuery({
    queryKey: ['admin-box-materials'],
    queryFn: () => apiClient.getBoxMaterials(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: PricingFormValues) => apiClient.createPricing({
      ...data,
      box_material_id: parseInt(data.box_material_id),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      toast.success('Pricing created successfully');
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast.error('Failed to create pricing');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingFormValues> }) =>
      apiClient.updatePricing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      toast.success('Pricing updated successfully');
      setIsEditDialogOpen(false);
      setSelectedPricing(null);
    },
    onError: () => {
      toast.error('Failed to update pricing');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePricing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing'] });
      toast.success('Pricing deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedPricing(null);
    },
    onError: () => {
      toast.error('Failed to delete pricing');
    },
  });

  // Forms
  const createForm = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      product_variant_id: '',
      box_material_id: '',
      price: 0,
      effective_date: new Date().toISOString().split('T')[0],
      expiration_date: '',
    },
  });

  const editForm = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      product_variant_id: '',
      box_material_id: '',
      price: 0,
      effective_date: '',
      expiration_date: '',
    },
  });

  const handleEdit = (pricing: ProductPricing) => {
    setSelectedPricing(pricing);
    editForm.reset({
      product_variant_id: pricing.product_variant_id,
      box_material_id: pricing.box_material_id.toString(),
      price: pricing.price,
      effective_date: new Date(pricing.effective_date).toISOString().split('T')[0],
      expiration_date: pricing.expiration_date 
        ? new Date(pricing.expiration_date).toISOString().split('T')[0] 
        : '',
    });
    setIsEditDialogOpen(true);
  };

  const onCreateSubmit = (values: PricingFormValues) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: PricingFormValues) => {
    if (selectedPricing) {
      updateMutation.mutate({
        id: selectedPricing.id,
        data: {
          price: values.price,
          effective_date: values.effective_date,
          expiration_date: values.expiration_date || undefined,
        },
      });
    }
  };

  // Table columns
  const columns: ColumnDef<ProductPricing>[] = useMemo(
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
        accessorKey: 'product_name',
        header: 'Product',
        cell: ({ row }) => {
          const pricing = row.original;
          return (
            <div>
              <div className="font-medium">{pricing.product_name}</div>
              <div className="text-sm text-gray-500">
                {pricing.width_inches}"W × {pricing.height_inches}"H × {pricing.depth_inches}"D
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'color_display_name',
        header: 'Color',
        cell: ({ row }) => (
          <div className="flex items-center">
            <Palette className="mr-2 h-4 w-4 text-gray-400" />
            {row.getValue('color_display_name')}
          </div>
        ),
      },
      {
        accessorKey: 'material_name',
        header: 'Material',
        cell: ({ row }) => (
          <div className="flex items-center">
            <Package className="mr-2 h-4 w-4 text-gray-400" />
            {row.getValue('material_name')}
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 h-auto font-medium"
            >
              Price
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-semibold text-green-600">
            ${row.getValue<number>('price').toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: 'effective_date',
        header: 'Effective Date',
        cell: ({ row }) => (
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
            {new Date(row.getValue<string>('effective_date')).toLocaleDateString()}
          </div>
        ),
      },
      {
        accessorKey: 'expiration_date',
        header: 'Expires',
        cell: ({ row }) => {
          const expiration = row.getValue<string>('expiration_date');
          return expiration ? (
            <div className="text-sm text-gray-600">
              {new Date(expiration).toLocaleDateString()}
            </div>
          ) : (
            <Badge variant="outline">No Expiry</Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const pricing = row.original;
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
                <DropdownMenuItem onClick={() => handleEdit(pricing)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedPricing(pricing);
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
    data: pricingData?.pricing || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: pricingData?.meta?.pages || 0,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading pricing data</div>;

  const ProductVariantSelector = ({ field }: any) => (
    <Select onValueChange={field.onChange} value={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="Select product variant" />
      </SelectTrigger>
      <SelectContent>
        {productVariants.map((variant) => (
          <SelectItem key={variant.id} value={variant.id}>
            {variant.item_code} - {variant.color_display_name} ({variant.width_inches}"W)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const BoxMaterialSelector = ({ field }: any) => (
    <Select onValueChange={field.onChange} value={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="Select box material" />
      </SelectTrigger>
      <SelectContent>
        {boxMaterials.map((material) => (
          <SelectItem key={material.id} value={material.id.toString()}>
            {material.name} ({material.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600">
            Manage product pricing across different materials and colors ({pricingData?.meta?.total || 0} total)
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Pricing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Pricing</DialogTitle>
              <DialogDescription>
                Add pricing for a product variant and material combination.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="product_variant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Variant</FormLabel>
                      <FormControl>
                        <ProductVariantSelector field={field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="box_material_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Box Material</FormLabel>
                      <FormControl>
                        <BoxMaterialSelector field={field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="effective_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="expiration_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by item code, product name, color, or material..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Product Pricing
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
                      No pricing records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-gray-500">
              Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pricingData?.meta?.total || 0)} of{' '}
              {pricingData?.meta?.total || 0} entries
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pricing</DialogTitle>
            <DialogDescription>
              Update the pricing information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
            <DialogTitle>Delete Pricing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pricing record for "{selectedPricing?.item_code} - {selectedPricing?.color_display_name} - {selectedPricing?.material_name}"? This action cannot be undone.
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
                if (selectedPricing) {
                  deleteMutation.mutate(selectedPricing.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricingPage;