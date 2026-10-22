import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ProductImage extends Model {
  declare id: number;
  declare product_id: number;
  declare src: string;
  declare alt: string;
  declare position: number;
}

ProductImage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    src: { type: DataTypes.STRING, allowNull: false },
    alt: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'ProductImage', tableName: 'product_images' }
);

export default ProductImage;
