import './models';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { assertProductionSecrets } from './lib/shared/production-secrets';
import { uploadsRoot } from './lib/uploads';
import publicRoutes from './routes/publicRoutes';
import accountRoutes from './routes/accountRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import { stripeWebhook } from './routes/stripeWebhook';
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminCatalogRoutes from './routes/adminCatalogRoutes';
import adminContentRoutes from './routes/adminContentRoutes';
import adminOrderRoutes from './routes/adminOrderRoutes';
import uploadRoutes from './routes/uploadRoutes';

const app = express();
const PORT = Number(process.env.PORT || 3333);
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:3000';

app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: [SITE_ORIGIN, 'http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:3001'],
    credentials: true,
  })
);
app.use(cookieParser());

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  void stripeWebhook(req, res);
});

app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use('/uploads', express.static(uploadsRoot));

app.use('/api', publicRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminCatalogRoutes);
app.use('/api/admin', adminContentRoutes);
app.use('/api/admin', adminOrderRoutes);
app.use('/api/admin/upload', uploadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'luux-api' });
});

assertProductionSecrets();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`LUUX API running on 127.0.0.1:${PORT}`);
});

export default app;
