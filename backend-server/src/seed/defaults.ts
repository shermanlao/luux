import { DataTypes, Op } from 'sequelize';
import sequelize from '../database';
import { hashPassword } from '../lib/adminPassword';
import { DEFAULT_ADMIN_PASSWORD } from '../lib/shared/production-secrets';
import AdminUser from '../models/AdminUser';
import HelpTip from '../models/HelpTip';
import Page from '../models/Page';
import Currency from '../models/Currency';
import ShippingRate from '../models/ShippingRate';
import SiteSetting from '../models/SiteSetting';

const HELP_TIPS: Array<{ helpKey: string; title: string; body: string }> = [
  { helpKey: 'nav.menu', title: 'Menu', body: 'Open the site menu.' },
  { helpKey: 'nav.home', title: 'Home', body: 'Open the LUUX homepage.' },
  { helpKey: 'nav.shop', title: 'Collections', body: 'Browse lighting collections.' },
  { helpKey: 'nav.about', title: 'About us', body: 'Read about LUUX.' },
  { helpKey: 'nav.contact', title: 'Contact us', body: 'Send a question or find our email and phone.' },
  { helpKey: 'nav.search', title: 'Search', body: 'Search products by name.' },
  { helpKey: 'nav.account', title: 'Account', body: 'Sign in to see your orders.' },
  { helpKey: 'nav.cart', title: 'Cart', body: 'Open your shopping cart.' },
  { helpKey: 'nav.logo', title: 'LUUX', body: 'Return to the homepage.' },
  { helpKey: 'nav.currency', title: 'Currency', body: 'Show shop prices in another currency. Card payment is still collected in Hong Kong dollars.' },
  { helpKey: 'home.shop_now', title: 'Shop now', body: 'Open the shop and browse lamps.' },
  { helpKey: 'home.learn_more', title: 'Learn more', body: 'Read the About us page.' },
  { helpKey: 'home.newsletter', title: 'Sign up', body: 'Join the LUUX email list.' },
  { helpKey: 'product.add_to_cart', title: 'Add to cart', body: 'Add this lamp and the selected options to your cart.' },
  { helpKey: 'dialog.close', title: 'Close', body: 'Close this window without adding the lamp.' },
  { helpKey: 'notice.checkout', title: 'Checkout', body: 'Go to checkout to pay for the items just added.' },
  { helpKey: 'product.choose', title: 'Choose', body: 'Open this product and pick a finish or size.' },
  { helpKey: 'product.gallery.prev', title: 'Previous photo', body: 'Show the previous product photo.' },
  { helpKey: 'product.gallery.next', title: 'Next photo', body: 'Show the next product photo.' },
  { helpKey: 'product.gallery.thumb', title: 'Photo', body: 'Show this product photo.' },
  { helpKey: 'cart.checkout', title: 'Checkout', body: 'Enter your address and pay with Stripe.' },
  { helpKey: 'cart.update', title: 'Update cart', body: 'Change the quantity in your cart.' },
  { helpKey: 'cart.remove', title: 'Remove', body: 'Take this item out of your cart.' },
  { helpKey: 'checkout.pay', title: 'Pay with Stripe', body: 'Continue to Stripe to pay by card. Card details stay on Stripe.' },
  { helpKey: 'account.login', title: 'Sign in', body: 'Sign in to see past orders. A staff email and password open the admin area.' },
  { helpKey: 'account.signup', title: 'Sign up', body: 'Open the form to create an account.' },
  { helpKey: 'account.google', title: 'Google', body: 'Sign in with Google.' },
  { helpKey: 'account.facebook', title: 'Facebook', body: 'Sign in with Facebook.' },
  { helpKey: 'account.have_account', title: 'Already have an account?', body: 'Return to the sign-in form.' },
  { helpKey: 'account.register', title: 'Create account', body: 'Create an account with your email.' },
  { helpKey: 'account.logout', title: 'Log out', body: 'End your customer session.' },
  { helpKey: 'contact.send', title: 'Send', body: 'Send this message to LUUX.' },
  { helpKey: 'search.submit', title: 'Search', body: 'Find products matching these words.' },
  { helpKey: 'admin.login', title: 'Sign in', body: 'Sign in to the staff dashboard.' },
  { helpKey: 'admin.logout', title: 'Log out', body: 'End the staff session.' },
  { helpKey: 'admin.nav.back', title: 'Back', body: 'Return to the previous admin page.' },
  { helpKey: 'admin.nav.dashboard', title: 'Dashboard', body: 'Open the staff home.' },
  { helpKey: 'admin.nav.products', title: 'Products', body: 'Edit lamps, variants, prices, and photos.' },
  { helpKey: 'admin.nav.collections', title: 'Collections', body: 'Edit shop groups such as Pendant and Wall.' },
  { helpKey: 'admin.nav.pages', title: 'Pages', body: 'Edit About, Contact, and policy text.' },
  { helpKey: 'admin.nav.settings', title: 'Settings', body: 'Edit homepage copy, contact details, and featured products.' },
  { helpKey: 'admin.nav.integrations', title: 'Integrations', body: 'Save the AI API, Stripe payment details, and social posting tokens.' },
  { helpKey: 'admin.nav.marketing', title: 'Marketing', body: 'Read shop traffic and draft posts. Nothing is published until you confirm.' },
  { helpKey: 'admin.nav.shipping', title: 'Shipping', body: 'Set the Hong Kong and worldwide flat rates.' },
  { helpKey: 'admin.nav.orders', title: 'Orders', body: 'See paid Stripe orders and mark them fulfilled.' },
  { helpKey: 'admin.nav.inquiries', title: 'Inquiries', body: 'Read messages sent from the contact form.' },
  { helpKey: 'admin.product.save', title: 'Save product', body: 'Save this product, its variants, and photos.' },
  { helpKey: 'admin.product.new', title: 'Add product', body: 'Create a new lamp.' },
  { helpKey: 'admin.product.delete', title: 'Delete product', body: 'Remove this lamp from the shop.' },
  { helpKey: 'admin.product.edit', title: 'Edit', body: 'Open this product in the editor.' },
  { helpKey: 'admin.product.sort_title', title: 'Sort by name', body: 'Sort the product list by lamp name. Click again to reverse the order.' },
  { helpKey: 'admin.product.sort_price', title: 'Sort by price', body: 'Sort the product list by price. Click again to reverse the order.' },
  { helpKey: 'admin.product.sort_variants', title: 'Sort by variants', body: 'Sort the product list by the number of variants. Click again to reverse the order.' },
  { helpKey: 'admin.product.filter_collection', title: 'Collection', body: 'Show lamps in the chosen collection. All collections shows every lamp.' },
  { helpKey: 'admin.product.search', title: 'Search products', body: 'Find a lamp by name.' },
  { helpKey: 'admin.product.import', title: 'Read product', body: 'Read a product link and fill the title, details, variants, and photos. Nothing is saved until you save the product.' },
  { helpKey: 'admin.product.vendor', title: 'Company', body: 'Supplier company name stored on this lamp.' },
  { helpKey: 'admin.product.vendor_url', title: 'Link', body: 'Supplier page for this lamp. It is kept in the admin editor and is not published on the shop.' },
  { helpKey: 'admin.product.vendor_contact', title: 'Contacts', body: 'Supplier phone, email, and a person. These stay in the admin editor and are not published on the shop.' },
  { helpKey: 'admin.html.display', title: 'Display', body: 'Switch this field between the HTML source and the rendered page.' },
  { helpKey: 'admin.image.drop', title: 'Drop photos', body: 'Drop image files here to add them to this lamp.' },
  { helpKey: 'admin.image.delete', title: 'Delete photo', body: 'Remove this photo from the lamp.' },
  { helpKey: 'admin.image.edit', title: 'Edit photo', body: 'Open this photo in the AI editor.' },
  { helpKey: 'admin.image.main', title: 'Main photo', body: 'Use this photo on the shop, the product list, and as the first gallery photo.' },
  { helpKey: 'admin.image.ai_send', title: 'Send', body: 'Ask the AI to change this photo.' },
  { helpKey: 'admin.image.ai_apply', title: 'Apply', body: 'Replace this photo with the edited one.' },
  { helpKey: 'admin.image.ai_cancel', title: 'Cancel', body: 'Close the photo editor without replacing the photo.' },
  { helpKey: 'admin.image.ai_reset', title: 'Reset', body: 'Restore the original photo in this editor.' },
  { helpKey: 'admin.image.ai_upscale', title: 'Increase resolution', body: 'Ask the AI to sharpen this photo without changing the lamp.' },
  { helpKey: 'admin.image.ai_reference', title: 'Photo for reference only', body: 'Add or remove a reference bar under this photo.' },
  { helpKey: 'admin.option.add', title: 'Add option', body: 'Add a choice such as size or finish. Separate values with commas.' },
  { helpKey: 'admin.option.delete', title: 'Delete option', body: 'Remove this option. Save the product to keep the change.' },
  { helpKey: 'admin.variant.add', title: 'Add variant', body: 'Add another size, colour, or finish.' },
  { helpKey: 'admin.variant.delete', title: 'Delete variant', body: 'Remove this variant. Save the product to keep the change.' },
  { helpKey: 'admin.variant.generate', title: 'Generate variants', body: 'Create one variant for every combination of the first three options. A matching row keeps its price, SKU, and stock.' },
  { helpKey: 'admin.image.upload', title: 'Upload photo', body: 'Add a product photo from your computer.' },
  { helpKey: 'admin.collection.edit', title: 'Edit', body: 'Open or close this collection’s title, handle, and description.' },
  { helpKey: 'admin.collection.save', title: 'Save collection', body: 'Save this collection.' },
  { helpKey: 'admin.page.edit', title: 'Edit', body: 'Open or close this page’s title and body.' },
  { helpKey: 'admin.page.body_view', title: 'Display', body: 'Switch the body between the HTML source and the page display.' },
  { helpKey: 'admin.page.save', title: 'Save page', body: 'Save this page text.' },
  { helpKey: 'admin.settings.save', title: 'Save settings', body: 'Save homepage, contact details, and the cookie notice.' },
  { helpKey: 'admin.settings.threads', title: 'Threads', body: 'Public Threads profile shown in the shop footer.' },
  { helpKey: 'admin.settings.pinterest', title: 'Pinterest', body: 'Public Pinterest profile shown in the shop footer.' },
  { helpKey: 'admin.integrations.save', title: 'Save integrations', body: 'Save the AI API, Stripe payment details, and social posting tokens.' },
  { helpKey: 'admin.integrations.marketing_key', title: 'Marketing key', body: 'Create a key other apps can send when they ask this shop to draft a campaign. The full key is shown once.' },
  { helpKey: 'admin.marketing.ask', title: 'Ask AI', body: 'Read the last 30 days and draft posts. Nothing is published yet.' },
  { helpKey: 'admin.marketing.save', title: 'Save draft', body: 'Keep this caption, image, link, and channels.' },
  { helpKey: 'admin.marketing.confirm', title: 'Confirm and post', body: 'Publish this draft to the selected channels.' },
  { helpKey: 'admin.marketing.export', title: 'Export JSON', body: 'Download this campaign document for another app.' },
  { helpKey: 'admin.shipping.save', title: 'Save rates', body: 'Save the shipping amounts.' },
  { helpKey: 'admin.order.fulfill', title: 'Mark fulfilled', body: 'Mark this paid order as shipped.' },
  { helpKey: 'admin.order.cancel', title: 'Cancel order', body: 'Cancel this order. Stripe refunds are done in the Stripe dashboard.' },
  { helpKey: 'admin.confirm.cancel', title: 'Cancel', body: 'Close this confirmation.' },
  { helpKey: 'admin.confirm.delete', title: 'Delete', body: 'Permanently delete this record.' },
  { helpKey: 'cookies.allow', title: 'Allow', body: 'Allow cookies and remember this network.' },
  { helpKey: 'cookies.reject', title: 'Reject', body: 'Keep only the login cookie and the cart stored in this browser.' },
  { helpKey: 'cookies.settings', title: 'Cookie settings', body: 'See which cookies this shop uses.' },
  { helpKey: 'cookies.necessary', title: 'Strictly necessary', body: 'The login cookie and cart storage stay on so you can shop.' },
  { helpKey: 'cookies.save', title: 'Save', body: 'Save necessary cookies only and remember this network.' },
  { helpKey: 'cookies.policy', title: 'Cookie policy', body: 'Read how LUUX uses cookies.' },
];

