import { Op } from 'sequelize';
import Order from '../models/Order';
import OrderItem from '../models/OrderItem';
import SiteSetting from '../models/SiteSetting';
import { canSendMail, sendSiteMail } from './mail';
import { ORDER_NOTICE_EMAIL, orderNoticeSubject, orderNoticeText } from './shared/order-notice';

export async function notifyPaidOrder(order: Order): Promise<void> {
  if (order.staff_notice === '1') return;
  if (order.status !== 'paid' && order.status !== 'fulfilled') return;
  const fresh = await Order.findByPk(order.id);
  if (!fresh || fresh.staff_notice === '1') return;
  if (fresh.status !== 'paid' && fresh.status !== 'fulfilled') return;
  const site = await SiteSetting.findByPk(1);
  if (!site || !canSendMail(site)) {
    console.error(`Order ${fresh.number} is paid, but outgoing mail is not set up, so ${ORDER_NOTICE_EMAIL} was not notified.`);
    return;
  }
  const staleBefore = new Date(Date.now() - 60_000);
  const [claimed] = await Order.update(
    { staff_notice: 'sending' },
    {
      where: {
        id: fresh.id,
        [Op.or]: [
          { staff_notice: '' },
          { staff_notice: 'sending', updatedAt: { [Op.lt]: staleBefore } },
        ],
      },
    }
  );
  if (!claimed) {
    const current = await Order.findByPk(fresh.id);
    if (current?.staff_notice === '1') {
      order.staff_notice = '1';
      return;
    }
    throw new Error('Order notice email is already being sent.');
  }
  order.staff_notice = 'sending';
  const items = await OrderItem.findAll({ where: { order_id: fresh.id }, order: [['id', 'ASC']] });
  const text = orderNoticeText({
    number: fresh.number,
    email: fresh.email,
    phone: fresh.shipping_phone || '',
    subtotal: fresh.subtotal,
    shipping_amount: fresh.shipping_amount,
    shipping_rate_name: fresh.shipping_rate_name || '',
    total: fresh.total,
    shipping_same: fresh.shipping_same || '0',
    invoice: {
      name: fresh.invoice_name || '',
      company: fresh.invoice_company || '',
      line1: fresh.invoice_line1 || '',
      line2: fresh.invoice_line2 || '',
      city: fresh.invoice_city || '',
      region: fresh.invoice_region || '',
      postal: fresh.invoice_postal || '',
      country: fresh.invoice_country || '',
    },
    shipping: {
      name: fresh.shipping_name || '',
      company: fresh.shipping_company || '',
      line1: fresh.shipping_line1 || '',
      line2: fresh.shipping_line2 || '',
      city: fresh.shipping_city || '',
      region: fresh.shipping_region || '',
      postal: fresh.shipping_postal || '',
      country: fresh.shipping_country || '',
    },
    items: items.map((item) => ({
      title: item.title,
      variant_title: item.variant_title,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  });
  try {
    await sendSiteMail(site, {
      to: ORDER_NOTICE_EMAIL,
      replyTo: fresh.email.includes('@') ? fresh.email : undefined,
      subject: orderNoticeSubject(fresh.number),
      text,
    });
  } catch (error) {
    await Order.update({ staff_notice: '' }, { where: { id: fresh.id, staff_notice: 'sending' } });
    order.staff_notice = '';
    throw error;
  }
  await Order.update({ staff_notice: '1' }, { where: { id: fresh.id } });
  order.staff_notice = '1';
}
