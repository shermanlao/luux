import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class PageView extends Model {
  declare id: number;
  declare app: string;
  declare path: string;
  declare day: string;
  declare count: number;
}

PageView.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    app: { type: DataTypes.STRING, allowNull: false },
    path: { type: DataTypes.STRING, allowNull: false },
    day: { type: DataTypes.STRING, allowNull: false },
    count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'PageView',
    tableName: 'page_views',
    indexes: [{ unique: true, fields: ['app', 'path', 'day'] }],
  }
);

export default PageView;
