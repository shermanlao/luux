import Order from '../models/Order';

export async function nextOrderNumber(): Promise<string> {
  const count = await Order.count();
  return `LUUX-${String(1001 + count).padStart(4, '0')}`;
}
