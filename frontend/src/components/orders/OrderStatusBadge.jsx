import { Badge } from '@/components/ui/badge';

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  preparing: { label: 'Preparing', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  ready_for_pickup: { label: 'Ready for Pickup', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  picked_up: { label: 'Picked Up', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  on_the_way: { label: 'On the Way', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200' },
};

export default function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}