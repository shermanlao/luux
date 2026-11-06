import sequelize from '../database';
import {
  ensureCurrencies,
  ensureCustomerOAuthColumns,
  ensureCustomerProfileColumns,
  ensureOrderInvoiceColumns,
  ensureProductImageOptionTags,
  ensureProductVendorColumns,
  ensureTrafficColumns,
  ensureDefaultAdmin,
  ensureDefaultPages,
  ensurePaymentTestProduct,
  ensureShippingRates,
  ensureSiteSettings,
  upsertHelpTips,
} from '../seed/defaults';
import Currency from './Currency';
import CookieConsent from './CookieConsent';
import AdminUser from './AdminUser';
import Collection from './Collection';
import ContactInquiry from './ContactInquiry';
import Customer from './Customer';
import HelpTip from './HelpTip';
import NewsletterSubscriber from './NewsletterSubscriber';
import Order from './Order';
import OrderItem from './OrderItem';
import Page from './Page';
import Product from './Product';
import ProductCollection from './ProductCollection';
import ProductImage from './ProductImage';
import ProductOption from './ProductOption';
import ShippingRate from './ShippingRate';
import SiteSetting from './SiteSetting';
import Variant from './Variant';
import PageView from './PageView';
import TrafficSource from './TrafficSource';
import TrafficCountry from './TrafficCountry';
import TrafficKind from './TrafficKind';
import MarketingCampaign from './MarketingCampaign';
import MailboxMessage from './MailboxMessage';

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductOption, { foreignKey: 'product_id', as: 'options', onDelete: 'CASCADE' });
ProductOption.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(Variant, { foreignKey: 'product_id', as: 'variants', onDelete: 'CASCADE' });
Variant.belongsTo(Product, { foreignKey: 'product_id' });

Product.belongsToMany(Collection, {
  through: ProductCollection,
  foreignKey: 'product_id',
  otherKey: 'collection_id',
  as: 'collections',
});
Collection.belongsToMany(Product, {
  through: ProductCollection,
  foreignKey: 'collection_id',
  otherKey: 'product_id',
  as: 'products',
});

Customer.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });
Order.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
OrderItem.belongsTo(Variant, { foreignKey: 'variant_id', as: 'variant' });

async function syncDatabase() {
  try {
    await sequelize.sync();
    await ensureCustomerOAuthColumns();
    await ensureCustomerProfileColumns();
    await ensureOrderInvoiceColumns();
    await ensureProductImageOptionTags();
    await ensureProductVendorColumns();
    await ensureTrafficColumns();
    await upsertHelpTips();
    await ensureDefaultAdmin();
    await ensureSiteSettings();
    await ensureCurrencies();
    await ensureShippingRates();
    await ensurePaymentTestProduct();
    await ensureDefaultPages();
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Failed to synchronize models:', error);
  }
}

syncDatabase();

export {
  AdminUser,
  CookieConsent,
  Collection,
  ContactInquiry,
  Customer,
  HelpTip,
  NewsletterSubscriber,
  Order,
  OrderItem,
  Page,
  Product,
  ProductCollection,
  ProductImage,
  ProductOption,
  ShippingRate,
  Currency,
  SiteSetting,
  Variant,
  PageView,
  TrafficSource,
  TrafficCountry,
  TrafficKind,
  MarketingCampaign,
  MailboxMessage,
};
