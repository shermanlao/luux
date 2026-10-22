import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class OrderItem extends Model {
  declare id: number;
  declare order_id: number;
  declare product_id: number;
  declare variant_id: number;
  declare title: string;
  declare variant_title: string;
  declare sku: string;
  declare quantity: number;
  declare unit_price: string;
}

OrderItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    variant_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    variant_title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    sku: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unit_price: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
  },
  { sequelize, modelName: 'OrderItem', tableName: 'order_items' }
);

export default OrderItem;
