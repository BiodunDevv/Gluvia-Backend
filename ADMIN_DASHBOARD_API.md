# Admin Dashboard API Documentation

Complete guide for all admin dashboard endpoints with examples and chart integration.

## Base URL

- **Production**: `https://gluvia-backend.onrender.com`
- **Development**: `http://localhost:5000`

## Authentication

All dashboard endpoints require admin authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <admin_token>
```

---

## Dashboard Endpoints

### 1. Dashboard Overview

Get comprehensive system statistics for the main dashboard view.

**Endpoint**: `GET /admin/dashboard/overview`

**Response**:

```json
{
  "success": true,
  "message": "Dashboard overview retrieved successfully",
  "data": {
    "users": {
      "total": 1523,
      "active": 456,
      "newLast30Days": 87,
      "newLast7Days": 23,
      "growthRate": "5.71"
    },
    "admins": {
      "total": 5
    },
    "foods": {
      "total": 2341,
      "newLast30Days": 124,
      "byCategory": [
        {
          "category": "Vegetables",
          "count": 456
        },
        {
          "category": "Fruits",
          "count": 389
        }
      ]
    },
    "activity": {
      "mealLogs": {
        "total": 15678,
        "last24h": 234,
        "last7Days": 1890
      },
      "glucoseLogs": {
        "total": 23456,
        "last24h": 567,
        "last7Days": 3890
      }
    },
    "recentActivity": [
      {
        "action": "food_created",
        "user": {
          "name": "Louis Diaz",
          "email": "louisdiaz43@gmail.com"
        },
        "timestamp": "2026-01-01T00:28:24.133Z",
        "target": {
          "collection": "FoodItem",
          "id": "6955bfa89175f23405b49eff"
        }
      }
    ]
  }
}
```

**Usage in React/Next.js**:

```typescript
const fetchDashboardOverview = async () => {
  const response = await fetch(
    "http://localhost:5000/admin/dashboard/overview",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();
  return data.data;
};
```

---

### 2. User Growth Chart

Get daily user registration data for line/bar charts.

**Endpoint**: `GET /admin/dashboard/charts/user-growth`

**Query Parameters**:

- `days` (optional, default: 30): Number of days to fetch

**Response**:

```json
{
  "success": true,
  "message": "User growth chart data retrieved successfully",
  "data": [
    {
      "date": "2025-12-02",
      "count": 5
    },
    {
      "date": "2025-12-03",
      "count": 8
    },
    {
      "date": "2025-12-04",
      "count": 3
    }
  ]
}
```

**Chart.js Integration**:

```typescript
import { Line } from 'react-chartjs-2';

const UserGrowthChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'New Users',
        data: data.map(d => d.count),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'User Growth - Last 30 Days',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};
```

---

### 3. Meal Logs Chart

Get daily meal log counts for activity charts.

**Endpoint**: `GET /admin/dashboard/charts/meal-logs`

**Query Parameters**:

- `days` (optional, default: 30): Number of days to fetch

**Response**:

```json
{
  "success": true,
  "message": "Meal logs chart data retrieved successfully",
  "data": [
    {
      "date": "2025-12-02",
      "count": 234
    },
    {
      "date": "2025-12-03",
      "count": 267
    }
  ]
}
```

**Recharts Integration**:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const MealLogsChart = ({ data }) => {
  return (
    <LineChart width={800} height={400} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line
        type="monotone"
        dataKey="count"
        stroke="#8884d8"
        name="Meal Logs"
      />
    </LineChart>
  );
};
```

---

### 4. Glucose Logs Chart

Get daily glucose log counts and average readings.

**Endpoint**: `GET /admin/dashboard/charts/glucose-logs`

**Query Parameters**:

- `days` (optional, default: 30): Number of days to fetch

**Response**:

```json
{
  "success": true,
  "message": "Glucose logs chart data retrieved successfully",
  "data": [
    {
      "date": "2025-12-02",
      "count": 567,
      "avgGlucose": 125.3
    },
    {
      "date": "2025-12-03",
      "count": 589,
      "avgGlucose": 118.7
    }
  ]
}
```

**Dual-Axis Chart (Chart.js)**:

```typescript
import { Line } from 'react-chartjs-2';

const GlucoseLogsChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Log Count',
        data: data.map(d => d.count),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Avg Glucose (mg/dL)',
        data: data.map(d => d.avgGlucose),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Log Count',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Average Glucose',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};
```

---

### 5. Top Foods by Usage

