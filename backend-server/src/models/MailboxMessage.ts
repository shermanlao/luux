import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class MailboxMessage extends Model {
  declare id: number;
  declare source: string;
  declare direction: string;
  declare name: string;
  declare email: string;
  declare subject: string;
  declare body: string;
  declare message_id: string;
  declare inquiry_id: number | null;
  declare parent_id: number | null;
  declare remote_uid: number | null;
  declare remote_folder: string;
  declare read: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

MailboxMessage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    source: { type: DataTypes.STRING, allowNull: false },
    direction: { type: DataTypes.STRING, allowNull: false, defaultValue: 'in' },
    name: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    email: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    subject: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    message_id: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    inquiry_id: { type: DataTypes.INTEGER, allowNull: true },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
    remote_uid: { type: DataTypes.INTEGER, allowNull: true },
    remote_folder: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, modelName: 'MailboxMessage', tableName: 'mailbox_messages' }
);

export default MailboxMessage;
