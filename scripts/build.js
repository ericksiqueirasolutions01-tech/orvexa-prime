const { execSync } = require('child_process');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'orvexa_prime_super_secret_jwt_key_2026_production_grade_token_guard';
process.env.ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

console.log('⚡ [ORVEXA BUILD] Sincronizando schema do banco...');
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });

console.log('⚡ [ORVEXA BUILD] Gerando cliente Prisma...');
execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

console.log('⚡ [ORVEXA BUILD] Compilando Next.js em modo produção...');
execSync('npx next build', { stdio: 'inherit', env: process.env });

