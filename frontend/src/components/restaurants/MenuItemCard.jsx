import { Plus, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cartStore.jsx';
import { toast } from 'sonner';

export default function MenuItemCard({ item, restaurant }) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(item, restaurant);
    toast.success(`${item.name} added to cart`);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex hover:shadow-md transition-shadow group">
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="font-semibold text-card-foreground">{item.name}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
          {item.preparation_time && (
            <p className="text-xs text-muted-foreground mt-1">⏱ {item.preparation_time}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-secondary text-lg">R{item.price.toFixed(2)}</span>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full h-9 w-9 p-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="w-28 h-28 shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
      </div>
    </div>
  );
}