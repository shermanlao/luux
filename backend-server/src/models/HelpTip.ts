import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class HelpTip extends Model {
  declare id: number;
  declare helpKey: string;
  declare title: string;
  declare body: string;
}

HelpTip.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    helpKey: { type: DataTypes.STRING, allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'HelpTip', tableName: 'help_tips', timestamps: false }
);

export default HelpTip;
