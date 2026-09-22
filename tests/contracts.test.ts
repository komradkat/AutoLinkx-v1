/**
 * Guards for the shared contracts (A-01).
 *
 * These test the two things in `src/contracts` that can actually be wrong:
 * the lifecycle data must match MVP.md, and the modules must stay importable
 * from a Client Component. They prove nothing about the MVP itself.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  LISTING_ACTION_RULES,
  LISTING_STATUSES,
  LISTING_TRANSITIONS,
  allowedActionsFor,
  canTransition,
  type ListingStatus,
} from '../src/contracts/listings';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractsDir = join(repoRoot, 'src', 'contracts');

/** Every `from | to | who` row of the MVP lifecycle table, rows expanded. */
function transitionsFromMvp(): string[] {
  const mvp = readFileSync(join(repoRoot, 'MVP.md'), 'utf8');
  const section = mvp.split('## 6. Listing lifecycle')[1]?.split('\n## ')[0];
  if (!section) throw new Error('MVP.md section 6 not found');

  const rows: string[] = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|') || line.includes('---') || line.includes('Starting status')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const [from, to, who] = cells;
    if (!from || !to || !who) continue;
    const actor = who.toLowerCase().includes('administrator') ? 'administrator' : 'owner';
    for (const single of from.split('/').map((value) => value.trim())) {
      rows.push(`${single}->${to} (${actor})`);
    }
  }
  return rows.sort();
}

describe('listing lifecycle', () => {
  it('matches the transition table in MVP.md', () => {
    const declared = LISTING_TRANSITIONS.map((t) => `${t.from}->${t.to} (${t.actor})`).sort();
    expect(declared).toEqual(transitionsFromMvp());
  });

  it('uses exactly the six agreed statuses', () => {
    const used = new Set<string>();
    for (const { from, to } of LISTING_TRANSITIONS) {
      used.add(from);
      used.add(to);
    }
    expect([...used].sort()).toEqual([...LISTING_STATUSES].sort());
  });

  it('denies transitions outside the table', () => {
    // Publication, un-selling, and un-rejecting must never be direct moves.
    expect(canTransition('draft', 'published')).toBe(false);
    expect(canTransition('sold', 'published')).toBe(false);
    expect(canTransition('rejected', 'published')).toBe(false);
    expect(canTransition('archived', 'published')).toBe(false);
    expect(canTransition('published', 'draft')).toBe(false);
    expect(canTransition('draft', 'draft')).toBe(false);
  });

  it('allows every action only from a status that can reach its result', () => {
    for (const [action, rule] of Object.entries(LISTING_ACTION_RULES)) {
      for (const status of rule.from) {
        const reachable = LISTING_TRANSITIONS.some(
          (t) => t.from === status && t.actor === rule.actor,
        );
        // `save` may legitimately leave the status unchanged.
        if (action === 'save') continue;
        expect(reachable, `${action} from ${status}`).toBe(true);
      }
    }
  });

  it('offers owners no moderation controls and administrators no owner controls', () => {
    expect(allowedActionsFor('pending_review', 'owner')).toEqual(['save', 'withdraw', 'archive']);
    expect(allowedActionsFor('pending_review', 'administrator')).toEqual(['approve', 'reject']);
    expect(allowedActionsFor('published', 'administrator')).toEqual(['remove']);
    expect(allowedActionsFor('archived', 'administrator')).toEqual([]);
  });

  it('requires a reason for every rejection or removal', () => {
    expect(LISTING_ACTION_RULES.reject.requiresReason).toBe(true);
    expect(LISTING_ACTION_RULES.remove.requiresReason).toBe(true);
  });
});

describe('contract modules stay client-safe', () => {
  const files = readdirSync(contractsDir).filter((name) => name.endsWith('.ts'));

  it('ships every module', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s imports nothing outside src/contracts', (file) => {
    const source = readFileSync(join(contractsDir, file), 'utf8');
    const specifiers = [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1]);
    for (const specifier of specifiers) {
      expect(specifier, `${file} imports ${specifier}`).toMatch(/^\.\//);
    }
  });

  it.each(files)('%s reads no server configuration', (file) => {
    const source = readFileSync(join(contractsDir, file), 'utf8');
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/server-only/);
  });

  it.each(files)('%s lets no client assign an identity', (file) => {
    const source = readFileSync(join(contractsDir, file), 'utf8');
    const forbidden = /^\s*(sellerId|buyerId|ownerId|actorId|userId|reporterId|isAdministrator|role)\b/m;
    for (const block of source.matchAll(/export interface \w*Input \{([\s\S]*?)\n\}/g)) {
      expect(block[1], `${file}: ${block[0].slice(0, 60)}`).not.toMatch(forbidden);
    }
  });
});

describe('status coverage', () => {
  it('lets an owner archive from every status except archived', () => {
    const archivable = LISTING_STATUSES.filter((status): status is ListingStatus => status !== 'archived');
    for (const status of archivable) {
      expect(allowedActionsFor(status, 'owner')).toContain('archive');
    }
    expect(allowedActionsFor('archived', 'owner')).toEqual(['restore']);
  });
});
