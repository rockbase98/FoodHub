import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { orderId, kitchenId } = location.state || {};

  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (foodRating === 0 || deliveryRating === 0) {
      toast.error('Please provide all ratings');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        order_id: orderId,
        customer_id: user?.id,
        kitchen_id: kitchenId,
        food_rating: foodRating,
        delivery_rating: deliveryRating,
        comment: comment || null,
      });

      if (error) throw error;

      toast.success('Thank you for your review!');
      navigate('/customer/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Rate your Order</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        {/* Food Rating */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">How was the food?</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setFoodRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-12 w-12 ${
                    star <= foodRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {foodRating === 0 && 'Tap to rate'}
            {foodRating === 1 && 'Poor'}
            {foodRating === 2 && 'Below Average'}
            {foodRating === 3 && 'Average'}
            {foodRating === 4 && 'Good'}
            {foodRating === 5 && 'Excellent'}
          </p>
        </div>

        {/* Delivery Rating */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">How was the delivery?</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setDeliveryRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-12 w-12 ${
                    star <= deliveryRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {deliveryRating === 0 && 'Tap to rate'}
            {deliveryRating === 1 && 'Poor'}
            {deliveryRating === 2 && 'Below Average'}
            {deliveryRating === 3 && 'Average'}
            {deliveryRating === 4 && 'Good'}
            {deliveryRating === 5 && 'Excellent'}
          </p>
        </div>

        {/* Comment */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Share your experience</h2>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={5}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || foodRating === 0 || deliveryRating === 0}
          className="w-full gradient-primary text-lg py-6"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
}
