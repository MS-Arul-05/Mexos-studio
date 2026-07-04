import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  logoutSchema,
} from '../modules/auth/auth.schemas';
import { listProductsSchema, productSlugSchema } from '../modules/products/products.schemas';
import {
  createOrderSchema,
  orderIdSchema,
  trackOrderSchema,
  orderHistoryQuerySchema,
} from '../modules/orders/orders.schemas';
import { checkoutSchema, paymentIdSchema } from '../modules/payments/payments.schemas';
import {
  createCustomOrderSchema,
  updateCustomOrderSchema,
  uploadUrlSchema,
  attachFileSchema,
  customOrderIdSchema,
} from '../modules/custom-orders/custom-orders.schemas';
import {
  createProductSchema,
  updateProductSchema,
  createOfferSchema,
  updateOfferSchema,
  updateOrderStatusSchema,
  customOrderQuerySchema,
  idParamSchema,
} from '../modules/admin/admin.schemas';
import { createContactSchema } from '../modules/contact/contact.schemas';
import { chatLinkQuerySchema } from '../modules/whatsapp/whatsapp.schemas';
import {
  updateProfileSchema,
  createAddressSchema,
  addressIdSchema,
} from '../modules/account/account.schemas';

/**
 * OpenAPI 3.0 document generated from the SAME Zod schemas the API validates
 * with, so the contract cannot drift from the implementation (G3).
 *
 * - Request bodies/params/queries reference the module schemas directly.
 * - Responses use the standard envelope { success, data | error } — response
 *   payload shapes are documented at the envelope level (the envelope, status
 *   codes, and error codes are the stable public contract).
 *
 * Served at GET /api/v1/openapi.json; also exported to docs/openapi.json via
 * `npm run openapi` for Postman / Swagger UI / Redoc import.
 */
// Prototype patch adding .openapi() — applies to the already-imported module
// schemas too, so they can be registered as named components.
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Security schemes ──
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Access token from POST /auth/otp/verify (15 min TTL).',
});
const adminKey = registry.registerComponent('securitySchemes', 'adminKey', {
  type: 'apiKey',
  in: 'header',
  name: 'x-admin-key',
  description: 'Admin API key (labeled keys via ADMIN_API_KEYS).',
});

// ── Response envelope ──
const errorEnvelope = registry.register(
  'ErrorEnvelope',
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string().describe('Stable machine-readable error code, e.g. INSUFFICIENT_STOCK'),
      message: z.string(),
      details: z.unknown().optional().describe('Zod field issues on VALIDATION_ERROR'),
    }),
  }),
);
const successEnvelope = registry.register(
  'SuccessEnvelope',
  z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: z.unknown().describe('Endpoint-specific payload'),
  }),
);

const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });

// Query/params must be plain objects for parameter generation. Cross-field
// .refine() rules aren't expressible as OpenAPI parameters — unwrap to the
// inner object (the refinement still runs at request time via validate()).
function unwrapEffects(schema: z.ZodTypeAny): z.AnyZodObject {
  let s = schema;
  while (s instanceof z.ZodEffects) s = s.innerType();
  return s as z.AnyZodObject;
}

function ok(description: string, status = 200): RouteConfig['responses'] {
  return {
    [status]: { description, ...json(successEnvelope) },
    400: { description: 'Validation or domain error', ...json(errorEnvelope) },
  };
}

/** Register a route with envelope responses + optional error statuses. */
function route(cfg: {
  method: RouteConfig['method'];
  path: string;
  tag: string;
  summary: string;
  security?: 'bearer' | 'admin' | 'optionalBearer';
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  successStatus?: number;
  extraErrors?: Record<number, string>;
}): void {
  const responses = ok(cfg.summary, cfg.successStatus ?? 200);
  if (cfg.security === 'bearer')
    responses[401] = { description: 'Missing/invalid access token', ...json(errorEnvelope) };
  if (cfg.security === 'admin')
    responses[401] = { description: 'Missing/invalid admin key', ...json(errorEnvelope) };
  for (const [status, description] of Object.entries(cfg.extraErrors ?? {})) {
    responses[Number(status)] = { description, ...json(errorEnvelope) };
  }
  registry.registerPath({
    method: cfg.method,
    path: cfg.path,
    tags: [cfg.tag],
    summary: cfg.summary,
    security:
      cfg.security === 'bearer'
        ? [{ [bearerAuth.name]: [] }]
        : cfg.security === 'admin'
          ? [{ [adminKey.name]: [] }]
          : cfg.security === 'optionalBearer'
            ? [{}, { [bearerAuth.name]: [] }]
            : undefined,
    request: {
      ...(cfg.params ? { params: unwrapEffects(cfg.params) } : {}),
      ...(cfg.query ? { query: unwrapEffects(cfg.query) } : {}),
      ...(cfg.body ? { body: json(cfg.body) } : {}),
    },
    responses,
  });
}

