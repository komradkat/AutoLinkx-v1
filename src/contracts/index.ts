/**
 * AutoLinkX shared contracts (task A-01).
 *
 * Import from `@/contracts` in both Server and Client Components. Everything
 * here is plain, serializable TypeScript with no runtime dependencies, no
 * Supabase clients, and no configuration reads, so it can cross the
 * server/client boundary safely.
 *
 * These are proposed interfaces. No service, table, or handler implements them
 * yet; see docs/contracts.md for the agreed semantics and example payloads.
 */
export * from './common';
export * from './accounts';
export * from './listings';
export * from './media';
export * from './interactions';
export * from './moderation';
