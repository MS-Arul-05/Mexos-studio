import { Router } from 'express';
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { productsRoutes } from './modules/products/products.routes';
import { categoriesRoutes } from './modules/categories/categories.routes';
import { offersRoutes } from './modules/offers/offers.routes';
import { customOrdersRoutes } from './modules/custom-orders/custom-orders.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { accountRoutes } from './modules/account/account.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { contactRoutes } from './modules/contact/contact.routes';
import { buildOpenApiDocument } from './docs/openapi';

/**
 * Root API router. Each module mounts its own sub-router here.
 * New modules (custom-orders, orders, ...) are added in later steps.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/offers', offersRoutes);
apiRouter.use('/custom-orders', customOrdersRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/account', accountRoutes);
apiRouter.use('/payments', paymentsRoutes);
apiRouter.use('/whatsapp', whatsappRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/contact', contactRoutes);

// OpenAPI contract, generated from the same Zod schemas that validate requests
// (G3). Built once on first request; also exported via `npm run openapi`.
let openApiDoc: object | null = null;
apiRouter.get('/openapi.json', (_req, res) => {
  openApiDoc ??= buildOpenApiDocument();
  res.json(openApiDoc);
});
