import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Variant extends Model {
  declare id: number;
  declare product_id: number;
  declare title: string;
  declare sku: string;
  declare price: string;
  declare compare_at_price: string | null;
  declare option1: string | null;
  declare option2: string | null;
  declare option3: string | null;
  declare stock: number;
  declare image_id: number | null;
  declare shopify_id: string | null;
}

Variant.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Default Title' },
    sku: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    price: { type: DataTypes.STRING, allowNull: false, defaultValue: '0.00' },
    compare_at_price: { type: DataTypes.STRING, allowNull: true },
    option1: { type: DataTypes.STRING, allowNull: true },
    option2: { type: DataTypes.STRING, allowNull: true },
    option3: { type: DataTypes.STRING, allowNull: true },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    image_id: { type: DataTypes.INTEGER, allowNull: true },
    shopify_id: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'Variant', tableName: 'variants' }
);

export default Variant;
