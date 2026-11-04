import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class TrafficSource extends Model {
  declare id: number;
  declare app: string;
  declare source: string;
  declare day: string;
  declare count: number;
}

TrafficSource.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    app: { type: DataTypes.STRING, allowNull: false },
    source: { type: DataTypes.STRING, allowNull: false },
    day: { type: DataTypes.STRING, allowNull: false },
    count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'TrafficSource',
    tableName: 'traffic_sources',
    indexes: [{ unique: true, fields: ['app', 'source', 'day'] }],
  }
);

export default TrafficSource;
