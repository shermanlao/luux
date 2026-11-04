import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class MarketingCampaign extends Model {
  declare id: number;
  declare app: string;
  declare status: string;
  declare caption: string;
  declare channels: string;
  declare image_url: string;
  declare link: string;
  declare rationale: string;
  declare analysis_summary: string;
  declare analysis_findings: string;
  declare results: string;
}

MarketingCampaign.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    app: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
    caption: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    channels: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    image_url: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    link: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    rationale: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    analysis_summary: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    analysis_findings: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    results: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
  },
  { sequelize, modelName: 'MarketingCampaign', tableName: 'marketing_campaigns' }
);

export default MarketingCampaign;
