import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';

class Order extends Model {
  declare id: number;
  declare number: string;
  declare customer_id: number | null;
  declare email: string;
  declare status: OrderStatus;
  declare subtotal: string;
  declare shipping_amount: string;
  declare total: string;
  declare currency: string;
  declare shipping_name: string;
  declare shipping_phone: string;
  declare shipping_line1: string;
  declare shipping_line2: string;
  declare shipping_city: string;
  declare shipping_region: string;
  declare shipping_postal: string;
  declare shipping_country: string;
  declare shipping_rate_name: string;
  declare stripe_session_id: string | null;
  declare stripe_payment_intent: string | null;
  declare notes: string;
  declare createdAt: Date;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    number: { type: DataTypes.STRING, allowNull: false, unique: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    subtotal: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
    shipping_amount: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
    total: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'HKD' },
    shipping_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_line1: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_line2: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_city: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_region: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_postal: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_country: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_rate_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    stripe_session_id: { type: DataTypes.STRING, allowNull: true, unique: true },
    stripe_payment_intent: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'Order', tableName: 'orders' }
);

export default Order;