// ── Health ──
route({ method: 'get', path: '/health', tag: 'Health', summary: 'Combined health status' });
route({
  method: 'get',
  path: '/health/live',
  tag: 'Health',
  summary: 'Liveness probe (no dependency checks)',
});
route({
  method: 'get',
  path: '/health/ready',
  tag: 'Health',
  summary: 'Readiness probe (DB reachable)',
  extraErrors: { 503: 'Dependencies not ready' },
});

// ── Auth ──
route({
  method: 'post',
  path: '/auth/otp/send',
  tag: 'Auth',
  summary: 'Send a login OTP (rate limited per number + per IP)',
  body: sendOtpSchema,
  extraErrors: { 429: 'Rate limited' },
});
route({
  method: 'post',
  path: '/auth/otp/verify',
  tag: 'Auth',
  summary: 'Verify OTP; returns access + refresh tokens',
  body: verifyOtpSchema,
  extraErrors: { 401: 'Invalid or expired OTP', 429: 'Rate limited' },
});
route({
  method: 'post',
  path: '/auth/refresh',
  tag: 'Auth',
  summary: 'Rotate refresh token (reuse detection revokes the family)',
  body: refreshSchema,
  extraErrors: { 401: 'Invalid, expired, or reused refresh token' },
});
route({
  method: 'post',
  path: '/auth/logout',
  tag: 'Auth',
  summary: 'Revoke a refresh token',
  body: logoutSchema,
});
route({
  method: 'post',
  path: '/auth/logout-all',
  tag: 'Auth',
  summary: 'Revoke all sessions for the authenticated user',
  security: 'bearer',
});

// ── Catalog ──
route({
  method: 'get',
  path: '/products',
  tag: 'Catalog',
  summary: 'List active products (filter + paginate)',
  query: listProductsSchema,
});
route({
  method: 'get',
  path: '/products/{slug}',
  tag: 'Catalog',
  summary: 'Product detail by slug',
  params: productSlugSchema,
  extraErrors: { 404: 'Product not found' },
});
route({ method: 'get', path: '/categories', tag: 'Catalog', summary: 'Category tree' });
route({ method: 'get', path: '/offers', tag: 'Catalog', summary: 'Active offers / banners' });

// ── Custom orders ──
route({
  method: 'post',
  path: '/custom-orders',
  tag: 'Custom orders',
  summary: 'Create a draft custom order (guest or authenticated)',
  security: 'optionalBearer',
  body: createCustomOrderSchema,
  successStatus: 201,
});
route({
  method: 'get',
  path: '/custom-orders/{id}',
  tag: 'Custom orders',
  summary: 'Fetch a custom order (owner or capability-by-id)',
  security: 'optionalBearer',
  params: customOrderIdSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'patch',
  path: '/custom-orders/{id}',
  tag: 'Custom orders',
  summary: 'Update a DRAFT custom order',
  security: 'optionalBearer',
  params: customOrderIdSchema,
  body: updateCustomOrderSchema,
  extraErrors: { 409: 'No longer editable' },
});
route({
  method: 'post',
  path: '/custom-orders/{id}/upload-url',
  tag: 'Custom orders',
  summary: 'Presigned upload URL for a design file (15 min TTL, MIME allowlist)',
  security: 'optionalBearer',
  params: customOrderIdSchema,
  body: uploadUrlSchema,
});
route({
  method: 'patch',
  path: '/custom-orders/{id}/attach-file',
  tag: 'Custom orders',
  summary: 'Attach an uploaded design file (own-storage URLs only)',
  security: 'optionalBearer',
  params: customOrderIdSchema,
  body: attachFileSchema,
});
route({
  method: 'post',
  path: '/custom-orders/{id}/submit',
  tag: 'Custom orders',
  summary: 'Submit draft (SUBMITTED, or QUOTED for INSTANT pricing)',
  security: 'optionalBearer',
  params: customOrderIdSchema,
  extraErrors: { 409: 'Not submittable' },
});

// ── Orders ──
route({
  method: 'post',
  path: '/orders',
  tag: 'Orders',
  summary: 'Create order from cart — totals recomputed server-side, stock reserved atomically',
  security: 'optionalBearer',
  body: createOrderSchema,
  successStatus: 201,
  extraErrors: { 409: 'INSUFFICIENT_STOCK or COUPON_ALREADY_USED' },
});
route({
  method: 'get',
  path: '/orders/track',
  tag: 'Orders',
  summary: 'Guest order tracking by id + mobile',
  query: trackOrderSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'get',
  path: '/orders/{id}',
  tag: 'Orders',
  summary: 'Order detail (owner or guest-order token)',
  security: 'optionalBearer',
  params: orderIdSchema,
  extraErrors: { 404: 'Not found' },
});