Get most frequently logged foods for ranking/leaderboard.

**Endpoint**: `GET /admin/dashboard/top-foods`

**Query Parameters**:

- `limit` (optional, default: 20): Number of top foods to return

**Response**:

```json
{
  "success": true,
  "message": "Top foods retrieved successfully",
  "data": [
    {
      "_id": "6955bfa89175f23405b49eff",
      "usageCount": 567,
      "name": "White Rice",
      "category": "Grains",
      "imageUrl": "https://res.cloudinary.com/df4f0usnh/image/upload/v1767228000/rice.jpg"
    },
    {
      "_id": "6955bfa89175f23405b49f00",
      "usageCount": 489,
      "name": "Plantain",
      "category": "Vegetables",
      "imageUrl": "https://res.cloudinary.com/df4f0usnh/image/upload/v1767228000/plantain.jpg"
    }
  ]
}
```

**Bar Chart (Recharts)**:

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const TopFoodsChart = ({ data }) => {
  const chartData = data.slice(0, 10).map(food => ({
    name: food.name,
    count: food.usageCount,
  }));

  return (
    <BarChart width={800} height={400} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="count" fill="#8884d8" name="Usage Count" />
    </BarChart>
  );
};
```

---

### 6. System Health

Get real-time system health metrics.

**Endpoint**: `GET /admin/dashboard/system-health`

**Response**:

```json
{
  "success": true,
  "message": "System health retrieved successfully",
  "data": {
    "status": "healthy",
    "metrics": {
      "recentErrors": 2,
      "recentLogins": 45,
      "failedLogins": 3,
      "activeUsersLastHour": 89
    },
    "timestamp": "2026-01-01T00:30:00.000Z"
  }
}
```

**Status Badge Component**:

```typescript
const SystemHealthBadge = ({ health }) => {
  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-3 w-3 rounded-full ${statusColors[health.status]}`} />
        <h3 className="text-lg font-semibold">System Health</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Recent Logins</p>
          <p className="text-2xl font-bold">{health.metrics.recentLogins}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold">{health.metrics.activeUsersLastHour}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Failed Logins</p>
          <p className="text-2xl font-bold text-red-500">{health.metrics.failedLogins}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Recent Errors</p>
          <p className="text-2xl font-bold text-orange-500">{health.metrics.recentErrors}</p>
        </div>
      </div>
    </div>
  );
};
```

---

### 7. User Engagement Metrics

Get detailed engagement and feature adoption statistics.

**Endpoint**: `GET /admin/dashboard/user-engagement`

**Response**:

```json
{
  "success": true,
  "message": "User engagement metrics retrieved successfully",
  "data": {
    "totalUsers": 1523,
    "activeUsers": {
      "last7Days": 456,
      "last30Days": 892,
      "engagementRate7Days": "29.94",
      "engagementRate30Days": "58.57"
    },
    "featureUsage": {
      "usersWithMealLogs": 678,
      "usersWithGlucoseLogs": 892,
      "mealLogAdoptionRate": "44.52",
      "glucoseLogAdoptionRate": "58.57"
    },
    "averages": {
      "mealLogsPerUser": 23.4,
      "glucoseLogsPerUser": 34.7
    }
  }
}
```

**Pie/Donut Chart (Chart.js)**:

```typescript
import { Doughnut } from 'react-chartjs-2';

const FeatureAdoptionChart = ({ engagement }) => {
  const data = {
    labels: ['Meal Logs', 'Glucose Logs', 'Inactive'],
    datasets: [
      {
        data: [
          engagement.featureUsage.usersWithMealLogs,
          engagement.featureUsage.usersWithGlucoseLogs,
          engagement.totalUsers - engagement.featureUsage.usersWithGlucoseLogs,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(201, 203, 207, 0.6)',
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 99, 132)',
          'rgb(201, 203, 207)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Feature Adoption Rates',
      },
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return <Doughnut data={data} options={options} />;
};
```

---

### 8. Recent Users

Get list of recently registered users.

**Endpoint**: `GET /admin/dashboard/recent-users`

**Query Parameters**:

- `limit` (optional, default: 10): Number of users to return

**Response**:

```json
{
  "success": true,
  "message": "Recent users retrieved successfully",
  "data": [
    {
      "_id": "6955bfa89175f23405b49eff",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2026-01-01T00:28:24.133Z",
      "lastLoginAt": "2026-01-01T00:30:00.000Z"
    }
  ]
}
```

**Table Component**:

```typescript
const RecentUsersTable = ({ users }) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Registered
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Last Login
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {users.map((user) => (
          <tr key={user._id}>
            <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
            <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              {new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString()
                : 'Never'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

### 9. Activity Heatmap

Get hourly activity distribution for heatmap visualization.

**Endpoint**: `GET /admin/dashboard/activity-heatmap`

**Query Parameters**:

- `days` (optional, default: 7): Number of days to analyze

**Response**:

```json
{
  "success": true,
  "message": "Activity heatmap data retrieved successfully",
  "data": [
    {
      "dayOfWeek": 1,
      "hour": 8,
      "count": 45
    },
    {
      "dayOfWeek": 1,
      "hour": 12,
      "count": 89
    },
    {
      "dayOfWeek": 2,
      "hour": 8,
      "count": 52
    }
  ]
}
```

**Heatmap Component (with react-calendar-heatmap)**:

```typescript
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

const ActivityHeatmap = ({ data }) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Transform data for grid display
  const heatmapData = Array.from({ length: 7 }, (_, day) => {
    return Array.from({ length: 24 }, (_, hour) => {
      const match = data.find(
        d => d.dayOfWeek === day + 1 && d.hour === hour
      );
      return {
        day,
        hour,
        count: match ? match.count : 0,
      };
    });
  }).flat();

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Activity Heatmap</h3>
      <div className="grid grid-cols-25 gap-1">
        <div /> {/* Empty corner */}
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="text-xs text-center">{i}</div>
        ))}
        {daysOfWeek.map((day, dayIdx) => (
          <>
            <div className="text-xs">{day}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const item = heatmapData.find(
                d => d.day === dayIdx && d.hour === hour
              );
              const intensity = item ? (item.count / maxCount) : 0;
              const bgColor = `rgba(75, 192, 192, ${intensity})`;

              return (
                <div
                  key={`${dayIdx}-${hour}`}
                  className="h-8 border border-gray-200 rounded"
                  style={{ backgroundColor: bgColor }}
                  title={`${day} ${hour}:00 - ${item?.count || 0} logs`}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};
```

---

## Complete Dashboard Component Example

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [glucoseLogs, setGlucoseLogs] = useState([]);
  const [topFoods, setTopFoods] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = 'YOUR_ADMIN_TOKEN'; // Get from auth context

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [
          overviewRes,
          userGrowthRes,
          mealLogsRes,
          glucoseLogsRes,
          topFoodsRes,
          healthRes,
          engagementRes,
        ] = await Promise.all([
          fetch('http://localhost:5000/admin/dashboard/overview', { headers }),
          fetch('http://localhost:5000/admin/dashboard/charts/user-growth?days=30', { headers }),
          fetch('http://localhost:5000/admin/dashboard/charts/meal-logs?days=30', { headers }),
          fetch('http://localhost:5000/admin/dashboard/charts/glucose-logs?days=30', { headers }),
          fetch('http://localhost:5000/admin/dashboard/top-foods?limit=10', { headers }),
          fetch('http://localhost:5000/admin/dashboard/system-health', { headers }),
          fetch('http://localhost:5000/admin/dashboard/user-engagement', { headers }),
        ]);

        const overviewData = await overviewRes.json();
        const userGrowthData = await userGrowthRes.json();
        const mealLogsData = await mealLogsRes.json();
        const glucoseLogsData = await glucoseLogsRes.json();
        const topFoodsData = await topFoodsRes.json();
        const healthData = await healthRes.json();
        const engagementData = await engagementRes.json();

        setOverview(overviewData.data);
        setUserGrowth(userGrowthData.data);
        setMealLogs(mealLogsData.data);
        setGlucoseLogs(glucoseLogsData.data);
        setTopFoods(topFoodsData.data);
        setSystemHealth(healthData.data);
        setEngagement(engagementData.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={overview.users.total}
          change={`+${overview.users.newLast7Days} this week`}
          trend="up"
        />
        <StatCard
          title="Active Users"
          value={overview.users.active}
          subtitle="Last 7 days"
        />
        <StatCard
          title="Total Foods"
          value={overview.foods.total}
          change={`+${overview.foods.newLast30Days} this month`}
          trend="up"
        />
        <StatCard
          title="Meal Logs (24h)"
          value={overview.activity.mealLogs.last24h}
          subtitle={`${overview.activity.mealLogs.total} total`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">User Growth</h3>
          <Line
            data={{
              labels: userGrowth.map(d => d.date),
              datasets: [{
                label: 'New Users',
                data: userGrowth.map(d => d.count),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
              }],
            }}
          />
        </div>

        {/* Meal Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Meal Logs Activity</h3>
          <Line
            data={{
              labels: mealLogs.map(d => d.date),
              datasets: [{
                label: 'Meal Logs',
                data: mealLogs.map(d => d.count),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
              }],
            }}
          />
        </div>

        {/* Top Foods */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top 10 Foods</h3>
          <Bar
            data={{
              labels: topFoods.slice(0, 10).map(f => f.name),
              datasets: [{
                label: 'Usage Count',
                data: topFoods.slice(0, 10).map(f => f.usageCount),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
              }],
            }}
            options={{
              indexAxis: 'y',
            }}
          />
        </div>

        {/* Feature Adoption */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Feature Adoption</h3>
          <Doughnut
            data={{
              labels: ['Meal Logs', 'Glucose Logs', 'No Activity'],
              datasets: [{
                data: [
                  engagement.featureUsage.usersWithMealLogs,
                  engagement.featureUsage.usersWithGlucoseLogs,
                  engagement.totalUsers - engagement.featureUsage.usersWithGlucoseLogs,
                ],
                backgroundColor: [
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(255, 99, 132, 0.6)',
                  'rgba(201, 203, 207, 0.6)',
                ],
              }],
            }}
          />
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white p-6 rounded-lg shadow">
        <SystemHealthBadge health={systemHealth} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, trend, subtitle }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
    <p className="text-3xl font-bold mb-2">{value.toLocaleString()}</p>
    {change && (
      <p className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {change}
      </p>
    )}
    {subtitle && (
      <p className="text-sm text-gray-500">{subtitle}</p>
    )}
  </div>
);

export default AdminDashboard;
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common Status Codes**:

- `401`: Unauthorized (no token or invalid token)
- `403`: Forbidden (not an admin)
- `500`: Internal server error

---

## Rate Limiting

Dashboard endpoints respect the global rate limit:

- **Window**: 60 seconds
- **Max Requests**: 500

For high-frequency polling (e.g., system health), implement client-side caching or use WebSocket connections for real-time updates.

---

## Best Practices

1. **Caching**: Cache dashboard data for 30-60 seconds to reduce server load
2. **Lazy Loading**: Load charts on-demand as user scrolls
3. **Error Handling**: Always handle network errors gracefully
4. **Loading States**: Show skeleton screens while data loads
5. **Real-time Updates**: Use polling for system health (every 30-60 seconds)
6. **Responsive Design**: Ensure charts are mobile-friendly
7. **Data Export**: Provide CSV/Excel export for chart data
8. **Accessibility**: Add proper ARIA labels to charts and stats

---

## TypeScript Interfaces

```typescript
interface DashboardOverview {
  users: {
    total: number;
    active: number;
    newLast30Days: number;
    newLast7Days: number;
    growthRate: string;
  };
  admins: {
    total: number;
  };
  foods: {
    total: number;
    newLast30Days: number;
    byCategory: Array<{ category: string; count: number }>;
  };
  activity: {
    mealLogs: {
      total: number;
      last24h: number;
      last7Days: number;
    };
    glucoseLogs: {
      total: number;
      last24h: number;
      last7Days: number;
    };
  };
  recentActivity: Array<{
    action: string;
    user: { name: string; email: string } | null;
    timestamp: string;
    target?: {
      collection: string;
      id: string;
    };
  }>;
}

interface ChartDataPoint {
  date: string;
  count: number;
  avgGlucose?: number;
}

interface TopFood {
  _id: string;
  usageCount: number;
  name: string;
  category: string;
  imageUrl?: string;
}

interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  metrics: {
    recentErrors: number;
    recentLogins: number;
    failedLogins: number;
    activeUsersLastHour: number;
  };
  timestamp: string;
}

interface UserEngagement {
  totalUsers: number;
  activeUsers: {
    last7Days: number;
    last30Days: number;
    engagementRate7Days: string;
    engagementRate30Days: string;
  };
  featureUsage: {
    usersWithMealLogs: number;
    usersWithGlucoseLogs: number;
    mealLogAdoptionRate: string;
    glucoseLogAdoptionRate: string;
  };
  averages: {
    mealLogsPerUser: number;
    glucoseLogsPerUser: number;
  };
}
```

---

This comprehensive dashboard API provides everything needed for a professional admin panel with charts, metrics, and real-time monitoring! 🎉
