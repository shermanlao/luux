import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class MarketingSpend extends Model {
  declare id: number;
  declare spent_on: string;
  declare spend_type: string;
  declare channel: string;
  declare amount_hkd: string;
  declare note: string;
}

MarketingSpend.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    spent_on: { type: DataTypes.DATEONLY, allowNull: false },
    spend_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'post' },
    channel: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    amount_hkd: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
    note: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'MarketingSpend', tableName: 'marketing_spend' }
);

export default MarketingSpend;