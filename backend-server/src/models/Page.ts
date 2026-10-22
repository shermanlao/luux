import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class Page extends Model {
  declare id: number;
  declare title: string;
  declare handle: string;
  declare body_html: string;
  declare kind: 'page' | 'policy';
}

Page.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    handle: { type: DataTypes.STRING, allowNull: false, unique: true },
    body_html: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    kind: { type: DataTypes.STRING, allowNull: false, defaultValue: 'page' },
  },
  { sequelize, modelName: 'Page', tableName: 'pages' }
);

export default Page;