// ── Payments ──
route({
  method: 'post',
  path: '/payments/checkout',
  tag: 'Payments',
  summary: 'Create a gateway checkout session for a payable order',
  security: 'optionalBearer',
  body: checkoutSchema,
  extraErrors: { 409: 'Already paid / not payable' },
});
route({
  method: 'post',
  path: '/payments/webhook',
  tag: 'Payments',
  summary: 'Gateway webhook (HMAC over raw body; no auth header)',
  extraErrors: { 400: 'Invalid signature' },
});
route({
  method: 'post',
  path: '/payments/{id}/retry',
  tag: 'Payments',
  summary: 'Regenerate a checkout session for a failed payment',
  security: 'optionalBearer',
  params: paymentIdSchema,
  extraErrors: { 409: 'Already paid' },
});

// ── Account ──
route({
  method: 'get',
  path: '/account/me',
  tag: 'Account',
  summary: 'Authenticated profile (incl. address book)',
  security: 'bearer',
});
route({
  method: 'patch',
  path: '/account/me',
  tag: 'Account',
  summary: 'Set/update display name (post-OTP onboarding)',
  security: 'bearer',
  body: updateProfileSchema,
});
route({
  method: 'get',
  path: '/account/orders',
  tag: 'Account',
  summary: 'Authenticated order history (paginated)',
  security: 'bearer',
  query: orderHistoryQuerySchema,
});
route({
  method: 'post',
  path: '/account/addresses',
  tag: 'Account',
  summary: 'Add an address (first or explicit default becomes default)',
  security: 'bearer',
  body: createAddressSchema,
  successStatus: 201,
});
route({
  method: 'delete',
  path: '/account/addresses/{id}',
  tag: 'Account',
  summary: 'Delete an owned address',
  security: 'bearer',
  params: addressIdSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'get',
  path: '/account/custom-orders',
  tag: 'Account',
  summary: "User's saved custom designs",
  security: 'bearer',
});

// ── WhatsApp ──
route({
  method: 'get',
  path: '/whatsapp/chat-link',
  tag: 'WhatsApp',
  summary: 'Build a wa.me click-to-chat deep link',
  query: chatLinkQuerySchema,
});
route({
  method: 'get',
  path: '/whatsapp/webhook',
  tag: 'WhatsApp',
  summary: 'Meta webhook verification handshake',
});
route({
  method: 'post',
  path: '/whatsapp/webhook',
  tag: 'WhatsApp',
  summary: 'Meta webhook receiver (signature-verified)',
});

// ── Contact ──
route({
  method: 'post',
  path: '/contact',
  tag: 'Contact',
  summary: 'Submit a contact inquiry',
  body: createContactSchema,
  successStatus: 201,
});

// ── Admin (x-admin-key) ──
route({
  method: 'post',
  path: '/admin/products',
  tag: 'Admin',
  summary: 'Create product',
  security: 'admin',
  body: createProductSchema,
  successStatus: 201,
});
route({
  method: 'put',
  path: '/admin/products/{id}',
  tag: 'Admin',
  summary: 'Update product',
  security: 'admin',
  params: idParamSchema,
  body: updateProductSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'delete',
  path: '/admin/products/{id}',
  tag: 'Admin',
  summary: 'Delete (deactivate) product',
  security: 'admin',
  params: idParamSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'post',
  path: '/admin/offers',
  tag: 'Admin',
  summary: 'Create offer',
  security: 'admin',
  body: createOfferSchema,
  successStatus: 201,
});
route({
  method: 'put',
  path: '/admin/offers/{id}',
  tag: 'Admin',
  summary: 'Update offer',
  security: 'admin',
  params: idParamSchema,
  body: updateOfferSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'delete',
  path: '/admin/offers/{id}',
  tag: 'Admin',
  summary: 'Delete offer',
  security: 'admin',
  params: idParamSchema,
  extraErrors: { 404: 'Not found' },
});
route({
  method: 'patch',
  path: '/admin/orders/{id}/status',
  tag: 'Admin',
  summary: 'Transition order status (audited; notifies customer)',
  security: 'admin',
  params: idParamSchema,
  body: updateOrderStatusSchema,
  extraErrors: { 404: 'Not found', 409: 'Invalid transition / terminal state' },
});
route({
  method: 'get',
  path: '/admin/custom-orders',
  tag: 'Admin',
  summary: 'Custom-order queue (needs quote/confirmation)',
  security: 'admin',
  query: customOrderQuerySchema,
});

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Custom T-Shirt Brand API',
      version: '1.0.0',
      description:
        'REST API for the custom T-shirt e-commerce platform. All responses use the ' +
        '`{ success, message?, data }` / `{ success: false, error }` envelope. ' +
        'Money is always a decimal string; order totals are recomputed server-side.',
    },
    servers: [
      { url: '/api/v1', description: 'Versioned base path (canonical)' },
      { url: '/api', description: 'Unversioned alias (backward compatible)' },
    ],
  });
}
