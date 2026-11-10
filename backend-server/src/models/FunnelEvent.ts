import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class FunnelEvent extends Model {
  declare id: number;
  declare app: string;
  declare day: string;
  declare event: string;
  declare source: string;
  declare medium: string;
  declare campaign: string;
  declare content: string;
  declare term: string;
  declare channel: string;
  declare landing_path: string;
  declare path: string;
  declare campaign_id: number;
  declare count: number;
  declare revenue_cents: number;
}

FunnelEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    app: { type: DataTypes.STRING(40), allowNull: false },
    day: { type: DataTypes.STRING(10), allowNull: false },
    event: { type: DataTypes.STRING(40), allowNull: false },
    source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    medium: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    campaign: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    content: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    term: { type: DataTypes.STRING(80), allowNull: false, defaultValue: '' },
    channel: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    landing_path: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    path: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    campaign_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    revenue_cents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'FunnelEvent',
    tableName: 'funnel_events',
    indexes: [
      {
        unique: true,
        name: 'funnel_events_dim',
        fields: ['app', 'day', 'event', 'source', 'medium', 'campaign', 'content', 'term', 'channel', 'landing_path', 'path', 'campaign_id'],
      },
    ],
  }
);

export default FunnelEvent;
