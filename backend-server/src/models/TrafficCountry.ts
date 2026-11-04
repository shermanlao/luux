import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class TrafficCountry extends Model {
  declare id: number;
  declare app: string;
  declare country: string;
  declare day: string;
  declare count: number;
}

TrafficCountry.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    app: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    day: { type: DataTypes.STRING, allowNull: false },
    count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'TrafficCountry',
    tableName: 'traffic_countries',
    indexes: [{ unique: true, fields: ['app', 'country', 'day'] }],
  }
);

export default TrafficCountry;
