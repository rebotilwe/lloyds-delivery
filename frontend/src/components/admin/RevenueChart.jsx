import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

export default function RevenueChart({ orders }) {
  // Last 7 days revenue
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayStr = format(date, 'EEE');
    const dayOrders = orders.filter(o => {
      if (!o.created_date) return false;
      const oDate = startOfDay(new Date(o.created_date));
      return oDate.getTime() === dayStart.getTime();
    });
    const revenue = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
    return { day: dayStr, revenue, orders: dayOrders.length };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Revenue (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={days}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
              formatter={(val) => [`R${val.toFixed(0)}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}