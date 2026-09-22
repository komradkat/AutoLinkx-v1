/**
 * Safe redirect destinations (A-06).
 *
 * `next` travels through links and emails, so it is attacker-supplied. These
 * cases are the ones that turn a login page into an open redirect.
 */
import { describe, expect, it } from 'vitest';

import { safeRedirect } from '../../src/server/auth/redirects';

describe('safeRedirect', () => {
  it('keeps an allowed same-origin path', () => {
    expect(safeRedirect('/profile')).toBe('/profile');
    expect(safeRedirect('/dashboard/listings/new')).toBe('/dashboard/listings/new');
    expect(safeRedirect('/cars?make=toyota')).toBe('/cars?make=toyota');
  });

  it('falls back when nothing is supplied', () => {
    expect(safeRedirect(null)).toBe('/dashboard');
    expect(safeRedirect('')).toBe('/dashboard');
    expect(safeRedirect(undefined)).toBe('/dashboard');
  });

  it('refuses absolute URLs to other sites', () => {
    expect(safeRedirect('https://evil.example/steal')).toBe('/dashboard');
    expect(safeRedirect('http://evil.example')).toBe('/dashboard');
  });

  it('refuses protocol-relative and backslash forms', () => {
    // Browsers read `//evil.example` as another origin, and some parsers
    // normalise `/\` to `//`.
    expect(safeRedirect('//evil.example/path')).toBe('/dashboard');
    expect(safeRedirect('/\\evil.example/path')).toBe('/dashboard');
  });

  it('refuses javascript and data URLs', () => {
    expect(safeRedirect('javascript:alert(1)')).toBe('/dashboard');
    expect(safeRedirect('data:text/html,<script>')).toBe('/dashboard');
  });

  it('refuses a path outside the allowlist', () => {
    expect(safeRedirect('/admin')).toBe('/dashboard');
    expect(safeRedirect('/auth/confirm')).toBe('/dashboard');
  });

  it('refuses traversal that escapes the allowlist', () => {
    expect(safeRedirect('/cars/../admin')).toBe('/dashboard');
  });

  it('does not treat a prefix as a path boundary', () => {
    // `/carsomething` must not pass because `/cars` is allowed.
    expect(safeRedirect('/carsomething')).toBe('/dashboard');
  });

  it('honours an explicit fallback', () => {
    expect(safeRedirect('https://evil.example', '/login')).toBe('/login');
  });
});
