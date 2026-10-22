import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ContactInquiry extends Model {
  declare id: number;
  declare name: string;
  declare email: string;
  declare message: string;
  declare createdAt: Date;
}

ContactInquiry.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'ContactInquiry', tableName: 'contact_inquiries' }
);

export default ContactInquiry;
