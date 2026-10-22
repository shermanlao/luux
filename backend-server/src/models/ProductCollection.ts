import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ProductCollection extends Model {
  declare product_id: number;
  declare collection_id: number;
}

ProductCollection.init(
  {
    product_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    collection_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  },
  { sequelize, modelName: 'ProductCollection', tableName: 'product_collections', timestamps: false }
);

export default ProductCollection;
