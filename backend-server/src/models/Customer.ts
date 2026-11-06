import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Customer extends Model {
  declare id: number;
  declare email: string;
  declare password_hash: string;
  declare first_name: string;
  declare last_name: string;
  declare phone: string;
  declare google_sub: string;
  declare facebook_id: string;
  declare invoice_first_name: string;
  declare invoice_last_name: string;
  declare invoice_company: string;
  declare invoice_phone: string;
  declare invoice_line1: string;
  declare invoice_line2: string;
  declare invoice_city: string;
  declare invoice_region: string;
  declare invoice_postal: string;
  declare invoice_country: string;
  declare shipping_same: string;
  declare shipping_first_name: string;
  declare shipping_last_name: string;
  declare shipping_company: string;
  declare shipping_phone: string;
  declare shipping_line1: string;
  declare shipping_line2: string;
  declare shipping_city: string;
  declare shipping_region: string;
  declare shipping_postal: string;
  declare shipping_country: string;
}

Customer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    first_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    last_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    google_sub: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    facebook_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_first_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_last_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_company: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_line1: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_line2: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_city: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_region: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_postal: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    invoice_country: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_same: { type: DataTypes.STRING, allowNull: false, defaultValue: '1' },
    shipping_first_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_last_name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_company: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_line1: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_line2: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_city: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_region: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_postal: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    shipping_country: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  },
  { sequelize, modelName: 'Customer', tableName: 'customers' }
);

export default Customer;
