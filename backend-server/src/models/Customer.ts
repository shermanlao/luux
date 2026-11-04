import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Customer extends Model {
  declare id: number;
  declare email: string;
  declare password_hash: string;
  declare first_name: string;
  declare last_name: string;
  declare google_sub: string;
  declare facebook_id: string;
}

Customer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    first_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    last_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    google_sub: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    facebook_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'Customer', tableName: 'customers' }
);

export default Customer;
