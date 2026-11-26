import Collection from '../models/Collection';
import Page from '../models/Page';
import Product from '../models/Product';
import SiteSetting from '../models/SiteSetting';

type TimestampRow = { updatedAt?: Date; createdAt?: Date };

function rowTimestamp(row: { get: (options?: { plain: boolean }) => TimestampRow }): string {
  const plain = row.get({ plain: true });
  const value = plain.updatedAt || plain.createdAt;
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

export type SitemapPayload = {
  generatedAt: string;
  static: Array<{ path: string; lastModified: string }>;
  collections: Array<{ path: string; lastModified: string }>;
  products: Array<{ path: string; lastModified: string }>;
  pages: Array<{ path: string; lastModified: string }>;
};

export async function buildSitemapPayload(): Promise<SitemapPayload> {
  const [site, products, collections, pages] = await Promise.all([
    SiteSetting.findByPk(1, { attributes: ['updatedAt', 'createdAt'] }),
    Product.findAll({
      where: { published: true },
      attributes: ['handle', 'updatedAt', 'createdAt'],
      order: [['id', 'ASC']],
    }),
    Collection.findAll({
      where: { published: true },
      attributes: ['handle', 'updatedAt', 'createdAt'],
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
    Page.findAll({ attributes: ['handle', 'kind', 'updatedAt', 'createdAt'], order: [['id', 'ASC']] }),
  ]);

  const collectionLast = collections.reduce<Date | null>((max, row) => {
    const plain = row.get({ plain: true }) as TimestampRow;
    const stamp = plain.updatedAt || plain.createdAt;
    if (!stamp) return max;
    return !max || stamp > max ? stamp : max;
  }, null);

  return {
    generatedAt: new Date().toISOString(),
    products: products.map((row) => ({
      path: `/products/${row.handle}`,
      lastModified: rowTimestamp(row),
    })),
    collections: [
      { path: '/collections', lastModified: (collectionLast || new Date()).toISOString() },
      { path: '/collections/all', lastModified: (collectionLast || new Date()).toISOString() },
      ...collections.map((row) => ({
        path: `/collections/${row.handle}`,
        lastModified: rowTimestamp(row),
      })),
    ],
    pages: pages.map((row) => ({
      path: row.kind === 'policy' ? `/policies/${row.handle}` : `/pages/${row.handle}`,
      lastModified: rowTimestamp(row),
    })),
    static: [{ path: '/', lastModified: site ? rowTimestamp(site) : new Date().toISOString() }],
  };
}