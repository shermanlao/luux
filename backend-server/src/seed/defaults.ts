import { Op } from 'sequelize';
import { hashPassword } from '../lib/adminPassword';
import { DEFAULT_ADMIN_PASSWORD } from '../lib/shared/production-secrets';
import AdminUser from '../models/AdminUser';
import HelpTip from '../models/HelpTip';
import Page from '../models/Page';
import ShippingRate from '../models/ShippingRate';
import SiteSetting from '../models/SiteSetting';

const HELP_TIPS: Array<{ helpKey: string; title: string; body: string }> = [
  { helpKey: 'nav.home', title: 'Home', body: 'Open the LUUX homepage.' },
  { helpKey: 'nav.shop', title: 'Shop', body: 'Browse lighting collections.' },
  { helpKey: 'nav.about', title: 'About us', body: 'Read about LUUX.' },
  { helpKey: 'nav.contact', title: 'Contact us', body: 'Send a question or find our email and phone.' },
  { helpKey: 'nav.search', title: 'Search', body: 'Search products by name.' },
  { helpKey: 'nav.account', title: 'Account', body: 'Sign in to see your orders.' },
  { helpKey: 'nav.cart', title: 'Cart', body: 'Open your shopping cart.' },
  { helpKey: 'nav.logo', title: 'LUUX', body: 'Return to the homepage.' },
  { helpKey: 'home.shop_now', title: 'Shop now', body: 'Open the shop and browse lamps.' },
  { helpKey: 'home.learn_more', title: 'Learn more', body: 'Read the About us page.' },
  { helpKey: 'home.newsletter', title: 'Sign up', body: 'Join the LUUX email list.' },
  { helpKey: 'product.add_to_cart', title: 'Add to cart', body: 'Add this lamp and the selected options to your cart.' },
  { helpKey: 'product.choose', title: 'Choose', body: 'Open this product and pick a finish or size.' },
  { helpKey: 'product.gallery.prev', title: 'Previous photo', body: 'Show the previous product photo.' },
  { helpKey: 'product.gallery.next', title: 'Next photo', body: 'Show the next product photo.' },
  { helpKey: 'product.gallery.thumb', title: 'Photo', body: 'Show this product photo.' },
  { helpKey: 'cart.checkout', title: 'Checkout', body: 'Enter your address and pay with Stripe.' },
  { helpKey: 'cart.update', title: 'Update cart', body: 'Change the quantity in your cart.' },
  { helpKey: 'cart.remove', title: 'Remove', body: 'Take this item out of your cart.' },
  { helpKey: 'checkout.pay', title: 'Pay with Stripe', body: 'Continue to Stripe to pay by card. Card details stay on Stripe.' },
  { helpKey: 'account.login', title: 'Sign in', body: 'Sign in to see past orders.' },
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
  { helpKey: 'admin.nav.shipping', title: 'Shipping', body: 'Set the Hong Kong and worldwide flat rates.' },
  { helpKey: 'admin.nav.orders', title: 'Orders', body: 'See paid Stripe orders and mark them fulfilled.' },
  { helpKey: 'admin.nav.inquiries', title: 'Inquiries', body: 'Read messages sent from the contact form.' },
  { helpKey: 'admin.product.save', title: 'Save product', body: 'Save this product, its variants, and photos.' },
  { helpKey: 'admin.product.new', title: 'Add product', body: 'Create a new lamp.' },
  { helpKey: 'admin.product.delete', title: 'Delete product', body: 'Remove this lamp from the shop.' },
  { helpKey: 'admin.product.edit', title: 'Edit', body: 'Open this product in the editor.' },
  { helpKey: 'admin.variant.add', title: 'Add variant', body: 'Add another size, colour, or finish.' },
  { helpKey: 'admin.image.upload', title: 'Upload photo', body: 'Add a product photo from your computer.' },
  { helpKey: 'admin.collection.save', title: 'Save collection', body: 'Save this collection.' },
  { helpKey: 'admin.page.save', title: 'Save page', body: 'Save this page text.' },
  { helpKey: 'admin.settings.save', title: 'Save settings', body: 'Save homepage and contact details.' },
  { helpKey: 'admin.shipping.save', title: 'Save rates', body: 'Save the shipping amounts.' },
  { helpKey: 'admin.order.fulfill', title: 'Mark fulfilled', body: 'Mark this paid order as shipped.' },
  { helpKey: 'admin.order.cancel', title: 'Cancel order', body: 'Cancel this order. Stripe refunds are done in the Stripe dashboard.' },
  { helpKey: 'admin.confirm.cancel', title: 'Cancel', body: 'Close this confirmation.' },
  { helpKey: 'admin.confirm.delete', title: 'Delete', body: 'Permanently delete this record.' },
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
  const email = String(process.env.ADMIN_EMAIL || 'admin@luux.local').trim().toLowerCase();
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

export async function ensureSiteSettings(): Promise<SiteSetting> {
  const existing = await SiteSetting.findByPk(1);
  if (existing) return existing;
  return SiteSetting.create({
    id: 1,
    company_name: 'LUUX',
    slogan: '',
    hero_heading: 'Illuminate your space',
    hero_subheading: 'Embrace elegance through modern lighting design.',
    hero_image: '/uploads/site/hero.jpg',
    hero_cta_label: 'Shop now',
    hero_cta_href: '/collections/pendant',
    featured_heading: 'Featured products',
    featured_handles: JSON.stringify([
      'oboe-pendant-lamp',
      'laputa-pendant-lamp',
      'conduit-pendant-lamp',
      'bowling-pin-pendant-lamp',
    ]),
    story_heading: '',
    story_body:
      'We believe in creating luminous atmospheres through thoughtfully designed lighting solutions.',
    shop_heading: 'Our shop',
    shop_body:
      'With a keen eye for contemporary design, our store specializes in illuminating living spaces through modern wall lamps. We embrace innovative craftsmanship that marries artistry with function.',
    sanctuary_heading:
      'Transform your home into a sanctuary of light and shadow. Experience the subtle interplay of form and function.',
    newsletter_heading: 'Join our community',
    newsletter_body: 'Subscribe for exclusive insights and design tips.',
    contact_email: 'hello@luuxmart.com',
    contact_phone: '+852 6898 8613',
    contact_address: 'Hong Kong',
    facebook_url: 'https://www.facebook.com/',
    instagram_url: 'https://www.instagram.com/',
    threads_url: 'https://www.threads.net/',
    pinterest_url: 'https://www.pinterest.com/',
    seo_title: 'LUUX',
    seo_description: 'Modern lighting for living spaces. Pendant, wall, table, floor, and ceiling lamps.',
    logo_icon: '/images/luux-mark.svg',
  });
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
  ];
  for (const page of pages) {
    const found = await Page.findOne({ where: { handle: page.handle } });
    if (!found) await Page.create(page);
  }
}

export { Op };
