import { Check } from 'lucide-react';

const steps = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'on_the_way', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="text-center py-4 text-destructive font-medium">
        This order has been cancelled
      </div>
    );
  }

  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-secondary transition-all duration-700"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, i) => {
          const isComplete = i <= currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isComplete
                    ? 'bg-secondary border-secondary text-secondary-foreground'
                    : 'bg-card border-muted text-muted-foreground'
                } ${isCurrent ? 'ring-4 ring-secondary/20 scale-110' : ''}`}
              >
                {isComplete ? <Check className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
              </div>
              <span className={`text-xs mt-2 text-center max-w-[60px] ${
                isComplete ? 'text-secondary font-medium' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}