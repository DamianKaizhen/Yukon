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
  UserCog,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  Shield,
  Key,
  Mail,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { apiClient } from '@/services/api';
import { User, UserRole, SearchParams } from '@/types';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/LoadingSpinner';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  is_active: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return 'destructive';
    case UserRole.SALES:
      return 'default';
    case UserRole.VIEWER:
      return 'secondary';
    default:
      return 'secondary';
  }
};

const UsersPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['users', pagination, globalFilter, columnFilters],
    queryFn: () => {
      const params: SearchParams = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: globalFilter || undefined,
      };
      return apiClient.getUsers(params);
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: Partial<User> & { password: string }) => apiClient.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      apiClient.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => apiClient.resetUserPassword(id),
    onSuccess: (data) => {
      setResetPasswordResult(data.temporary_password);
      toast.success('Password reset successfully');
    },
    onError: () => {
      toast.error('Failed to reset password');
    },
  });

  // Form handling
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: UserRole.VIEWER,
      password: '',
      is_active: true,
    },
  });

  const handleCreate = () => {
    form.reset({
      email: '',
      first_name: '',
      last_name: '',
      role: UserRole.VIEWER,
      password: '',
      is_active: true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    form.reset({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (values: UserFormValues) => {
    if (selectedUser) {
      const { password, ...updateData } = values;
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: updateData,
      });
    } else {
      if (values.password) {
        createUserMutation.mutate(values as UserFormValues & { password: string });
      }
    }
  };

  // Table columns
  const columns: ColumnDef<User>[] = useMemo(
    () => [
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
          const user = row.original;
          return (
            <div>
              <div className="font-medium">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-sm text-gray-500 flex items-center">
                <Mail className="mr-1 h-3 w-3" />
                {user.email}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const role = row.getValue('role') as UserRole;
          return (
            <Badge variant={getRoleBadgeVariant(role)} className="flex items-center gap-1 w-fit">
              <Shield className="h-3 w-3" />
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
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
        accessorKey: 'last_login',
        header: 'Last Login',
        cell: ({ row }) => {
          const lastLogin = row.getValue('last_login') as Date | null;
          return lastLogin ? (
            <div className="text-sm flex items-center">
              <Calendar className="mr-1 h-3 w-3" />
              {format(new Date(lastLogin), 'MMM dd, yyyy')}
            </div>
          ) : (
            <span className="text-gray-400">Never</span>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <div className="text-sm">
            {format(new Date(row.getValue('created_at')), 'MMM dd, yyyy')}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original;
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
                <DropdownMenuItem onClick={() => handleEdit(user)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => resetPasswordMutation.mutate(user.id)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(user);
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
    [resetPasswordMutation]
  );

  const table = useReactTable({
    data: usersData?.users || [],
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
  if (error) return <div>Error loading users</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage admin users and permissions ({usersData?.users.length || 0} users)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Password Reset Result */}
      {resetPasswordResult && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            Password reset successfully. Temporary password: <strong>{resetPasswordResult}</strong>
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => setResetPasswordResult(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={(table.getColumn('role')?.getFilterValue() as string) ?? 'all'}
                onValueChange={(value) =>
                  table.getColumn('role')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                  <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCog className="mr-2 h-5 w-5" />
            Users
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
                      No users found.
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
              {usersData?.meta?.total || 0} users
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

      {/* Create/Edit User Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        if (!open) {
          setSelectedUser(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Edit User' : 'Create User'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Update the user information below.'
                : 'Add a new user to the system.'}
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                        <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                        <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!selectedUser && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending
                    ? 'Saving...'
                    : selectedUser
                    ? 'Save Changes'
                    : 'Create User'}
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
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedUser?.first_name} {selectedUser?.last_name}"? This action
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
                if (selectedUser) {
                  deleteUserMutation.mutate(selectedUser.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;