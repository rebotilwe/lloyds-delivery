import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format order status for display (removes underscores and capitalizes)
export const formatOrderStatus = (status) => {
  if (!status) return 'Pending';
  
  const statusMap = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready_for_pickup': 'Ready for Pickup',
    'picked_up': 'Picked Up',
    'on_the_way': 'On the Way',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};