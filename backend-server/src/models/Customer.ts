import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Customer extends Model {
  declare id: number;
  declare email: string;
  declare password_hash: string;
  declare first_name: string;
  declare last_name: string;
}

Customer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    first_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    last_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'Customer', tableName: 'customers' }
);

export default Customer;
