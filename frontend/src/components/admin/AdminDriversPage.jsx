import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Eye, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STATUS_COLOR = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
};

function DriverDocumentsModal({ driver, onClose, onApprove, onReject }) {
  const [viewingDoc, setViewingDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  const docs = [
    { key: 'id_copy',       label: 'ID / Passport' },
    { key: 'pdp',           label: 'PDP Licence' },
    { key: 'profile_photo', label: 'Profile Photo' },
    { key: 'car_license',   label: 'Vehicle Licence' },
  ];

  const getUrl = (key) => {
    const p = driver[key];
    if (!p) return null;
    if (p.startsWith('http')) return p;
    if (p.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL || ''}${p}`;
    return null;
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${driver.id}`, { driver_status: 'approved', is_available: 1 });
      toast.success(`${driver.full_name || driver.name} approved`);
      onApprove();
      onClose();
    } catch { toast.error('Failed to approve'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${driver.id}`, { driver_status: 'rejected', is_available: 0 });
      toast.success(`${driver.full_name || driver.name} rejected`);
      onReject();
      onClose();
    } catch { toast.error('Failed to reject'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Driver Documents</DialogTitle>
          <p className="text-sm text-slate-500">{driver.full_name || driver.name} · {driver.email}</p>
        </DialogHeader>

        {(driver.car_make || driver.license_plate) && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium">{driver.car_make} {driver.car_model}</span>
            {driver.license_plate && <span className="ml-2 text-slate-400">· {driver.license_plate}</span>}
          </div>
        )}

        <div className="space-y-2">
          {docs.map(({ key, label }) => {
            const url = getUrl(key);
            return (
              <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-slate-400">{url ? 'Uploaded' : 'Not uploaded'}</p>
                </div>
                {url && (
                  <Button size="sm" variant="outline" onClick={() => setViewingDoc(url)}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleApprove} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Approve
          </Button>
          <Button onClick={handleReject} disabled={loading} variant="destructive" className="flex-1">
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
        </div>
      </DialogContent>

      {/* Doc preview */}
      {viewingDoc && (
        <Dialog open onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Document Preview</DialogTitle></DialogHeader>
            {/\.(jpe?g|png|gif|webp)$/i.test(viewingDoc)
              ? <img src={viewingDoc} alt="doc" className="w-full rounded-lg object-contain" style={{ maxHeight: 'min(60vh,500px)' }} />
              : <iframe src={viewingDoc} className="w-full rounded-lg" style={{ height: 'min(70vh,600px)' }} title="PDF" />
            }
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(viewingDoc, '_blank')}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button onClick={() => setViewingDoc(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

export default function AdminDriversPage() {
  const [selected, setSelected] = useState(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await api.get('/users');
      return r?.data ?? (Array.isArray(r) ? r : []);
    },
  });

  const drivers = useMemo(() => users.filter(u => u.role === 'driver'), [users]);

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Drivers</h2>
          <p className="text-xs text-slate-400">{drivers.length} total · {drivers.filter(d => d.driver_status === 'pending').length} pending</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {drivers.map(d => (
          <div key={d.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{d.full_name || d.name}</p>
                <p className="text-xs text-slate-400">{d.email}</p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLOR[d.driver_status] ?? 'bg-slate-100 text-slate-500')}>
                {d.driver_status ?? 'none'}
              </span>
            </div>
            {d.driver_status === 'pending' && (
              <Button size="sm" className="mt-3 w-full" onClick={() => setSelected(d)}>
                Review Documents
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block w-full overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">Driver</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left hidden md:table-cell">Phone</th>
              <th className="whitespace-nowrap px-4 py-3 text-left hidden lg:table-cell">Vehicle</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Status</th>
              <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {drivers.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium">{d.full_name || d.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{d.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 hidden md:table-cell">{d.phone || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 hidden lg:table-cell">{d.car_make ? `${d.car_make} ${d.car_model}` : '—'}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_COLOR[d.driver_status] ?? 'bg-slate-100 text-slate-500')}>
                    {d.driver_status ?? 'none'}
                  </span>
                </td>
                <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3 text-right shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                  {d.driver_status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => setSelected(d)}>
                      Review
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DriverDocumentsModal
          driver={selected}
          onClose={() => setSelected(null)}
          onApprove={() => refetch()}
          onReject={() => refetch()}
        />
      )}
    </div>
  );
}