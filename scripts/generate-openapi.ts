// Export the OpenAPI contract to docs/openapi.json for Postman / Swagger UI /
// Redoc import. Run: npm run openapi
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApiDocument } from '../src/docs/openapi';

const outDir = join(process.cwd(), 'docs');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'openapi.json');
writeFileSync(outFile, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`Wrote ${outFile}`);