export async function upsertHelpTips(): Promise<void> {
  for (const tip of HELP_TIPS) {
    const existing = await HelpTip.findOne({ where: { helpKey: tip.helpKey } });
    if (existing) {
      existing.title = tip.title;
      existing.body = tip.body;
      await existing.save();
    } else {
      await HelpTip.create(tip);
    }
  }
}

export async function ensureDefaultAdmin(): Promise<void> {
  const count = await AdminUser.count();
  if (count > 0) return;
  const email = String(process.env.ADMIN_EMAIL || 'hello@luuxmart.com').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD);
  await AdminUser.create({
    username: 'admin',
    email,
    password_hash: hashPassword(password),
    role: 'admin',
    active: true,
    session_epoch: 0,
  });
}

const ENGLISH_COPY = {
  slogan: 'Shop our latest arrivals.',
  hero_heading: 'Illuminate your space',
  hero_subheading: 'Embrace elegance through modern lighting design.',
  hero_cta_label: 'Shop now',
  featured_heading: 'Featured products',
  story_body: 'We believe in creating luminous atmospheres through thoughtfully designed lighting solutions.',
  shop_heading: 'Our shop',
  shop_body:
    'With a keen eye for contemporary design, our store specializes in illuminating living spaces through modern wall lamps. We embrace innovative craftsmanship that marries artistry with function.',
  sanctuary_heading:
    'Transform your home into a sanctuary of light and shadow. Experience the subtle interplay of form and function.',
  newsletter_heading: 'Join our community',
  newsletter_body: 'Subscribe for exclusive insights and design tips.',
  logo_icon: '/images/luux-mark.jpg',
};

