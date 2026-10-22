import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class AdminUser extends Model {
  declare id: number;
  declare username: string;
  declare email: string;
  declare password_hash: string;
  declare role: 'admin';
  declare active: boolean;
  declare session_epoch: number;
}

AdminUser.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'admin' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    session_epoch: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, modelName: 'AdminUser', tableName: 'admin_users' }
);

export default AdminUser;
