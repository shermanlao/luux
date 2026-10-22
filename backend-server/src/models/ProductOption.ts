import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ProductOption extends Model {
  declare id: number;
  declare product_id: number;
  declare name: string;
  declare position: number;
  declare values_json: string;
}

ProductOption.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    values_json: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
  },
  { sequelize, modelName: 'ProductOption', tableName: 'product_options' }
);

export default ProductOption;
