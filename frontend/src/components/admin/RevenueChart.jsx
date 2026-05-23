import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, startOfDay, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, RefreshCw } from 'lucide-react';

export default function RevenueChart({ orders }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [period, setPeriod] = useState('7days'); // '7days', '4weeks', '12months'
  const [chartData, setChartData] = useState([]);
  const [mobileView, setMobileView] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate data based on selected period
  useEffect(() => {
    if (!orders || orders.length === 0) {
      setChartData([]);
      return;
    }

    let data = [];

    if (period === '7days') {
      // Last 7 days
      data = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStart = startOfDay(date);
        const dayStr = format(date, mobileView ? 'EEE' : 'EEEE');
        const dayOrders = orders.filter(o => {
          if (!o.created_at) return false;
          const oDate = startOfDay(new Date(o.created_at));
          return oDate.getTime() === dayStart.getTime();
        });
        const revenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const orderCount = dayOrders.length;
        return { name: dayStr, revenue, orders: orderCount, fullDate: format(date, 'dd MMM') };
      });
    } 
    else if (period === '4weeks') {
      // Last 4 weeks
      data = Array.from({ length: 4 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(new Date(), 3 - i));
        const weekEnd = endOfWeek(weekStart);
        const weekLabel = `W${i + 1}`;
        const weekOrders = orders.filter(o => {
          if (!o.created_at) return false;
          const oDate = new Date(o.created_at);
          return oDate >= weekStart && oDate <= weekEnd;
        });
        const revenue = weekOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const orderCount = weekOrders.length;
        return { name: weekLabel, revenue, orders: orderCount, fullDate: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}` };
      });
    }
    else if (period === '12months') {
      // Last 12 months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthLabel = format(date, 'MMM');
        const monthOrders = orders.filter(o => {
          if (!o.created_at) return false;
          const oDate = new Date(o.created_at);
          return oDate >= monthStart && oDate <= monthEnd;
        });
        const revenue = monthOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const orderCount = monthOrders.length;
        months.push({ name: monthLabel, revenue, orders: orderCount, fullDate: format(date, 'MMMM yyyy') });
      }
      data = months;
    }

    setChartData(data);
  }, [orders, period, mobileView]);

  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
  const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
  
  // Calculate trend (compare last period with previous)
  const getTrend = () => {
    if (chartData.length < 2) return 0;
    const currentPeriod = chartData.slice(-1)[0]?.revenue || 0;
    const previousPeriod = chartData.slice(-2, -1)[0]?.revenue || 0;
    if (previousPeriod === 0) return 0;
    return ((currentPeriod - previousPeriod) / previousPeriod) * 100;
  };

  const trend = getTrend();
  const isPositive = trend >= 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload[0].payload.fullDate && (
            <p className="text-xs text-gray-500">{payload[0].payload.fullDate}</p>
          )}
          <p className="text-green-600 font-bold mt-1">
            Revenue: R{payload[0].value.toFixed(2)}
          </p>
          <p className="text-blue-600 text-xs">
            Orders: {payload[0].payload.orders || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBar = (props) => {
    const { x, y, width, height, fill } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={6}
        ry={6}
        className="transition-all duration-300 hover:opacity-80"
      />
    );
  };

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Revenue Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No order data available</p>
            <p className="text-xs text-gray-400 mt-1">Orders will appear here once placed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Revenue Overview</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Track your earnings over time</p>
          </div>
          
          {/* Period Selector - Mobile Friendly */}
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant={period === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('7days')}
              className="h-8 text-xs px-2 sm:px-3"
            >
              7 Days
            </Button>
            <Button
              variant={period === '4weeks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('4weeks')}
              className="h-8 text-xs px-2 sm:px-3"
            >
              4 Weeks
            </Button>
            <Button
              variant={period === '12months' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('12months')}
              className="h-8 text-xs px-2 sm:px-3"
            >
              12 Months
            </Button>
          </div>
        </div>

        {/* Summary Stats - Mobile Friendly */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-2 border-t">
          <div>
            <p className="text-[10px] text-gray-500">Total Revenue</p>
            <p className="text-base sm:text-lg font-bold text-green">R{totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Total Orders</p>
            <p className="text-base sm:text-lg font-bold text-blue-600">{totalOrders}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] text-gray-500">Avg per Period</p>
            <div className="flex items-center gap-1">
              <p className="text-base sm:text-lg font-bold text-purple-600">R{avgRevenue.toFixed(0)}</p>
              {trend !== 0 && (
                <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chart Type Toggle - Mobile Friendly */}
        <div className="flex justify-end gap-1 mt-2">
          <Button
            variant={chartType === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('bar')}
            className="h-7 text-xs px-2"
          >
            Bar
          </Button>
          <Button
            variant={chartType === 'line' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('line')}
            className="h-7 text-xs px-2"
          >
            Line
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: mobileView ? 10 : 12 }} 
                  stroke="#94a3b8"
                  interval={mobileView ? 0 : 0}
                />
                <YAxis 
                  tick={{ fontSize: mobileView ? 10 : 12 }} 
                  stroke="#94a3b8"
                  tickFormatter={(value) => `R${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="revenue" 
                  fill="#10b981" 
                  shape={<CustomBar />}
                  animationDuration={500}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: mobileView ? 10 : 12 }} 
                  stroke="#94a3b8"
                />
                <YAxis 
                  tick={{ fontSize: mobileView ? 10 : 12 }} 
                  stroke="#94a3b8"
                  tickFormatter={(value) => `R${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={500}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Mobile Tip */}
        {mobileView && (
          <p className="text-center text-[10px] text-gray-400 mt-2">
            Pinch to zoom • Tap bars for details
          </p>
        )}
      </CardContent>
    </Card>
  );
}