const PREVIOUS_ZH: Record<keyof typeof ENGLISH_COPY, string> = {
  slogan: '瀏覽我們的最新到貨商品。',
  hero_heading: '照亮你的空間',
  hero_subheading: '透過現代照明設計展現優雅氣質。',
  hero_cta_label: '立即購買',
  featured_heading: '特色產品',
  story_body: '我們相信，精心設計的照明方案能夠營造出明亮溫馨的氛圍。',
  shop_heading: '我們的店鋪',
  shop_body:
    '我們以敏銳的現代設計眼光，專注於透過現代壁燈點亮生活空間。我們秉承創新工藝，將藝術性與實用功能完美融合。',
  sanctuary_heading: '將您的家變成光影交錯的聖地。體驗形式與功能之間的微妙相互作用。',
  newsletter_heading: '加入我們的社區',
  newsletter_body: '訂閱即可獲得獨家見解和設計技巧。',
  logo_icon: '/images/luux-mark.svg',
};

const HEADER_LOGO = '/images/luux-logo.jpg';

export const DEFAULT_COOKIE_NOTICE =
  'We use a login cookie and keep your cart in this browser. We do not use advertising cookies. Allow or Reject is remembered for this network.';

async function ensureHeaderLogoColumn(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('site_settings').catch(() => null);
  if (!table || table.logo) return;
  await queryInterface.addColumn('site_settings', 'logo', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: HEADER_LOGO,
  });
}

