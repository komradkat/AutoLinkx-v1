/**
 * Profile privacy and administrator membership (A-05).
 *
 * Every assertion runs as an ordinary signed-in user or as an anonymous
 * caller, through the Data API with the publishable key — the same door an
 * attacker would use. The service role appears only in setup.
 *
 * Skipped when local Supabase is not running; A-07 makes these mandatory.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  anonymousClient,
  createActor,
  deleteActors,
  grantAdministrator,
  localStackIsUp,
  offContract,
  type Actor,
} from '../helpers/actors';

const stackIsUp = await localStackIsUp();

let sellerA: Actor;
let sellerB: Actor;
let administrator: Actor;

describe.skipIf(!stackIsUp)('profiles, contacts and membership', () => {
  beforeAll(async () => {
    [sellerA, sellerB, administrator] = await Promise.all([
      createActor('seller-a', 'Ana Reyes'),
      createActor('seller-b', 'Ben Santos'),
      createActor('admin', 'Ops Admin'),
    ]);
    await grantAdministrator(administrator.id);
  }, 30_000);

  afterAll(async () => {
    await deleteActors(sellerA, sellerB, administrator);
  }, 30_000);

  describe('initialisation', () => {
    it('creates a profile for a new account, using the sign-up display name', async () => {
      const { data, error } = await anonymousClient()
        .from('profiles')
        .select('user_id, display_name, location')
        .eq('user_id', sellerA.id)
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({ display_name: 'Ana Reyes', location: null });
    });

    it('publishes no contact value by default', async () => {
      const { data } = await anonymousClient()
        .from('profiles')
        .select('published_email, published_phone')
        .eq('user_id', sellerA.id)
        .single();

      expect(data).toEqual({ published_email: null, published_phone: null });
    });
  });

  describe('private data stays private', () => {
    it('hides the contacts table from a signed-in user', async () => {
      const { error } = await offContract(sellerA.client)
        .schema('app_private')
        .from('user_contacts')
        .select('contact_email');

      expect(error).not.toBeNull();
    });

    it('hides administrator membership from a signed-in user', async () => {
      const { error } = await offContract(sellerA.client)
        .schema('app_private')
        .from('administrators')
        .select('user_id');

      expect(error).not.toBeNull();
    });

    it('returns only the caller’s own contacts', async () => {
      await sellerA.client.rpc('update_profile', {
        p_display_name: 'Ana Reyes',
        p_location: 'Cebu City',
        p_contact_email: 'ana.private@example.test',
        p_contact_phone: '+63 900 000 0001',
        p_publish_email: false,
        p_publish_phone: false,
      });

      const mine = await sellerA.client.rpc('get_my_contacts');
      expect(mine.error).toBeNull();
      expect(mine.data).toEqual([
        expect.objectContaining({ contact_email: 'ana.private@example.test' }),
      ]);

      const theirs = await sellerB.client.rpc('get_my_contacts');
      expect(theirs.data).not.toContainEqual(
        expect.objectContaining({ contact_email: 'ana.private@example.test' }),
      );
    });

    it('keeps an unpublished contact out of the public projection', async () => {
      const { data } = await anonymousClient()
        .from('profiles')
        .select('published_email, published_phone')
        .eq('user_id', sellerA.id)
        .single();

      expect(data).toEqual({ published_email: null, published_phone: null });
    });
  });

  describe('direct writes are denied', () => {
    it('refuses a direct update of the caller’s own profile', async () => {
      const { error } = await sellerA.client
        .from('profiles')
        .update({ display_name: 'Direct Write' })
        .eq('user_id', sellerA.id)
        .select();

      expect(error).not.toBeNull();
    });

    it('refuses a direct update of another user’s profile', async () => {
      const { error, data } = await sellerA.client
        .from('profiles')
        .update({ display_name: 'Owned By A' })
        .eq('user_id', sellerB.id)
        .select();

      expect(error ?? data).not.toEqual([expect.objectContaining({ display_name: 'Owned By A' })]);

      const check = await anonymousClient()
        .from('profiles')
        .select('display_name')
        .eq('user_id', sellerB.id)
        .single();
      expect(check.data).toMatchObject({ display_name: 'Ben Santos' });
    });

    it('refuses an insert into administrator membership', async () => {
      const { error } = await offContract(sellerA.client)
        .schema('app_private')
        .from('administrators')
        .insert({ user_id: sellerA.id });

      expect(error).not.toBeNull();
    });

    it('refuses update_profile to an anonymous caller', async () => {
      const { error } = await anonymousClient().rpc('update_profile', {
        p_display_name: 'Anonymous',
        p_location: '',
        p_contact_email: '',
        p_contact_phone: '',
        p_publish_email: false,
        p_publish_phone: false,
      });

      expect(error).not.toBeNull();
    });
  });

  describe('publication consent', () => {
    it('publishes a contact value only once consent is given', async () => {
      await sellerB.client.rpc('update_profile', {
        p_display_name: 'Ben Santos',
        p_location: 'Mandaue City',
        p_contact_email: 'ben.contact@example.test',
        p_contact_phone: '+63 900 000 0002',
        p_publish_email: true,
        p_publish_phone: false,
      });

      const { data } = await anonymousClient()
        .from('profiles')
        .select('published_email, published_phone, location')
        .eq('user_id', sellerB.id)
        .single();

      expect(data).toEqual({
        published_email: 'ben.contact@example.test',
        published_phone: null,
        location: 'Mandaue City',
      });
    });

    it('withdraws the published value when consent is revoked', async () => {
      await sellerB.client.rpc('update_profile', {
        p_display_name: 'Ben Santos',
        p_location: 'Mandaue City',
        p_contact_email: 'ben.contact@example.test',
        p_contact_phone: '',
        p_publish_email: false,
        p_publish_phone: false,
      });

      const { data } = await anonymousClient()
        .from('profiles')
        .select('published_email')
        .eq('user_id', sellerB.id)
        .single();

      expect(data).toEqual({ published_email: null });
    });

    it('rejects an empty display name', async () => {
      const { error } = await sellerB.client.rpc('update_profile', {
        p_display_name: '   ',
        p_location: '',
        p_contact_email: '',
        p_contact_phone: '',
        p_publish_email: false,
        p_publish_phone: false,
      });

      expect(error?.message).toMatch(/display_name_invalid/);
    });
  });

  describe('administrator membership', () => {
    it('reports an ordinary user as not an administrator', async () => {
      const { data, error } = await sellerA.client.rpc('is_current_user_administrator');
      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('reports a granted user as an administrator', async () => {
      const { data, error } = await administrator.client.rpc('is_current_user_administrator');
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('offers no way to ask whether someone else is an administrator', async () => {
      // The function takes no argument by design, so a caller cannot enumerate
      // membership. Passing one must fail rather than silently resolve.
      const { error } = await sellerA.client.rpc('is_current_user_administrator', {
        check_user: administrator.id,
      } as never);

      expect(error).not.toBeNull();
    });
  });
});
