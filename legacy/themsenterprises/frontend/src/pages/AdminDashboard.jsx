import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import httpClient from '../services/httpClient';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  FiPackage,
  FiShoppingCart,
  FiUsers,
  FiTrendingUp,
  FiDollarSign,
  FiClock,
  FiAlertCircle
} from 'react-icons/fi';
import AdminLayout from '../components/AdminLayout';
import AnimatedNumber from '../components/common/AnimatedNumber';
import './AdminDashboard.css';

// Constants
const ANIMATION_DURATION = 20;
const ANIMATION_STEPS = 100;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORY_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777'];
const LOW_STOCK_THRESHOLD = 5;

const AdminDashboard = () => {
  // State management
  const [stats, setStats] = useState({});
  const [animatedStats, setAnimatedStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [allOrders, setAllOrders] = useState([]);
  const [previousStats, setPreviousStats] = useState({});
  const [products, setProducts] = useState([]);
  
  const timersRef = useRef([]);
  const hasAnimatedRef = useRef(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearInterval(timer));
      timersRef.current = [];
    };
  }, []);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Animate stats only once when stats first load
  useEffect(() => {
    if (Object.keys(stats).length > 0 && !hasAnimatedRef.current) {
      animateStats();
      hasAnimatedRef.current = true;
    }
  }, [stats]);

  // Calculate available years from orders
  const availableYears = useMemo(() => {
    if (!allOrders.length) return [new Date().getFullYear()];
    
    const years = [...new Set(allOrders.map(order => {
      const date = new Date(order.createdAt);
      return isNaN(date.getTime()) ? null : date.getFullYear();
    }).filter(Boolean))].sort((a, b) => b - a);
    
    return years.length ? years : [new Date().getFullYear()];
  }, [allOrders]);

  // Calculate top product
  const topProduct = useMemo(() => {
    if (!allOrders.length || !products.length) {
      return { name: 'N/A', revenue: 0 };
    }

    const productRevenue = {};
    
    allOrders.forEach(order => {
      if (!order.items || !Array.isArray(order.items)) return;
      
      order.items.forEach(item => {
        if (!item.product || !item.quantity || !item.price) return;
        
        const revenue = item.quantity * item.price;
        productRevenue[item.product] = (productRevenue[item.product] || 0) + revenue;
      });
    });

    const topProductId = Object.keys(productRevenue).reduce(
      (maxId, id) => productRevenue[id] > (productRevenue[maxId] || 0) ? id : maxId,
      null
    );

    if (!topProductId) return { name: 'N/A', revenue: 0 };

    const product = products.find(p => p._id === topProductId);
    return {
      name: product?.name || 'Unknown Product',
      revenue: Math.round(productRevenue[topProductId] || 0)
    };
  }, [allOrders, products]);

  // Calculate low stock products
  const lowStockCount = useMemo(() => {
    if (!products.length) return 0;
    return products.filter(p => {
      const stock = p.stock || 0;
      const threshold = p.lowStockThreshold || LOW_STOCK_THRESHOLD;
      return stock <= threshold;
    }).length;
  }, [products]);

  // Prepare monthly data
  const monthlyData = useMemo(() => {
    if (!allOrders.length) return [];

    return MONTHS.map((month, index) => {
      const monthOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        if (isNaN(orderDate.getTime())) return false;
        return orderDate.getFullYear() === selectedYear && orderDate.getMonth() === index;
      });

      const revenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      return {
        month,
        revenue: Math.round(revenue),
        orders: monthOrders.length
      };
    });
  }, [allOrders, selectedYear]);

  // Prepare daily data
  const dailyData = useMemo(() => {
    if (selectedMonth === 'all' || !allOrders.length) return [];

    const monthIndex = parseInt(selectedMonth);
    if (isNaN(monthIndex)) return [];

    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
    const dailyRevenue = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        if (isNaN(orderDate.getTime())) return false;
        
        return orderDate.getFullYear() === selectedYear &&
               orderDate.getMonth() === monthIndex &&
               orderDate.getDate() === day;
      });

      const revenue = dayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      dailyRevenue.push({
        day: day.toString(),
        revenue: Math.round(revenue),
        orders: dayOrders.length
      });
    }

    return dailyRevenue;
  }, [allOrders, selectedYear, selectedMonth]);

  // Prepare category data
  const categoryData = useMemo(() => {
    if (!allOrders.length || !products.length) return [];

    const categoryMap = {};
    let totalQuantity = 0;

    allOrders.forEach(order => {
      if (!order.items || !Array.isArray(order.items)) return;

      order.items.forEach(item => {
        const product = products.find(p => p._id === item.product);
        if (!product || !product.category || !item.quantity) return;

        categoryMap[product.category] = (categoryMap[product.category] || 0) + item.quantity;
        totalQuantity += item.quantity;
      });
    });

    if (totalQuantity === 0) return [];

    return Object.entries(categoryMap)
      .map(([name, quantity], index) => ({
        name,
        value: Math.round((quantity / totalQuantity) * 100),
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [allOrders, products]);

  // Animate statistics
  const animateStats = useCallback(() => {
    // Clear existing timers
    timersRef.current.forEach(timer => clearInterval(timer));
    timersRef.current = [];

    // Initialize animated stats to 0
    const initialStats = {};
    Object.keys(stats).forEach(key => {
      initialStats[key] = 0;
    });
    setAnimatedStats(initialStats);

    // Animate each stat
    Object.keys(stats).forEach(key => {
      const target = stats[key] || 0;
      const increment = target / ANIMATION_STEPS;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        
        setAnimatedStats(prev => ({ ...prev, [key]: Math.floor(current) }));
      }, ANIMATION_DURATION);

      timersRef.current.push(timer);
    });
  }, [stats]);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, previousStatsRes, ordersRes, allOrdersRes, productsRes] = await Promise.all([
        httpClient.get('/admin2009/dashboard'),
        httpClient.get('/admin2009/dashboard?period=previous_month'),
        httpClient.get('/admin2009/orders?page=1&limit=5'),
        httpClient.get('/admin2009/orders'),
        httpClient.get('/admin2009/products')
      ]);

      // Calculate total revenue from all orders
      const orders = allOrdersRes.data?.orders || [];
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      // Calculate pending orders
      const pendingOrders = orders.filter(order => 
        order.orderStatus?.toLowerCase() === 'pending'
      ).length;

      setStats({
        ...statsRes.data,
        totalRevenue: Math.round(totalRevenue),
        pendingOrders
      });
      
      setPreviousStats(previousStatsRes.data || {});
      setRecentOrders(ordersRes.data?.orders || []);
      setAllOrders(orders);
      setProducts(productsRes.data?.products || []);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate percentage change
  const calculatePercentageChange = useCallback((current, previous) => {
    if (!previous || previous === 0) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  }, []);

  // Get status color class
  const getStatusColor = useCallback((status) => {
    const statusColors = {
      'pending': 'status-pending',
      'processing': 'status-processing',
      'shipped': 'status-shipped',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled'
    };
    return statusColors[status?.toLowerCase()] || 'status-default';
  }, []);

  // Format time ago
  const formatTimeAgo = useCallback((date) => {
    const orderDate = new Date(date);
    if (isNaN(orderDate.getTime())) return 'Unknown';

    const diff = Date.now() - orderDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }, []);

  // Handle year change
  const handleYearChange = useCallback((e) => {
    const year = parseInt(e.target.value);
    if (!isNaN(year)) {
      setSelectedYear(year);
    }
  }, []);

  // Handle month change
  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(e.target.value);
  }, []);

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="dashboard-error">
          <FiAlertCircle className="error-icon" />
          <p>{error}</p>
          <button onClick={loadDashboardData} className="btn-retry">
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-dashboard-new">
        {/* Header Section */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Admin Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back, MS Enterprises Admin</p>
          </div>
          <button className="btn-generate-report" onClick={() => window.print()}>
            <FiClock className="btn-icon" />
            Generate Report
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="metrics-grid">
          <MetricCard
            title="Total Revenue"
            value={`₹${(animatedStats.totalRevenue || 0).toLocaleString()}`}
            icon={<FiDollarSign className="metric-icon text-red" />}
            change={calculatePercentageChange(stats.totalRevenue, previousStats.totalRevenue)}
            borderColor="border-red"
          />

          <MetricCard
            title="Orders"
            value={animatedStats.totalOrders || 0}
            icon={<FiShoppingCart className="metric-icon text-blue" />}
            change={calculatePercentageChange(stats.totalOrders, previousStats.totalOrders)}
            borderColor="border-blue"
          />

          <MetricCard
            title="Products"
            value={animatedStats.totalProducts || 0}
            icon={<FiPackage className="metric-icon text-green" />}
            change={calculatePercentageChange(stats.totalProducts, previousStats.totalProducts)}
            borderColor="border-green"
          />

          <MetricCard
            title="Customers"
            value={animatedStats.totalCustomers || 0}
            icon={<FiUsers className="metric-icon text-purple" />}
            change={calculatePercentageChange(stats.totalCustomers, previousStats.totalCustomers)}
            borderColor="border-purple"
          />
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Revenue Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Revenue Trend</h3>
              <p className="chart-description">
                {selectedMonth === 'all' ? 'Monthly' : 'Daily'} revenue and order count
              </p>
              <div className="chart-filters">
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="filter-select"
                  aria-label="Select year"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="filter-select"
                  aria-label="Select month"
                >
                  <option value="all">All Months</option>
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="chart-content">
              {(selectedMonth === 'all' ? monthlyData : dailyData).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={selectedMonth === 'all' ? monthlyData : dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey={selectedMonth === 'all' ? "month" : "day"} 
                      stroke="#6b7280" 
                    />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Bar dataKey="revenue" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={<FiTrendingUp />}
                  message="No data available for selected period"
                />
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Sales by Category</h3>
              <p className="chart-description">Product category distribution</p>
            </div>
            <div className="chart-content">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={<FiPackage />}
                  message="No category data available"
                />
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Stats */}
        <div className="activity-grid">
          {/* Recent Orders */}
          <div className="orders-card">
            <div className="card-header">
              <h3 className="card-title">Recent Orders</h3>
              <p className="card-description">Latest orders from customers</p>
            </div>
            <div className="orders-list">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <OrderItem
                    key={order._id}
                    order={order}
                    getStatusColor={getStatusColor}
                    formatTimeAgo={formatTimeAgo}
                  />
                ))
              ) : (
                <EmptyState 
                  icon={<FiShoppingCart />}
                  message="No recent orders"
                />
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats-card">
            <div className="card-header">
              <h3 className="card-title">Quick Stats</h3>
              <p className="card-description">Key performance indicators</p>
            </div>
            <div className="stats-content">
              {/* Progress Bars */}
              <ProgressBar
                label="Order Fulfillment"
                value={stats.orderFulfillment || 0}
              />

              <ProgressBar
                label="Customer Satisfaction"
                value={stats.customerSatisfaction || 0}
              />

              <ProgressBar
                label="Inventory Level"
                value={stats.inventoryLevel || 0}
                warning={stats.inventoryLevel < 20}
              />

              {/* Top Product */}
              <div className="top-product">
                <div className="section-label">Top Performing Product</div>
                <div className="product-name">{topProduct.name}</div>
                <div className="product-revenue">
                  ₹{topProduct.revenue.toLocaleString()} revenue
                </div>
              </div>

              {/* Pending Actions */}
              <div className="pending-actions">
                <div className="section-label">Pending Actions</div>
                <ul className="action-list">
                  <li>
                    <FiAlertCircle /> 
                    {stats.pendingOrders || 0} order{stats.pendingOrders !== 1 ? 's' : ''} need approval
                  </li>
                  <li>
                    <FiPackage /> 
                    {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} low in stock
                  </li>
                  <li>
                    <FiUsers /> 
                    {stats.pendingCustomerQueries || 0} customer quer{stats.pendingCustomerQueries !== 1 ? 'ies' : 'y'} pending
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// Metric Card Component
const MetricCard = React.memo(({ title, value, icon, change, borderColor }) => {
  const isPositive = parseFloat(change) >= 0;
  
  return (
    <div className={`metric-card ${borderColor}`}>
      <div className="metric-header">
        <h3 className="metric-title">{title}</h3>
        {icon}
      </div>
      <div className="metric-content">
        <div className="metric-value">{value}</div>
        <p className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{change}% from last month
        </p>
      </div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

// Order Item Component
const OrderItem = React.memo(({ order, getStatusColor, formatTimeAgo }) => {
  const orderId = `ORD-${order._id.slice(-8).toUpperCase()}`;
  const username = order.user?.username || 'Guest User';
  const amount = order.totalAmount || 0;
  const status = order.orderStatus || 'Pending';

  return (
    <div className="order-item">
      <div className="order-info">
        <p className="order-id">{orderId}</p>
        <p className="order-customer">{username}</p>
      </div>
      <div className="order-details">
        <p className="order-amount">₹{amount.toLocaleString()}</p>
        <p className="order-time">{formatTimeAgo(order.createdAt)}</p>
      </div>
      <div className="order-status">
        <span className={`status-badge ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
});

OrderItem.displayName = 'OrderItem';

// Progress Bar Component
const ProgressBar = React.memo(({ label, value, warning = false }) => (
  <div className="stat-item">
    <div className="stat-label">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="progress-bar">
      <div 
        className={`progress-fill ${warning ? 'warning' : ''}`} 
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  </div>
));

ProgressBar.displayName = 'ProgressBar';

// Empty State Component
const EmptyState = React.memo(({ icon, message }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <p>{message}</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

export default AdminDashboard;