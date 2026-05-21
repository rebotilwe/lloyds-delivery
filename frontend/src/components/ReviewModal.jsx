import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ReviewModal({ order, isOpen, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('https://lloyds-delivery.onrender.com/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          restaurant_id: order.restaurant_id,
          driver_id: order.driver_id,
          customer_id: order.customer_id,
          rating: rating,
          comment: comment,
          type: 'restaurant' // or 'driver' - you can add tabs for both
        })
      });

      if (!response.ok) throw new Error('Failed to submit review');

      toast.success('Thank you for your review!');
      onSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <h2 className="text-xl font-bold mb-2">Rate Your Experience</h2>
        <p className="text-sm text-gray-500 mb-4">
          Order from {order.restaurant_name}
        </p>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-10 h-10 transition-all ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <Textarea
          placeholder="Share your experience (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="h-24 mb-4"
        />

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-green hover:bg-green/90 text-white"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
}