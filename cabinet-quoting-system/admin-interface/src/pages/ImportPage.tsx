import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { apiClient } from '@/services/api';
import { CSVImportResult, ImportHistory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/LoadingSpinner';

type ImportType = 'products' | 'customers' | 'pricing';

interface ImportState {
  isUploading: boolean;
  uploadProgress: number;
  result: CSVImportResult | null;
  error: string | null;
}

const ImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ImportType>('products');
  const [importStates, setImportStates] = useState<Record<ImportType, ImportState>>({
    products: { isUploading: false, uploadProgress: 0, result: null, error: null },
    customers: { isUploading: false, uploadProgress: 0, result: null, error: null },
    pricing: { isUploading: false, uploadProgress: 0, result: null, error: null },
  });

  const queryClient = useQueryClient();

  // Fetch import history
  const { data: importHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['importHistory'],
    queryFn: () => apiClient.getImportHistory(),
  });

  // Import mutations
  const importMutations = {
    products: useMutation({
      mutationFn: (file: File) => apiClient.importProducts(file),
      onSuccess: (result) => handleImportSuccess('products', result),
      onError: (error) => handleImportError('products', error),
    }),
    customers: useMutation({
      mutationFn: (file: File) => apiClient.importCustomers(file),
      onSuccess: (result) => handleImportSuccess('customers', result),
      onError: (error) => handleImportError('customers', error),
    }),
    pricing: useMutation({
      mutationFn: (file: File) => apiClient.importPricing(file),
      onSuccess: (result) => handleImportSuccess('pricing', result),
      onError: (error) => handleImportError('pricing', error),
    }),
  };

  const handleImportSuccess = (type: ImportType, result: CSVImportResult) => {
    setImportStates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        isUploading: false,
        result,
        error: null,
      },
    }));
    queryClient.invalidateQueries({ queryKey: ['importHistory'] });
    toast.success(`${type} imported successfully`);
  };

  const handleImportError = (type: ImportType, error: any) => {
    setImportStates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        isUploading: false,
        error: error.message || 'Import failed',
      },
    }));
    toast.error(`Failed to import ${type}`);
  };

  // Download template
  const handleDownloadTemplate = async (type: ImportType) => {
    try {
      const blob = await apiClient.getImportTemplate(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}-template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} template downloaded`);
    } catch {
      toast.error(`Failed to download ${type} template`);
    }
  };

  // File drop handling
  const onDrop = useCallback(
    (acceptedFiles: File[], type: ImportType) => {
      const file = acceptedFiles[0];
      if (file) {
        setImportStates(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            isUploading: true,
            uploadProgress: 0,
            result: null,
            error: null,
          },
        }));
        importMutations[type].mutate(file);
      }
    },
    [importMutations]
  );

  // Create dropzone for each import type
  const createDropzone = (type: ImportType) => {
    return useDropzone({
      onDrop: (files) => onDrop(files, type),
      accept: {
        'text/csv': ['.csv'],
        'application/vnd.ms-excel': ['.csv'],
      },
      maxFiles: 1,
      disabled: importStates[type].isUploading,
    });
  };

  const dropzones = {
    products: createDropzone('products'),
    customers: createDropzone('customers'),
    pricing: createDropzone('pricing'),
  };

  const renderImportCard = (type: ImportType, title: string, description: string) => {
    const state = importStates[type];
    const dropzone = dropzones[type];
    const mutation = importMutations[type];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              {title}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate(type)}
            >
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm">{description}</p>

          {/* Drop Zone */}
          <div
            {...dropzone.getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dropzone.isDragActive
                ? 'border-blue-400 bg-blue-50'
                : state.isUploading
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-gray-400 cursor-pointer'
            }`}
          >
            <input {...dropzone.getInputProps()} />
            {state.isUploading ? (
              <div className="space-y-2">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Uploading and processing...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    {dropzone.isDragActive
                      ? `Drop the ${type} CSV file here`
                      : `Drag & drop a ${type} CSV file here, or click to select`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">CSV files only</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {mutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>Please wait</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Results */}
          {state.result && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Import completed successfully!</div>
                  <div className="text-sm">
                    Total: {state.result.total_rows}, 
                    Imported: {state.result.imported_rows}, 
                    Failed: {state.result.failed_rows}
                  </div>
                  {state.result.errors.length > 0 && (
                    <div className="text-sm text-red-600 mt-2">
                      <div className="font-medium">Errors:</div>
                      <ul className="list-disc list-inside">
                        {state.result.errors.slice(0, 3).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {state.result.errors.length > 3 && (
                          <li>... and {state.result.errors.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {state.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Import failed</div>
                <div className="text-sm">{state.error}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
        <p className="text-gray-600">Import data from CSV files with validation and progress tracking</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ImportType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {renderImportCard(
            'products',
            'Import Products',
            'Upload a CSV file containing product information including item codes, names, dimensions, and specifications.'
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {renderImportCard(
            'customers',
            'Import Customers',
            'Upload a CSV file containing customer information including contact details, addresses, and company information.'
          )}
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          {renderImportCard(
            'pricing',
            'Import Pricing',
            'Upload a CSV file containing pricing information for product variants and box materials.'
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                Import History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <LoadingSpinner />
              ) : importHistory && importHistory.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.filename}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Total: {item.total_rows}</div>
                              <div>Imported: {item.imported_rows}</div>
                              {item.failed_rows > 0 && (
                                <div className="text-red-600">Failed: {item.failed_rows}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No import history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportPage;