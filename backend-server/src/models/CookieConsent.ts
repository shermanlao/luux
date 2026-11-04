import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class CookieConsent extends Model {
  declare id: number;
  declare ip_hash: string;
  declare choice: 'all' | 'necessary';
}

CookieConsent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ip_hash: { type: DataTypes.STRING, allowNull: false, unique: true },
    choice: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'CookieConsent', tableName: 'cookie_consents' }
);

export default CookieConsent;