export async function ensureProductVendorColumns(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('products').catch(() => null);
  if (!table) return;
  if (!table.vendor_url) {
    await queryInterface.addColumn('products', 'vendor_url', {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    });
  }
  if (!table.vendor_contact) {
    await queryInterface.addColumn('products', 'vendor_contact', {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    });
  }
}

export async function ensureCustomerOAuthColumns(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('customers').catch(() => null);
  if (!table) return;
  if (!table.google_sub) {
    await queryInterface.addColumn('customers', 'google_sub', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
  }
  if (!table.facebook_id) {
    await queryInterface.addColumn('customers', 'facebook_id', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
  }
}

const INTEGRATION_COLUMNS: Array<{ name: string; type: typeof DataTypes.STRING | typeof DataTypes.TEXT }> = [
  { name: 'ai_base_url', type: DataTypes.STRING },
  { name: 'ai_api_key', type: DataTypes.TEXT },
  { name: 'ai_model', type: DataTypes.STRING },
  { name: 'stripe_secret_key', type: DataTypes.TEXT },
  { name: 'stripe_publishable_key', type: DataTypes.STRING },
  { name: 'stripe_webhook_secret', type: DataTypes.TEXT },
  { name: 'marketing_api_key', type: DataTypes.TEXT },
  { name: 'facebook_page_id', type: DataTypes.STRING },
  { name: 'facebook_page_token', type: DataTypes.TEXT },
  { name: 'instagram_account_id', type: DataTypes.STRING },
  { name: 'instagram_token', type: DataTypes.TEXT },
  { name: 'threads_user_id', type: DataTypes.STRING },
  { name: 'threads_token', type: DataTypes.TEXT },
];

async function ensureIntegrationColumns(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('site_settings').catch(() => null);
  if (!table) return;
  for (const column of INTEGRATION_COLUMNS) {
    if (table[column.name]) continue;
    await queryInterface.addColumn('site_settings', column.name, {
      type: column.type,
      allowNull: false,
      defaultValue: '',
    });
  }
}

async function ensureCookieNoticeColumn(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('site_settings').catch(() => null);
  if (!table || table.cookie_notice) return;
  await queryInterface.addColumn('site_settings', 'cookie_notice', {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: DEFAULT_COOKIE_NOTICE,
  });
}

function applyEnglishCopy(site: SiteSetting): boolean {
  let changed = false;
  if (!site.logo) {
    site.logo = HEADER_LOGO;
    changed = true;
  }
  (Object.keys(ENGLISH_COPY) as Array<keyof typeof ENGLISH_COPY>).forEach((key) => {
    const current = String(site[key] ?? '');
    if (current === PREVIOUS_ZH[key] || (key === 'slogan' && !current) || (key === 'logo_icon' && (current === '/images/luux-mark.svg' || current === '/images/luux-logo.jpg'))) {
      site[key] = ENGLISH_COPY[key];
      changed = true;
    }
  });
  if (!site.hero_image) {
    site.hero_image = '/uploads/site/hero.jpg';
    changed = true;
  }
  if (site.seo_description.startsWith('現代')) {
    site.seo_description = 'Modern lighting for living spaces. Pendant, wall, table, floor, and ceiling lamps.';
    changed = true;
  }
  return changed;
}

export async function ensureSiteSettings(): Promise<SiteSetting> {
  await ensureHeaderLogoColumn();
  await ensureCookieNoticeColumn();
  await ensureIntegrationColumns();
  const existing = await SiteSetting.findByPk(1);
  if (existing) {
    let changed = applyEnglishCopy(existing);
    if (!existing.cookie_notice) {
      existing.cookie_notice = DEFAULT_COOKIE_NOTICE;
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }
  return SiteSetting.create({
    id: 1,
    company_name: 'LUUX',
    logo: HEADER_LOGO,
    ...ENGLISH_COPY,
    hero_image: '/uploads/site/hero.jpg',
    hero_cta_href: '/collections/pendant',
    featured_handles: JSON.stringify([
      'oboe-pendant-lamp',
      'laputa-pendant-lamp',
      'conduit-pendant-lamp',
      'bowling-pin-pendant-lamp',
    ]),
    story_heading: '',
    contact_email: 'hello@luuxmart.com',
    contact_phone: '+852 6898 8613',
    contact_address: 'Hong Kong',
    facebook_url: 'https://www.facebook.com/',
    instagram_url: 'https://www.instagram.com/',
    threads_url: 'https://www.threads.net/',
    pinterest_url: 'https://www.pinterest.com/',
    seo_title: 'LUUX',
    seo_description: 'Modern lighting for living spaces. Pendant, wall, table, floor, and ceiling lamps.',
    cookie_notice: DEFAULT_COOKIE_NOTICE,
  });
}

const CURRENCIES: Array<{ code: string; name: string; symbol: string; rate: string; decimals: number; sort_order: number }> = [
  { code: 'HKD', name: 'Hong Kong dollar', symbol: 'HK$', rate: '1', decimals: 2, sort_order: 1 },
  { code: 'USD', name: 'US dollar', symbol: 'US$', rate: '0.1282', decimals: 2, sort_order: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: '0.1184', decimals: 2, sort_order: 3 },
  { code: 'GBP', name: 'British pound', symbol: '£', rate: '0.0996', decimals: 2, sort_order: 4 },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$', rate: '0.1955', decimals: 2, sort_order: 5 },
  { code: 'CAD', name: 'Canadian dollar', symbol: 'C$', rate: '0.1788', decimals: 2, sort_order: 6 },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$', rate: '0.1675', decimals: 2, sort_order: 7 },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥', rate: '19.45', decimals: 0, sort_order: 8 },
  { code: 'CNY', name: 'Chinese yuan', symbol: 'CN¥', rate: '0.915', decimals: 2, sort_order: 9 },
  { code: 'TWD', name: 'New Taiwan dollar', symbol: 'NT$', rate: '4.12', decimals: 0, sort_order: 10 },
  { code: 'KRW', name: 'South Korean won', symbol: '₩', rate: '178', decimals: 0, sort_order: 11 },
  { code: 'THB', name: 'Thai baht', symbol: '฿', rate: '4.35', decimals: 2, sort_order: 12 },
  { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM', rate: '0.558', decimals: 2, sort_order: 13 },
  { code: 'NZD', name: 'New Zealand dollar', symbol: 'NZ$', rate: '0.214', decimals: 2, sort_order: 14 },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', rate: '10.75', decimals: 2, sort_order: 15 },
  { code: 'PHP', name: 'Philippine peso', symbol: '₱', rate: '7.35', decimals: 2, sort_order: 16 },
  { code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp', rate: '2040', decimals: 0, sort_order: 17 },
  { code: 'VND', name: 'Vietnamese dong', symbol: '₫', rate: '3260', decimals: 0, sort_order: 18 },
];

export async function ensureCurrencies(): Promise<void> {
  for (const row of CURRENCIES) {
    const existing = await Currency.findByPk(row.code);
    if (existing) {
      existing.name = row.name;
      existing.symbol = row.symbol;
      existing.rate = row.rate;
      existing.decimals = row.decimals;
      existing.sort_order = row.sort_order;
      await existing.save();
    } else {
      await Currency.create(row);
    }
  }
}

export async function ensureShippingRates(): Promise<void> {
  const count = await ShippingRate.count();
  if (count > 0) return;
  await ShippingRate.bulkCreate([
    { name: 'Hong Kong', code: 'hk', amount: '80.00', countries: 'HK', sort_order: 1 },
    { name: 'Worldwide', code: 'world', amount: '280.00', countries: '*', sort_order: 2 },
  ]);
}

export async function ensureDefaultPages(): Promise<void> {
  const pages = [
    {
      title: 'About Us',
      handle: 'about-us',
      kind: 'page' as const,
      body_html: `<h2>Welcome to LUUX</h2>
<p>LUUX is your premier destination for high-quality lighting solutions that transform spaces into beautifully illuminated environments. We specialize in modern, elegant lighting products including ceiling lamps, wall lights, and carefully curated lighting accessories.</p>
<h3>Our Business</h3>
<p>We are a Hong Kong-based lighting retailer committed to bringing premium lighting products to customers worldwide. Our carefully selected collection features contemporary designs that blend functionality with aesthetic appeal, perfect for both residential and commercial spaces.</p>
<h3>Contact Us</h3>
<p><strong>Email:</strong> hello@luuxmart.com<br><strong>Phone:</strong> +852 6898 8613</p>`,
    },
    {
      title: 'Contact Us',
      handle: 'contact',
      kind: 'page' as const,
      body_html: '<p>Email hello@luuxmart.com or call +852 6898 8613. Use the form on this page to send a message.</p>',
    },
    {
      title: 'Privacy policy',
      handle: 'privacy-policy',
      kind: 'policy' as const,
      body_html:
        '<p>LUUX collects the name, email, address, and order details you provide so we can fulfil orders and answer enquiries. We do not sell personal data. Payment cards are processed by Stripe and are not stored on this site.</p>',
    },
    {
      title: 'Refund policy',
      handle: 'refund-policy',
      kind: 'policy' as const,
      body_html:
        '<p>Contact hello@luuxmart.com within 7 days of delivery if an item arrives damaged or incorrect. Made-to-order finishes may not be returnable. Approved refunds are sent to the original payment method.</p>',
    },
    {
      title: 'Terms of service',
      handle: 'terms-of-service',
      kind: 'policy' as const,
      body_html:
        '<p>Orders are an offer to buy. A contract is formed when payment is captured. Prices are in Hong Kong dollars. Risk of loss passes on delivery to the carrier. Governing law is Hong Kong SAR.</p>',
    },
    {
      title: 'Cookie policy',
      handle: 'cookie-policy',
      kind: 'policy' as const,
      body_html: `<p>LUUX uses a login cookie so signed-in customers can see their orders. The cart, shipping choice, and currency are stored in this browser so checkout can finish. These are strictly necessary. The shop works the same if you choose Allow or Reject.</p>
<p>LUUX does not use advertising or analytics cookies. Allow records consent for necessary cookies and for any non-essential cookies that may be added later. Reject records consent for necessary cookies only.</p>
<p>The choice is remembered for the network you used. The site stores a one-way hash of the IP address, not the address itself. A shared office or mobile network shares one choice. A different IP address is asked again.</p>`,
    },
  ];
  for (const page of pages) {
    const found = await Page.findOne({ where: { handle: page.handle } });
    if (!found) await Page.create(page);
  }
}

export { Op };
