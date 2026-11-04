import OrderItem from '../models/OrderItem';
import Variant from '../models/Variant';

export async function changeOrderStock(orderId: number, direction: -1 | 1): Promise<void> {
  const items = await OrderItem.findAll({ where: { order_id: orderId } });
  for (const item of items) {
    const variant = await Variant.findByPk(item.variant_id);
    if (!variant) continue;
    const next = variant.stock + direction * item.quantity;
    variant.stock = direction < 0 ? Math.max(0, next) : next;
    await variant.save();
  }
}
