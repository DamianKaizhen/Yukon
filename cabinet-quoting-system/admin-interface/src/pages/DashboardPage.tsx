import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  Users,
  FileText,
  TrendingUp,
  Activity,
  Database,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['systemStats'],
    queryFn: () => apiClient.getSystemStats(),
  });

  const { data: systemInfo, isLoading: infoLoading } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => apiClient.getSystemInfo(),
  });

  if (statsLoading || infoLoading) {
    return <LoadingSpinner />;
  }

  // Mock data for charts - replace with real data from API
  const monthlyData = [
    { month: 'Jan', quotes: 45, customers: 12 },
    { month: 'Feb', quotes: 52, customers: 15 },
    { month: 'Mar', quotes: 38, customers: 8 },
    { month: 'Apr', quotes: 61, customers: 18 },
    { month: 'May', quotes: 55, customers: 14 },
    { month: 'Jun', quotes: 67, customers: 22 },
  ];

  const quoteStatusData = [
    { name: 'Draft', value: systemStats?.pending_quotes || 0, color: '#8B5CF6' },
    { name: 'Sent', value: 15, color: '#3B82F6' },
    { name: 'Approved', value: 25, color: '#10B981' },
    { name: 'Rejected', value: 5, color: '#EF4444' },
  ];

  const statCards = [
    {
      title: 'Total Products',
      value: systemStats?.total_products || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Customers',
      value: systemStats?.total_customers || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Quotes',
      value: systemStats?.total_quotes || 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Recent Quotes',
      value: systemStats?.recent_quotes || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the Cabinet Quoting System Admin Panel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quotes" fill="#3B82F6" name="Quotes" />
                <Bar dataKey="customers" fill="#10B981" name="New Customers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quote Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={quoteStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {quoteStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Environment</span>
              <span className="text-sm text-gray-600">{systemInfo?.environment}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Version</span>
              <span className="text-sm text-gray-600">{systemInfo?.version}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Uptime</span>
              <span className="text-sm text-gray-600">
                {systemInfo?.uptime ? Math.floor(systemInfo.uptime / 3600) : 0} hours
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database</span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                systemInfo?.database_status === 'healthy' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {systemInfo?.database_status || 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Used Memory</span>
                <span className="text-sm text-gray-600">
                  {systemInfo?.memory_usage?.used 
                    ? `${(systemInfo.memory_usage.used / 1024 / 1024).toFixed(1)} MB`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Memory</span>
                <span className="text-sm text-gray-600">
                  {systemInfo?.memory_usage?.total 
                    ? `${(systemInfo.memory_usage.total / 1024 / 1024).toFixed(1)} MB`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${systemInfo?.memory_usage?.percentage || 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {systemInfo?.memory_usage?.percentage?.toFixed(1) || 0}% used
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;