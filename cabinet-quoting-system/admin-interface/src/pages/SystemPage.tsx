import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  HardDrive,
  Cpu,
  Clock,
  FileText,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';

const SystemPage: React.FC = () => {
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch system information
  const { data: systemInfo, isLoading: infoLoading } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => apiClient.getSystemInfo(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => apiClient.getSystemHealth(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => apiClient.getBackups(),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => apiClient.getLogs({ limit: 50 }),
  });

  const { data: errorLogs, isLoading: errorLogsLoading } = useQuery({
    queryKey: ['errorLogs'],
    queryFn: () => apiClient.getErrorLogs(),
  });

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: () => apiClient.createBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup created successfully');
    },
    onError: () => {
      toast.error('Failed to create backup');
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) => apiClient.restoreBackup(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Backup restored successfully');
      setIsRestoreDialogOpen(false);
      setSelectedBackup(null);
    },
    onError: () => {
      toast.error('Failed to restore backup');
    },
  });

  const vacuumDatabaseMutation = useMutation({
    mutationFn: () => apiClient.vacuumDatabase(),
    onSuccess: () => {
      toast.success('Database vacuum completed');
    },
    onError: () => {
      toast.error('Failed to vacuum database');
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => apiClient.clearLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['errorLogs'] });
      toast.success('Logs cleared successfully');
    },
    onError: () => {
      toast.error('Failed to clear logs');
    },
  });

  const getHealthBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Healthy
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Warning
          </Badge>
        );
      case 'error':
      case 'unhealthy':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLogLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warn':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
      case 'debug':
        return <Badge variant="secondary">Debug</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
        <p className="text-gray-600">Monitor system health and perform maintenance operations</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Server className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Environment</p>
                    <p className="text-2xl font-bold">{systemInfo?.environment || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Version</p>
                    <p className="text-2xl font-bold">{systemInfo?.version || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Uptime</p>
                    <p className="text-2xl font-bold">
                      {systemInfo?.uptime ? Math.floor(systemInfo.uptime / 3600) : 0}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Database</p>
                    <p className="text-lg font-bold">
                      {getHealthBadge(systemInfo?.database_status || 'unknown')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Memory Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="mr-2 h-5 w-5" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Used Memory</span>
                  <span>
                    {systemInfo?.memory_usage?.used 
                      ? `${(systemInfo.memory_usage.used / 1024 / 1024).toFixed(1)} MB`
                      : 'N/A'
                    } / 
                    {systemInfo?.memory_usage?.total 
                      ? `${(systemInfo.memory_usage.total / 1024 / 1024).toFixed(1)} MB`
                      : 'N/A'
                    }
                  </span>
                </div>
                <Progress 
                  value={systemInfo?.memory_usage?.percentage || 0} 
                  className="w-full" 
                />
                <p className="text-sm text-gray-500 text-center">
                  {systemInfo?.memory_usage?.percentage?.toFixed(1) || 0}% used
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {/* Health Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  System Health
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['systemHealth'] })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <LoadingSpinner />
              ) : systemHealth ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Status</span>
                    {getHealthBadge(systemHealth.status)}
                  </div>
                  {systemHealth.details && Object.entries(systemHealth.details).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-sm text-gray-600">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Health check data unavailable</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          {/* Database Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Backup Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Database Backups
                  </div>
                  <Button
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {createBackupMutation.isPending ? 'Creating...' : 'Create Backup'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {backupsLoading ? (
                  <LoadingSpinner />
                ) : backups && backups.length > 0 ? (
                  <div className="space-y-2">
                    {backups.slice(0, 5).map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{backup.filename}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(backup.created_at), 'MMM dd, yyyy HH:mm')} • 
                            {(backup.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setIsRestoreDialogOpen(true);
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No backups found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="mr-2 h-5 w-5" />
                  Database Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded">
                  <h4 className="font-medium mb-2">Vacuum Database</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Optimize database performance by reclaiming storage space and updating statistics.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => vacuumDatabaseMutation.mutate()}
                    disabled={vacuumDatabaseMutation.isPending}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {vacuumDatabaseMutation.isPending ? 'Running...' : 'Vacuum Database'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Log Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Recent Logs
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearLogsMutation.mutate()}
                    disabled={clearLogsMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Logs
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <LoadingSpinner />
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map((log, index) => (
                      <div key={index} className="p-2 border rounded text-sm">
                        <div className="flex items-center justify-between mb-1">
                          {getLogLevelBadge(log.level)}
                          <span className="text-xs text-gray-500">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                        <div className="text-gray-700">{log.message}</div>
                        {log.source && (
                          <div className="text-xs text-gray-500 mt-1">Source: {log.source}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No logs found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Error Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errorLogsLoading ? (
                  <LoadingSpinner />
                ) : errorLogs && errorLogs.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {errorLogs.map((log, index) => (
                      <div key={index} className="p-2 border border-red-200 rounded text-sm bg-red-50">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="destructive">Error</Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(log.timestamp), 'MMM dd HH:mm:ss')}
                          </span>
                        </div>
                        <div className="text-red-700">{log.message}</div>
                        {log.source && (
                          <div className="text-xs text-red-500 mt-1">Source: {log.source}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-300 mb-4" />
                    <p>No recent errors</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Database Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore the backup "{selectedBackup?.filename}"? 
              This will replace all current data and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedBackup) {
                  restoreBackupMutation.mutate(selectedBackup.id);
                }
              }}
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemPage;