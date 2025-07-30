import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '../../../admin-interface/src/pages/DashboardPage';
import { BrowserRouter } from 'react-router-dom';

// Mock the API service
jest.mock('../../../admin-interface/src/services/api', () => ({
  getDashboardStats: jest.fn(),
  getRecentQuotes: jest.fn(),
  getRecentCustomers: jest.fn(),
  getSystemHealth: jest.fn(),
}));

// Mock chart components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockApi = require('../../../admin-interface/src/services/api');

const MockedDashboardPage = () => (
  <BrowserRouter>
    <DashboardPage />
  </BrowserRouter>
);

describe('Admin Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockApi.getDashboardStats.mockResolvedValue({
      totalQuotes: 1250,
      totalCustomers: 485,
      totalRevenue: 284750.50,
      avgQuoteValue: 2278.00,
      quotesThisMonth: 87,
      customersThisMonth: 23,
      revenueThisMonth: 45890.25,
      quotesToday: 12,
      quoteConversionRate: 65.5,
      topProducts: [
        { name: 'Base Cabinet 36"', count: 145 },
        { name: 'Wall Cabinet 30"', count: 132 },
        { name: 'Tall Cabinet 18"', count: 98 }
      ]
    });

    mockApi.getRecentQuotes.mockResolvedValue([
      {
        id: 1,
        quoteNumber: 'Q-2024-001',
        customerName: 'John Doe',
        projectName: 'Kitchen Renovation',
        total: 2450.00,
        status: 'pending',
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        quoteNumber: 'Q-2024-002',
        customerName: 'Jane Smith',
        projectName: 'Bathroom Remodel',
        total: 1890.00,
        status: 'approved',
        createdAt: '2024-01-15T09:30:00Z'
      }
    ]);

    mockApi.getRecentCustomers.mockResolvedValue([
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        companyName: 'Doe Construction',
        totalQuotes: 3,
        totalValue: 7350.00,
        registeredAt: '2024-01-10T14:00:00Z'
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        companyName: 'Smith Interiors',
        totalQuotes: 1,
        totalValue: 1890.00,
        registeredAt: '2024-01-12T11:30:00Z'
      }
    ]);

    mockApi.getSystemHealth.mockResolvedValue({
      status: 'healthy',
      uptime: '15d 4h 23m',
      memoryUsage: 68.5,
      cpuUsage: 23.2,
      diskUsage: 45.8,
      activeConnections: 127,
      responseTime: 145,
      lastBackup: '2024-01-15T02:00:00Z'
    });
  });

  describe('Dashboard Layout and Navigation', () => {
    it('renders dashboard with all main sections', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('System Health')).toBeInTheDocument();
      });
    });

    it('displays key performance indicators', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Total quotes
        expect(screen.getByText('485')).toBeInTheDocument(); // Total customers
        expect(screen.getByText('$284,750.50')).toBeInTheDocument(); // Total revenue
        expect(screen.getByText('$2,278.00')).toBeInTheDocument(); // Avg quote value
      });
    });

    it('shows monthly statistics', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('87')).toBeInTheDocument(); // Quotes this month
        expect(screen.getByText('23')).toBeInTheDocument(); // Customers this month
        expect(screen.getByText('$45,890.25')).toBeInTheDocument(); // Revenue this month
      });
    });

    it('displays today\'s activity', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument(); // Quotes today
        expect(screen.getByText('65.5%')).toBeInTheDocument(); // Conversion rate
      });
    });
  });

  describe('Charts and Analytics', () => {
    it('renders revenue chart', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('renders quote status distribution chart', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });

    it('renders top products chart', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByText('Base Cabinet 36"')).toBeInTheDocument();
        expect(screen.getByText('145')).toBeInTheDocument();
      });
    });

    it('allows switching chart time periods', async () => {
      const user = userEvent.setup();
      render(<MockedDashboardPage />);

      await waitFor(() => {
        const periodSelector = screen.getByLabelText(/time period/i);
        expect(periodSelector).toBeInTheDocument();
      });

      const periodSelector = screen.getByLabelText(/time period/i);
      await user.selectOptions(periodSelector, '30');

      // Should trigger API call with new period
      expect(mockApi.getDashboardStats).toHaveBeenCalledWith({ period: '30' });
    });
  });

  describe('Recent Activity Tables', () => {
    it('displays recent quotes table', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Quotes')).toBeInTheDocument();
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Kitchen Renovation')).toBeInTheDocument();
        expect(screen.getByText('$2,450.00')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('displays recent customers table', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Customers')).toBeInTheDocument();
        expect(screen.getByText('Doe Construction')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('$7,350.00')).toBeInTheDocument();
      });
    });

    it('allows navigation to detailed views', async () => {
      const user = userEvent.setup();
      render(<MockedDashboardPage />);

      await waitFor(() => {
        const viewAllQuotesButton = screen.getByRole('button', { name: /view all quotes/i });
        expect(viewAllQuotesButton).toBeInTheDocument();
      });

      const viewAllQuotesButton = screen.getByRole('button', { name: /view all quotes/i });
      await user.click(viewAllQuotesButton);

      // Should navigate to quotes page
      // In a real test, you would check router navigation
    });

    it('handles table sorting', async () => {
      const user = userEvent.setup();
      render(<MockedDashboardPage />);

      await waitFor(() => {
        const sortButton = screen.getByRole('button', { name: /sort by total/i });
        expect(sortButton).toBeInTheDocument();
      });

      const sortButton = screen.getByRole('button', { name: /sort by total/i });
      await user.click(sortButton);

      // Should sort the table data
      expect(mockApi.getRecentQuotes).toHaveBeenCalledWith({ sortBy: 'total', sortOrder: 'desc' });
    });
  });

  describe('System Health Monitoring', () => {
    it('displays system health status', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('System Health')).toBeInTheDocument();
        expect(screen.getByText('healthy')).toBeInTheDocument();
        expect(screen.getByText('15d 4h 23m')).toBeInTheDocument(); // Uptime
      });
    });

    it('shows resource usage metrics', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('68.5%')).toBeInTheDocument(); // Memory usage
        expect(screen.getByText('23.2%')).toBeInTheDocument(); // CPU usage
        expect(screen.getByText('45.8%')).toBeInTheDocument(); // Disk usage
      });
    });

    it('displays performance metrics', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('127')).toBeInTheDocument(); // Active connections
        expect(screen.getByText('145ms')).toBeInTheDocument(); // Response time
      });
    });

    it('shows backup status', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/last backup/i)).toBeInTheDocument();
        expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
      });
    });

    it('alerts for unhealthy system status', async () => {
      mockApi.getSystemHealth.mockResolvedValue({
        status: 'warning',
        memoryUsage: 95.5,
        cpuUsage: 89.2,
        diskUsage: 92.1
      });

      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('warning')).toBeInTheDocument();
        expect(screen.getByTestId('system-alert')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data automatically', async () => {
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(mockApi.getDashboardStats).toHaveBeenCalledTimes(1);
      });

      // Wait for auto-refresh interval
      await waitFor(() => {
        expect(mockApi.getDashboardStats).toHaveBeenCalledTimes(2);
      }, { timeout: 31000 }); // 30 second refresh interval
    });

    it('allows manual refresh', async () => {
      const user = userEvent.setup();
      render(<MockedDashboardPage />);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockApi.getDashboardStats).toHaveBeenCalledTimes(2);
      expect(mockApi.getRecentQuotes).toHaveBeenCalledTimes(2);
      expect(mockApi.getRecentCustomers).toHaveBeenCalledTimes(2);
      expect(mockApi.getSystemHealth).toHaveBeenCalledTimes(2);
    });

    it('shows loading states during refresh', async () => {
      const user = userEvent.setup();
      
      // Make API calls slow
      mockApi.getDashboardStats.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({}), 1000))
      );

      render(<MockedDashboardPage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockApi.getDashboardStats.mockRejectedValue(new Error('API Error'));
      mockApi.getRecentQuotes.mockRejectedValue(new Error('API Error'));

      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading dashboard data/i)).toBeInTheDocument();
      });
    });

    it('shows fallback content when data is unavailable', async () => {
      mockApi.getDashboardStats.mockResolvedValue(null);
      mockApi.getRecentQuotes.mockResolvedValue([]);

      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/no recent quotes/i)).toBeInTheDocument();
        expect(screen.getByText(/no recent customers/i)).toBeInTheDocument();
      });
    });

    it('retries failed requests', async () => {
      mockApi.getDashboardStats
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue({ totalQuotes: 1250 });

      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(mockApi.getDashboardStats).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(<MockedDashboardPage />);

      expect(container.firstChild).toHaveClass('dashboard-mobile');
    });

    it('shows condensed metrics on small screens', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('condensed-metrics')).toBeInTheDocument();
      });
    });

    it('collapses charts on small screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<MockedDashboardPage />);

      await waitFor(() => {
        const expandChartsButton = screen.getByRole('button', { name: /expand charts/i });
        expect(expandChartsButton).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders dashboard within acceptable time', async () => {
      const startTime = performance.now();
      
      render(<MockedDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('memoizes expensive calculations', () => {
      const { rerender } = render(<MockedDashboardPage />);

      // Re-render with same props
      rerender(<MockedDashboardPage />);

      // API should not be called again due to memoization
      expect(mockApi.getDashboardStats).toHaveBeenCalledTimes(1);
    });
  });
});