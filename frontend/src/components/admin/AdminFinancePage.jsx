import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import CommissionSettings from '@/components/admin/CommissionSettings';
import WithdrawalRequests from '@/components/admin/WithdrawalRequests';
import { Loader2, DollarSign } from 'lucide-react';

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
    <div className="flex justify-center items-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 shrink-0">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">Finance</h1>
            <p className="text-sm text-slate-400">Commission settings and withdrawal requests</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Commission Settings</h2>
            </div>
            <div className="p-5">
              <CommissionSettings onRefresh={refetch} />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Withdrawal Requests</h2>
            </div>
            <div className="p-5">
              <WithdrawalRequests drivers={drivers} onRefresh={refetch} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminFinancePage;