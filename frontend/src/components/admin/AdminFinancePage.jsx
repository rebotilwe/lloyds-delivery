import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import CommissionSettings from '@/components/admin/CommissionSettings';
import WithdrawalRequests from '@/components/admin/WithdrawalRequests';
import { Loader2 } from 'lucide-react';

export function AdminFinancePage() {
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });

  const drivers = users.filter(u => u.role === 'driver');

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold">Finance</h2>
        <p className="text-xs text-slate-400">Commission settings and withdrawal requests</p>
      </div>
      <CommissionSettings onRefresh={refetch} />
      <WithdrawalRequests drivers={drivers} onRefresh={refetch} />
    </div>
  );
}

export default AdminFinancePage;