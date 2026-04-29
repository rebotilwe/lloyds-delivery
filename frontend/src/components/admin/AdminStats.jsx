import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Users, Truck } from 'lucide-react';

export default function AdminStats({ orders, users }) {
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const customerCount = users.filter(u => u.role === 'customer' || !u.role).length;
  const driverCount = users.filter(u => u.role === 'driver').length;

  const stats = [
    { label: 'Total Revenue', value: `R${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
    { label: 'Active Orders', value: activeOrders, icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
    { label: 'Customers', value: customerCount, icon: Users, color: 'bg-purple-100 text-purple-600' },
    { label: 'Drivers', value: driverCount, icon: Truck, color: 'bg-cyan-100 text-cyan-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map(s => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color} mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}