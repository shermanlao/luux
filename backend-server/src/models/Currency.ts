import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Currency extends Model {
  declare code: string;
  declare name: string;
  declare symbol: string;
  declare rate: string;
  declare decimals: number;
  declare sort_order: number;
}

Currency.init(
  {
    code: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    symbol: { type: DataTypes.STRING, allowNull: false },
    rate: { type: DataTypes.STRING, allowNull: false, defaultValue: '1' },
    decimals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'Currency', tableName: 'currencies' }
);

export default Currency;
