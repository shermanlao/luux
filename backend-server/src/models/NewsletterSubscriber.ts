import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class NewsletterSubscriber extends Model {
  declare id: number;
  declare email: string;
}

NewsletterSubscriber.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  { sequelize, modelName: 'NewsletterSubscriber', tableName: 'newsletter_subscribers' }
);

export default NewsletterSubscriber;
