'use client';

/**
 * Account forms (A-06 screens, Developer B's area by ownership).
 *
 * Each form calls a Server Action and renders the shared `ActionResult`:
 * field errors inline and in a summary, safe messages for everything else.
 * None of them decides permission — the action and the database do that.
 */
import Link from 'next/link';
import { useActionState } from 'react';

import { Checkbox, Field, FormErrors, Notice, SubmitButton, fieldErrorsOf } from '@/components/form-controls';
import { AUTH_ROUTES, PASSWORD_MIN_LENGTH, PROFILE_LIMITS, type ActionResult, type OwnProfile } from '@/contracts';
import {
  loginAction,
  registerAction,
  requestRecoveryAction,
  updatePasswordAction,
  updateProfileAction,
} from '../actions';

export function RegisterForm() {
  const [result, action] = useActionState<ActionResult<{ confirmationRequired: boolean }> | null, FormData>(
    registerAction,
    null,
  );
  const errors = fieldErrorsOf(result);

  if (result?.ok) {
    return (
      <Notice tone="success" title="Check your email">
        <p style={{ marginBottom: 0 }}>
          We sent a confirmation link. Open it to finish creating your account, then sign
          in. The link expires after a while — you can request a new one from the sign-in
          screen.
        </p>
      </Notice>
    );
  }

  return (
    <form className="form" action={action} noValidate>
      <FormErrors result={result} />
      <Field name="displayName" label="Display name" autoComplete="name"
        hint="Buyers and sellers see this name. It is not your email address."
        maxLength={PROFILE_LIMITS.displayNameMax} errors={errors.displayName} />
      <Field name="email" label="Email address" type="email" autoComplete="email" errors={errors.email} />
      <Field name="password" label="Password" type="password" autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`} errors={errors.password} />
      <div className="form__actions">
        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
        <span className="form__aside">
          Already have an account? <Link href={AUTH_ROUTES.login}>Sign in</Link>
        </span>
      </div>
    </form>
  );
}

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [result, action] = useActionState<ActionResult<{ userId: string }> | null, FormData>(
    loginAction,
    null,
  );
  const errors = fieldErrorsOf(result);

  return (
    <form className="form" action={action} noValidate>
      {notice && <Notice tone={notice === 'link_expired' || notice === 'link_invalid' ? 'error' : 'success'} title={noticeText(notice)} />}
      <FormErrors result={result} />
      <input type="hidden" name="next" value={next} />
      <Field name="email" label="Email address" type="email" autoComplete="email" errors={errors.email} />
      <Field name="password" label="Password" type="password" autoComplete="current-password" errors={errors.password} />
      <div className="form__actions">
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        <span className="form__aside">
          <Link href={AUTH_ROUTES.forgotPassword}>Forgot your password?</Link>
        </span>
      </div>
      <p className="form__aside">
        New here? <Link href={AUTH_ROUTES.register}>Create an account</Link>
      </p>
    </form>
  );
}

function noticeText(notice: string): string {
  switch (notice) {
    case 'email_confirmed':
      return 'Your email address is confirmed. Sign in to continue.';
    case 'password_updated':
      return 'Your password was updated. Sign in with it now.';
    case 'link_expired':
      return 'That link has expired or was already used. Request a new one.';
    case 'link_invalid':
      return 'That link could not be read. Request a new one.';
    default:
      return 'Sign in to continue.';
  }
}

export function RecoveryForm() {
  const [result, action] = useActionState<ActionResult<null> | null, FormData>(
    requestRecoveryAction,
    null,
  );
  const errors = fieldErrorsOf(result);

  if (result?.ok) {
    return (
      <Notice tone="success" title="Check your email">
        <p style={{ marginBottom: 0 }}>
          If an account exists for that address, we have sent a link to choose a new
          password.
        </p>
      </Notice>
    );
  }

  return (
    <form className="form" action={action} noValidate>
      <FormErrors result={result} />
      <Field name="email" label="Email address" type="email" autoComplete="email" errors={errors.email} />
      <div className="form__actions">
        <SubmitButton pendingLabel="Sending…">Send recovery link</SubmitButton>
        <span className="form__aside">
          <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
        </span>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [result, action] = useActionState<ActionResult<null> | null, FormData>(
    updatePasswordAction,
    null,
  );
  const errors = fieldErrorsOf(result);

  return (
    <form className="form" action={action} noValidate>
      <FormErrors result={result} />
      <Field name="password" label="New password" type="password" autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`} errors={errors.password} />
      <div className="form__actions">
        <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
      </div>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: OwnProfile }) {
  const [result, action] = useActionState<ActionResult<OwnProfile> | null, FormData>(
    updateProfileAction,
    null,
  );
  const errors = fieldErrorsOf(result);
  const current = result?.ok ? result.data : profile;

  return (
    <form className="form" action={action} noValidate>
      {result?.ok && <Notice tone="success" title="Profile saved." />}
      <FormErrors result={result} />

      <Field name="displayName" label="Display name" autoComplete="name"
        defaultValue={current.displayName} maxLength={PROFILE_LIMITS.displayNameMax}
        errors={errors.displayName} />
      <Field name="location" label="Location" optional autoComplete="address-level2"
        hint="Shown on your listings, for example “Cebu City”."
        defaultValue={current.location ?? ''} maxLength={PROFILE_LIMITS.locationMax}
        errors={errors.location} />

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="eyebrow">Contact details</legend>
        <p className="field__hint">
          These stay private unless you publish them. Your sign-in address
          ({current.accountEmail}) is never shown to anyone.
        </p>
        <div className="form" style={{ marginTop: 'var(--space-4)' }}>
          <Field name="contactEmail" label="Contact email" type="email" optional
            defaultValue={current.contactEmail ?? ''} errors={errors.contactEmail} />
          <Checkbox name="publishContactEmail" label="Show this email on my listings"
            defaultChecked={current.publishContactEmail} />
          <Field name="contactPhone" label="Contact phone" type="tel" optional
            defaultValue={current.contactPhone ?? ''} maxLength={PROFILE_LIMITS.contactPhoneMax}
            errors={errors.contactPhone} />
          <Checkbox name="publishContactPhone" label="Show this number on my listings"
            defaultChecked={current.publishContactPhone} />
        </div>
      </fieldset>

      <div className="form__actions">
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
