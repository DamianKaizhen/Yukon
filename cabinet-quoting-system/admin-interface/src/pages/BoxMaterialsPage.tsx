import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { apiClient } from '@/services/api';
import { BoxMaterial } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/LoadingSpinner';

const boxMaterialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean(),
  sort_order: z.number().min(0),
});

type BoxMaterialFormValues = z.infer<typeof boxMaterialSchema>;

const BoxMaterialsPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedBoxMaterial, setSelectedBoxMaterial] = useState<BoxMaterial | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch box materials
  const {
    data: boxMaterials = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-box-materials'],
    queryFn: () => apiClient.getBoxMaterials(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: BoxMaterialFormValues) => apiClient.createBoxMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-box-materials'] });
      toast.success('Box material created successfully');
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast.error('Failed to create box material');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BoxMaterialFormValues }) =>
      apiClient.updateBoxMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-box-materials'] });
      toast.success('Box material updated successfully');
      setIsEditDialogOpen(false);
      setSelectedBoxMaterial(null);
    },
    onError: () => {
      toast.error('Failed to update box material');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteBoxMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-box-materials'] });
      toast.success('Box material deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedBoxMaterial(null);
    },
    onError: () => {
      toast.error('Failed to delete box material');
    },
  });

  // Forms
  const createForm = useForm<BoxMaterialFormValues>({
    resolver: zodResolver(boxMaterialSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      is_active: true,
      sort_order: 0,
    },
  });

  const editForm = useForm<BoxMaterialFormValues>({
    resolver: zodResolver(boxMaterialSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      is_active: true,
      sort_order: 0,
    },
  });

  const handleEdit = (boxMaterial: BoxMaterial) => {
    setSelectedBoxMaterial(boxMaterial);
    editForm.reset({
      code: boxMaterial.code,
      name: boxMaterial.name,
      description: boxMaterial.description || '',
      is_active: boxMaterial.is_active,
      sort_order: boxMaterial.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const onCreateSubmit = (values: BoxMaterialFormValues) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: BoxMaterialFormValues) => {
    if (selectedBoxMaterial) {
      updateMutation.mutate({
        id: selectedBoxMaterial.id,
        data: values,
      });
    }
  };

  // Table columns
  const columns: ColumnDef<BoxMaterial>[] = useMemo(
    () => [
      {
        accessorKey: 'sort_order',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 h-auto font-medium"
            >
              Order
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="text-center">{row.getValue('sort_order')}</div>
        ),
        size: 80,
      },
      {
        accessorKey: 'code',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 h-auto font-medium"
            >
              Code
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-mono text-sm">{row.getValue('code')}</div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('name')}</div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => {
          const description = row.getValue('description') as string;
          return description ? (
            <div className="max-w-[300px] truncate">{description}</div>
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
          const boxMaterial = row.original;
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
                <DropdownMenuItem onClick={() => handleEdit(boxMaterial)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedBoxMaterial(boxMaterial);
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
    data: boxMaterials,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading box materials</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Box Materials</h1>
          <p className="text-gray-600">
            Manage cabinet box material types and construction ({boxMaterials.length} total)
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Box Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Box Material</DialogTitle>
              <DialogDescription>
                Add a new box material type for cabinet construction.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., plywood" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Premium Plywood" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Optional description..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

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
              placeholder="Search box materials..."
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
            <Package className="mr-2 h-5 w-5" />
            Box Materials
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
                      No box materials found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Box Material</DialogTitle>
            <DialogDescription>
              Update the box material information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                      </div>
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
            <DialogTitle>Delete Box Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedBoxMaterial?.name}"? This action
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
                if (selectedBoxMaterial) {
                  deleteMutation.mutate(selectedBoxMaterial.id);
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

export default BoxMaterialsPage;