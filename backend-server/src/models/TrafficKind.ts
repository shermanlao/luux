import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class TrafficKind extends Model {
  declare id: number;
  declare app: string;
  declare kind: string;
  declare day: string;
  declare count: number;
}

TrafficKind.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    app: { type: DataTypes.STRING, allowNull: false },
    kind: { type: DataTypes.STRING, allowNull: false },
    day: { type: DataTypes.STRING, allowNull: false },
    count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'TrafficKind',
    tableName: 'traffic_kinds',
    indexes: [{ unique: true, fields: ['app', 'kind', 'day'] }],
  }
);

export default TrafficKind;
