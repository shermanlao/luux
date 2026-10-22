import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Collection extends Model {
  declare id: number;
  declare title: string;
  declare handle: string;
  declare description: string;
  declare image: string;
  declare sort_order: number;
  declare published: boolean;
}

Collection.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    handle: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    image: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'Collection', tableName: 'collections' }
);

export default Collection;
