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
  Users,
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  Building,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { apiClient } from '@/services/api';
import { Customer, SearchParams } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import LoadingSpinner from '@/components/LoadingSpinner';

const customerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  customer_number: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

const CustomersPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch customers
  const {
    data: customersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customers', pagination, globalFilter, columnFilters],
    queryFn: () => {
      const params: SearchParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter || undefined,
      };
      return apiClient.getCustomers(params);
    },
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => apiClient.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error('Failed to create customer');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      apiClient.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: () => {
      toast.error('Failed to update customer');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: () => {
      toast.error('Failed to delete customer');
    },
  });

  // Export functionality
  const handleExport = async () => {
    try {
      const blob = await apiClient.exportCustomers();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Customers exported successfully');
    } catch {
      toast.error('Failed to export customers');
    }
  };

  // Form handling
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      customer_number: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
      notes: '',
      is_active: true,
    },
  });

  const handleCreate = () => {
    form.reset();
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.reset({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone || '',
      company_name: customer.company_name || '',
      customer_number: customer.customer_number || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state_province: customer.state_province || '',
      postal_code: customer.postal_code || '',
      country: customer.country || '',
      notes: customer.notes || '',
      is_active: customer.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (values: CustomerFormValues) => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({
        id: selectedCustomer.id,
        data: values,
      });
    } else {
      createCustomerMutation.mutate(values);
    }
  };

  // Table columns
  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      {
        accessorKey: 'customer_number',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 h-auto font-medium"
          >
            Customer #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-mono text-sm">
            {row.getValue('customer_number') || '-'}
          </div>
        ),
      },
      {
        id: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 h-auto font-medium"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div>
              <div className="font-medium">
                {customer.first_name} {customer.last_name}
              </div>
              {customer.company_name && (
                <div className="text-sm text-gray-500 flex items-center">
                  <Building className="mr-1 h-3 w-3" />
                  {customer.company_name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Contact',
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <Mail className="mr-1 h-3 w-3" />
                {customer.email}
              </div>
              {customer.phone && (
                <div className="flex items-center text-sm text-gray-500">
                  <Phone className="mr-1 h-3 w-3" />
                  {customer.phone}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => {
          const customer = row.original;
          const location = [customer.city, customer.state_province, customer.country]
            .filter(Boolean)
            .join(', ');
          return location ? (
            <div className="flex items-center text-sm">
              <MapPin className="mr-1 h-3 w-3" />
              {location}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
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
          const customer = row.original;
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
                <DropdownMenuItem onClick={() => handleEdit(customer)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCustomer(customer);
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
    data: customersData?.customers || [],
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
  if (error) return <div>Error loading customers</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">
            Manage customer accounts ({customersData?.customers.length || 0} customers)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
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
                  placeholder="Search customers..."
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

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Customers
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
                      No customers found.
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
              {customersData?.meta?.total || 0} customers
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

      {/* Create/Edit Customer Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        if (!open) {
          setSelectedCustomer(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? 'Edit Customer' : 'Create Customer'}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer
                ? 'Update the customer information below.'
                : 'Add a new customer to the system.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Number</FormLabel>
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
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state_province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedCustomer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending || updateCustomerMutation.isPending
                    ? 'Saving...'
                    : selectedCustomer
                    ? 'Save Changes'
                    : 'Create Customer'}
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
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCustomer?.first_name} {selectedCustomer?.last_name}"? This action
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
                if (selectedCustomer) {
                  deleteCustomerMutation.mutate(selectedCustomer.id);
                }
              }}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;