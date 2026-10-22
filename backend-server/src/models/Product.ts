import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Product extends Model {
  declare id: number;
  declare title: string;
  declare handle: string;
  declare body_html: string;
  declare vendor: string;
  declare product_type: string;
  declare tags: string;
  declare published: boolean;
  declare featured: boolean;
  declare shopify_id: string | null;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    handle: { type: DataTypes.STRING, allowNull: false, unique: true },
    body_html: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    vendor: { type: DataTypes.STRING, allowNull: false, defaultValue: 'LUUX' },
    product_type: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    tags: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    shopify_id: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'Product', tableName: 'products' }
);

export default Product;
