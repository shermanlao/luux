import './lib/loadEnv';
import { Sequelize } from 'sequelize';
import path from 'path';

export type DbDialect = 'sqlite' | 'postgres';

function envFlag(name: string): boolean {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function resolveDbDialect(): DbDialect {
  const url = String(process.env.DATABASE_URL || '').trim();
  const explicit = String(process.env.DB_DIALECT || '').trim().toLowerCase();
  if (explicit === 'postgres' || explicit === 'postgresql') return 'postgres';
  if (explicit === 'sqlite') return 'sqlite';
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgres';
  return 'sqlite';
}

function postgresSsl() {
  if (!envFlag('DATABASE_SSL')) return undefined;
  return {
    ssl: {
      require: true,
      rejectUnauthorized: !envFlag('DATABASE_SSL_INSECURE'),
    },
  };
}

function buildSequelize(): Sequelize {
  const dialect = resolveDbDialect();
  const logging = envFlag('DB_LOGGING') ? console.log : false;

  if (dialect === 'postgres') {
    const url = String(process.env.DATABASE_URL || '').trim();
    const dialectOptions = postgresSsl();
    const pool = { max: 10, min: 0, acquire: 30000, idle: 10000 };

    if (url) {
      return new Sequelize(url, {
        dialect: 'postgres',
        logging,
        dialectOptions,
        pool,
      });
    }

    return new Sequelize({
      dialect: 'postgres',
      host: process.env.PGHOST || process.env.DATABASE_HOST || '127.0.0.1',
      port: Number(process.env.PGPORT || process.env.DATABASE_PORT || 5432),
      database: process.env.PGDATABASE || process.env.DATABASE_NAME || 'luux',
      username: process.env.PGUSER || process.env.DATABASE_USER || 'luux',
      password: process.env.PGPASSWORD || process.env.DATABASE_PASSWORD || '',
      logging,
      dialectOptions,
      pool,
    });
  }

  return new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_PATH || path.join(__dirname, '..', 'database.sqlite'),
    logging,
  });
}

const sequelize = buildSequelize();

export const dbDialect: DbDialect = sequelize.getDialect() === 'postgres' ? 'postgres' : 'sqlite';

export async function testConnection(): Promise<void> {
  await sequelize.authenticate();
  console.log(`Database connected (${dbDialect}).`);
}

testConnection().catch((error) => {
  console.error('Unable to connect to the database:', error);
});

export default sequelize;
