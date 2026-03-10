import { supabase } from './supabase';
import { calculateDistance } from './utils';

interface BatchOrder {
  id: string;
  kitchen_id: string;
  pickup_sequence: number;
  estimated_prep_time: number;
  kitchen: {
    lat: number;
    lng: number;
    name: string;
  };
}

interface CoordinationTimes {
  orderId: string;
  prepStartTime: Date;
  targetReadyTime: Date;
  pickupSequence: number;
}

export class CoordinationService {
  /**
   * Calculate optimal prep start times for all kitchens in a batch order
   * Ensures all food is ready within a 5-minute synchronization window
   */
  static async calculateBatchPrepTimes(
    batchOrderId: string,
    deliveryPartnerLocation?: { lat: number; lng: number }
  ): Promise<CoordinationTimes[]> {
    try {
      // Get all orders in this batch with kitchen locations
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          kitchen_id,
          pickup_sequence,
          estimated_prep_time,
          kitchens (
            lat,
            lng,
            name
          )
        `)
        .eq('batch_order_id', batchOrderId)
        .order('pickup_sequence', { ascending: true });

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      const result: CoordinationTimes[] = [];
      const syncWindowMinutes = 5;
      const avgSpeedKmh = 20; // Average city speed
      let cumulativeTravelMinutes = 0;

      // If no delivery partner location, use first kitchen as starting point
      let currentLat = deliveryPartnerLocation?.lat || orders[0].kitchens.lat;
      let currentLng = deliveryPartnerLocation?.lng || orders[0].kitchens.lng;

      // Calculate initial travel time to first kitchen
      if (deliveryPartnerLocation && orders[0].kitchens) {
        const distance = calculateDistance(
          deliveryPartnerLocation.lat,
          deliveryPartnerLocation.lng,
          orders[0].kitchens.lat,
          orders[0].kitchens.lng
        );
        cumulativeTravelMinutes = (distance / avgSpeedKmh) * 60;
      } else {
        cumulativeTravelMinutes = 10; // Default 10 mins if no location
      }

      // First pickup time: now + travel time to first kitchen
      const firstPickupTime = new Date(Date.now() + cumulativeTravelMinutes * 60 * 1000);

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const prepTime = order.estimated_prep_time || 30;

        if (i === 0) {
          // First kitchen: should be ready when delivery partner arrives
          result.push({
            orderId: order.id,
            prepStartTime: new Date(firstPickupTime.getTime() - prepTime * 60 * 1000),
            targetReadyTime: firstPickupTime,
            pickupSequence: order.pickup_sequence,
          });

          currentLat = order.kitchens.lat;
          currentLng = order.kitchens.lng;
        } else {
          // Subsequent kitchens
          const prevOrder = orders[i - 1];

          // Calculate travel time from previous kitchen to this one
          const travelDistance = calculateDistance(
            prevOrder.kitchens.lat,
            prevOrder.kitchens.lng,
            order.kitchens.lat,
            order.kitchens.lng
          );
          const travelMinutes = (travelDistance / avgSpeedKmh) * 60;
          cumulativeTravelMinutes += travelMinutes;

          // Target ready time: keep within sync window of first pickup
          // But account for travel time to reach this kitchen
          const targetReadyTime = new Date(
            firstPickupTime.getTime() + 
            cumulativeTravelMinutes * 60 * 1000 - 
            (syncWindowMinutes / 2) * 60 * 1000
          );

          result.push({
            orderId: order.id,
            prepStartTime: new Date(targetReadyTime.getTime() - prepTime * 60 * 1000),
            targetReadyTime,
            pickupSequence: order.pickup_sequence,
          });

          currentLat = order.kitchens.lat;
          currentLng = order.kitchens.lng;
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to calculate batch prep times:', error);
      return [];
    }
  }

  /**
   * Update prep times in database and notify kitchens
   */
  static async scheduleBatchPreparation(
    batchOrderId: string,
    deliveryPartnerLocation?: { lat: number; lng: number }
  ) {
    try {
      const times = await this.calculateBatchPrepTimes(batchOrderId, deliveryPartnerLocation);

      // Update all orders with calculated times
      const updatePromises = times.map((time) =>
        supabase.from('orders').update({
          prep_start_time: time.prepStartTime.toISOString(),
          target_ready_time: time.targetReadyTime.toISOString(),
          coordination_status: 'batch_coordinated',
        }).eq('id', time.orderId)
      );

      await Promise.all(updatePromises);

      // Send coordination messages to all kitchens
      const { data: orders } = await supabase
        .from('orders')
        .select('id, kitchen_id, pickup_sequence, target_ready_time')
        .eq('batch_order_id', batchOrderId);

      if (orders) {
        await this.sendCoordinationMessages(batchOrderId, orders);
      }

      return { success: true, times };
    } catch (error) {
      console.error('Failed to schedule batch preparation:', error);
      return { success: false, error };
    }
  }

  /**
   * Send coordination messages to kitchens
   */
  static async sendCoordinationMessages(
    batchOrderId: string,
    orders: Array<{ id: string; kitchen_id: string; pickup_sequence: number; target_ready_time: string }>
  ) {
    const messages = orders.map((order) => ({
      batch_order_id: batchOrderId,
      from_kitchen_id: null, // System message
      to_kitchen_id: order.kitchen_id,
      message_type: 'status_update',
      message: `Multi-restaurant order coordination: You are pickup #${order.pickup_sequence}. Target ready time: ${new Date(order.target_ready_time).toLocaleTimeString()}. Please synchronize with other kitchens in this batch.`,
      metadata: {
        pickup_sequence: order.pickup_sequence,
        target_ready_time: order.target_ready_time,
        total_kitchens: orders.length,
      },
    }));

    await supabase.from('kitchen_coordination_messages').insert(messages);
  }

  /**
   * Notify other kitchens about delay
   */
  static async notifyDelay(
    orderId: string,
    delayMinutes: number,
    reason: string
  ) {
    try {
      // Get order and batch info
      const { data: order } = await supabase
        .from('orders')
        .select('batch_order_id, kitchen_id, pickup_sequence')
        .eq('id', orderId)
        .single();

      if (!order || !order.batch_order_id) return;

      // Mark order as delayed
      await supabase.from('orders').update({
        is_delayed: true,
        delay_reason: reason,
      }).eq('id', orderId);

      // Get all other kitchens in this batch
      const { data: batchOrders } = await supabase
        .from('orders')
        .select('id, kitchen_id, pickup_sequence')
        .eq('batch_order_id', order.batch_order_id)
        .neq('id', orderId);

      if (!batchOrders) return;

      // Send delay notifications
      const messages = batchOrders.map((batchOrder) => ({
        batch_order_id: order.batch_order_id,
        from_kitchen_id: order.kitchen_id,
        to_kitchen_id: batchOrder.kitchen_id,
        message_type: 'delay_notification',
        message: `Kitchen #${order.pickup_sequence} is delayed by ${delayMinutes} minutes. Reason: ${reason}. Please adjust your prep timing accordingly.`,
        metadata: {
          delay_minutes: delayMinutes,
          delayed_pickup_sequence: order.pickup_sequence,
        },
      }));

      await supabase.from('kitchen_coordination_messages').insert(messages);

      // Recalculate prep times with delay
      await this.adjustBatchTimesForDelay(order.batch_order_id, delayMinutes);
    } catch (error) {
      console.error('Failed to notify delay:', error);
    }
  }

  /**
   * Adjust all kitchen times when one kitchen is delayed
   */
  static async adjustBatchTimesForDelay(batchOrderId: string, delayMinutes: number) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, prep_start_time, target_ready_time, pickup_sequence')
      .eq('batch_order_id', batchOrderId)
      .order('pickup_sequence');

    if (!orders) return;

    // Shift all times by delay amount
    const updatePromises = orders.map((order) => {
      const newPrepStart = new Date(new Date(order.prep_start_time).getTime() + delayMinutes * 60 * 1000);
      const newTargetReady = new Date(new Date(order.target_ready_time).getTime() + delayMinutes * 60 * 1000);

      return supabase.from('orders').update({
        prep_start_time: newPrepStart.toISOString(),
        target_ready_time: newTargetReady.toISOString(),
      }).eq('id', order.id);
    });

    await Promise.all(updatePromises);
  }

  /**
   * Mark order as ready and check if all in batch are ready
   */
  static async markOrderReady(orderId: string) {
    try {
      const now = new Date();

      // Update order with actual ready time
      await supabase.from('orders').update({
        actual_ready_time: now.toISOString(),
        status: 'ready',
      }).eq('id', orderId);

      // Get order and batch info
      const { data: order } = await supabase
        .from('orders')
        .select('batch_order_id, kitchen_id, pickup_sequence, target_ready_time')
        .eq('id', orderId)
        .single();

      if (!order || !order.batch_order_id) return;

      // Check sync window compliance
      const targetTime = new Date(order.target_ready_time);
      const diffMinutes = Math.abs((now.getTime() - targetTime.getTime()) / 60000);

      if (diffMinutes > 5) {
        // Outside sync window - notify other kitchens
        await this.notifyOutOfSync(order.batch_order_id, order.kitchen_id, order.pickup_sequence, diffMinutes);
      }

      // Get all orders in batch
      const { data: batchOrders } = await supabase
        .from('orders')
        .select('id, actual_ready_time, kitchen_id')
        .eq('batch_order_id', order.batch_order_id);

      if (!batchOrders) return;

      const allReady = batchOrders.every((o) => o.actual_ready_time !== null);

      if (allReady) {
        // All kitchens ready - notify for pickup
        await this.notifyAllReady(order.batch_order_id);
      } else {
        // Notify other kitchens that this one is ready
        const messages = batchOrders
          .filter((o) => o.id !== orderId && o.actual_ready_time === null)
          .map((o) => ({
            batch_order_id: order.batch_order_id,
            from_kitchen_id: order.kitchen_id,
            to_kitchen_id: o.kitchen_id,
            message_type: 'ready_notification',
            message: `Kitchen #${order.pickup_sequence} is ready for pickup. Sync within 5 minutes for optimal freshness.`,
            metadata: {
              ready_pickup_sequence: order.pickup_sequence,
            },
          }));

        if (messages.length > 0) {
          await supabase.from('kitchen_coordination_messages').insert(messages);
        }
      }
    } catch (error) {
      console.error('Failed to mark order ready:', error);
    }
  }

  /**
   * Notify when kitchen is out of sync window
   */
  static async notifyOutOfSync(
    batchOrderId: string,
    kitchenId: string,
    pickupSequence: number,
    diffMinutes: number
  ) {
    const message = {
      batch_order_id: batchOrderId,
      from_kitchen_id: kitchenId,
      to_kitchen_id: null, // Broadcast
      message_type: 'sync_request',
      message: `⚠️ Kitchen #${pickupSequence} is ${Math.round(diffMinutes)} minutes ${diffMinutes > 0 ? 'late' : 'early'}. Please adjust timing to stay within 5-minute sync window.`,
      metadata: {
        pickup_sequence: pickupSequence,
        diff_minutes: diffMinutes,
      },
    };

    await supabase.from('kitchen_coordination_messages').insert(message);
  }

  /**
   * Notify when all kitchens in batch are ready
   */
  static async notifyAllReady(batchOrderId: string) {
    const message = {
      batch_order_id: batchOrderId,
      from_kitchen_id: null,
      to_kitchen_id: null,
      message_type: 'ready_notification',
      message: '✅ All kitchens ready for pickup! Delivery partner notified.',
      metadata: {
        all_ready: true,
      },
    };

    await supabase.from('kitchen_coordination_messages').insert(message);

    // Update coordination status
    await supabase.from('orders').update({
      coordination_status: 'batch_in_progress',
    }).eq('batch_order_id', batchOrderId);
  }

  /**
   * Get coordination status for a batch order
   */
  static async getBatchCoordinationStatus(batchOrderId: string) {
    const { data, error } = await supabase
      .from('batch_order_coordination')
      .select('*')
      .eq('batch_order_id', batchOrderId)
      .order('pickup_sequence');

    if (error) {
      console.error('Failed to get batch coordination status:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get unread coordination messages for a kitchen
   */
  static async getKitchenMessages(kitchenId: string, limit = 20) {
    const { data, error } = await supabase
      .from('kitchen_coordination_messages')
      .select('*')
      .or(`to_kitchen_id.eq.${kitchenId},to_kitchen_id.is.null`)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get kitchen messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark message as read
   */
  static async markMessageRead(messageId: string) {
    await supabase.from('kitchen_coordination_messages').update({
      is_read: true,
    }).eq('id', messageId);
  }
}
