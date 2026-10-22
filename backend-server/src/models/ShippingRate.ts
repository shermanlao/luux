import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ShippingRate extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare amount: string;
  declare countries: string;
  declare sort_order: number;
}

ShippingRate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    amount: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
    countries: { type: DataTypes.TEXT, allowNull: false, defaultValue: '*' },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'ShippingRate', tableName: 'shipping_rates' }
);

export default ShippingRate;
