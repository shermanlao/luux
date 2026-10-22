import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class SiteSetting extends Model {
  declare id: number;
  declare company_name: string;
  declare slogan: string;
  declare hero_heading: string;
  declare hero_subheading: string;
  declare hero_image: string;
  declare hero_cta_label: string;
  declare hero_cta_href: string;
  declare featured_heading: string;
  declare featured_handles: string;
  declare story_heading: string;
  declare story_body: string;
  declare shop_heading: string;
  declare shop_body: string;
  declare sanctuary_heading: string;
  declare newsletter_heading: string;
  declare newsletter_body: string;
  declare contact_email: string;
  declare contact_phone: string;
  declare contact_address: string;
  declare facebook_url: string;
  declare instagram_url: string;
  declare threads_url: string;
  declare pinterest_url: string;
  declare seo_title: string;
  declare seo_description: string;
  declare logo_icon: string;
}

SiteSetting.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'LUUX' },
    slogan: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    hero_heading: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Illuminate your space' },
    hero_subheading: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Embrace elegance through modern lighting design.',
    },
    hero_image: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    hero_cta_label: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Shop now' },
    hero_cta_href: { type: DataTypes.STRING, allowNull: false, defaultValue: '/collections/pendant' },
    featured_heading: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Featured products' },
    featured_handles: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    story_heading: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    story_body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    shop_heading: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Our shop' },
    shop_body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    sanctuary_heading: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    newsletter_heading: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Join our community' },
    newsletter_body: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Subscribe for exclusive insights and design tips.',
    },
    contact_email: { type: DataTypes.STRING, allowNull: false, defaultValue: 'hello@luuxmart.com' },
    contact_phone: { type: DataTypes.STRING, allowNull: false, defaultValue: '+852 6898 8613' },
    contact_address: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Hong Kong' },
    facebook_url: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    instagram_url: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    threads_url: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    pinterest_url: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    seo_title: { type: DataTypes.STRING, allowNull: false, defaultValue: 'LUUX' },
    seo_description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Modern lighting for living spaces. Pendant, wall, table, floor, and ceiling lamps.',
    },
    logo_icon: { type: DataTypes.STRING, allowNull: false, defaultValue: '/images/luux-mark.svg' },
  },
  { sequelize, modelName: 'SiteSetting', tableName: 'site_settings' }
);

export default SiteSetting;
