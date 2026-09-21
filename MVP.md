# AutoLinkX — MVP product document

Status: proposed implementation scope, not a completed application.  
Stack: Next.js, TypeScript, Supabase Auth, PostgreSQL, and Storage.  
Companion: [technical architecture and infrastructure plan](README.md).

## 1. Objective

Help an individual seller publish a trustworthy car listing and a buyer find that car and send an inquiry. An administrator reviews listings before they become public.

The MVP is successful when this complete journey works reliably:

**Create account → create listing → submit → administrator approves → buyer discovers → buyer sends inquiry → seller reads inquiry → seller marks sold.**

AutoLinkX facilitates discovery and initial contact. Negotiation, inspection, payment, and vehicle transfer happen outside the application.

## 2. Users

| User | What they need |
| --- | --- |
| Visitor | Browse available cars, filter results, and inspect vehicle details |
| Registered user | Save cars, send inquiries, report listings, and sell their own vehicles |
| Administrator | Review submissions, reject unsuitable content with a reason, and resolve reports |

Buying and selling are capabilities of the same account. There is no separate buyer/seller role, subscription, or dealer account in this release. Administrator access is assigned through a restricted operator process.

## 3. First-release scope

| Area | MVP functionality | Completion condition |
| --- | --- | --- |
| Accounts | Register, confirm email, log in/out, reset password, edit display name/location/contact preferences | A user can recover access and modify only their own profile |
| Seller listings | Create/edit drafts, submit for review, archive, restore to draft, mark published cars sold | A seller controls only their listings and cannot publish directly |
| Vehicle details | Make, model, year, price, mileage, transmission, fuel, location, condition, description | Required values are validated before submission |
| Photos | Multiple uploads, display order, selected cover, deletion | Invalid images are rejected and photo changes trigger review when required |
| Discovery | Homepage, searchable results, filters, sorting, pagination, detail page | Only published listings appear publicly |
| Favorites | Add/remove saved listings | Repeated submissions never create duplicates |
| Inquiries | Signed-in buyer sends a message; seller reads it in their dashboard | Self-inquiries and unavailable-car inquiries are rejected |
| Moderation | Administrator queue, approve/reject with reason, audit history | Administrators cannot review their own listings |
| Reports | Signed-in users report a car; administrators resolve/dismiss with notes | Reports and private notes have restricted access |
| Interface | Shared navigation, mobile layouts, accessible forms, clear feedback | Core journeys work with keyboard and on narrow screens |

All listed capabilities are required for this MVP. Enhancements below are deferred so the first release remains focused.

## 4. Explicitly out of scope

- Payments, financing, escrow, delivery, and vehicle-transfer processing.
- Real-time chat, threaded messaging, attachments to inquiries, and read receipts for buyers.
- Reviews, ratings, AI recommendations, vehicle valuation, and automated moderation.
- Dealer subscriptions, paid promotion, advertising, and multi-currency conversion.
- Social login, native mobile apps, saved searches, email alerts, maps, and comparison tools.
- Advanced analytics dashboards, external search engines, microservices, and Supabase Realtime.

An inquiry is an initial message, not a chat conversation. A buyer may voluntarily include a preferred reply method in its message; that content is visible only to the buyer and listing owner. The interface must explain this and must not silently disclose the buyer's account email. Sellers may optionally publish a separate contact value for direct contact.

## 5. Core journeys

### Seller

1. Register, confirm email, and complete a basic profile.
2. Create a draft with vehicle specifications and photos.
3. Preview and submit a valid listing for review.
4. See its current status in the dashboard; if rejected, see the reason and correct it.
5. After approval, receive and read buyer inquiries.
6. Mark the car sold or archive it when it is no longer available.

### Buyer

1. Browse without an account and narrow results using search and filters.
2. Open a car's details and gallery.
3. Sign in to save the car or send an inquiry.
4. Receive confirmation that the inquiry was recorded, with an explanation that replies are arranged outside the application.
5. Report a suspicious listing when necessary.

### Administrator

1. Open the protected review queue and inspect a pending car and its photos.
2. Approve or reject it with an explanation; the server checks that the administrator is not the seller.
3. Investigate reports, optionally remove a published listing through an explicit moderation action, and resolve or dismiss the report with a note.

Resolving a report and removing a listing are separate actions. Report resolution alone does not change publication status.

## 6. Listing lifecycle

| Starting status | Allowed next status | Who / why |
| --- | --- | --- |
| draft | pending_review | Owner submits complete details and at least one valid photo |
| rejected | pending_review | Owner corrects and resubmits |
| pending_review | published | Another administrator approves |
| pending_review | rejected | Another administrator rejects with a reason |
| pending_review | draft | Owner withdraws or changes substantive details |
| published | pending_review | Owner changes substantive details or photos |
| published | sold | Owner marks the vehicle sold |
| published | rejected | Another administrator removes a violation with a reason |
| draft / pending_review / published / rejected / sold | archived | Owner archives |
| archived | draft | Owner restores for editing and fresh review |

All other transitions are denied. Draft and rejected edits retain their status until submission. Sold vehicles must be archived and restored before resubmission.

Substantive changes include specifications, description, price, location, photos, order, and cover choice. Valid published edits immediately remove public availability and require review again; invalid edits leave the existing listing unchanged. Concurrent edits and decisions must detect stale versions.

## 7. Screens and navigation

| Screen | Essential content/actions |
| --- | --- |
| Homepage | Brand, search entry, latest published cars, sell-a-car entry |
| Browse cars | Filter form, result count, cards, sort, pagination, no-results guidance |
| Car details | Specifications, photos, opted-in seller contact, favorite, inquiry, report |
| Account pages | Registration, confirmation, login, password recovery |
| Profile | Display name, location, private contact preferences |
| Favorites | Saved cars with clear unavailable states and remove action |
| Seller dashboard | Own listings, statuses, appropriate actions, received inquiries |
| Listing editor/preview | Vehicle form, photo management, validation, submission feedback |
| Administrator review | Pending queue, private preview, approve/reject, decision history |
| Administrator reports | Report queue, investigation context, resolve/dismiss |

Use a consistent header and footer, readable typography, visible focus, explicit form labels, and text status labels. Each form needs pending feedback, understandable validation, and success confirmation. Never rely on button visibility to enforce permissions.

## 8. Architecture and infrastructure

The application has three main parts:

| Part | Responsibility |
| --- | --- |
| Next.js application | Public pages, account flows, seller/admin dashboards, input validation, server actions, image processing |
| Supabase project | Auth, PostgreSQL data, row-level security, transactional commands, private image storage |
| Deployment services | Next.js container hosting/HTTPS, SMTP delivery, monitoring, scheduled cleanup, database and object backups |

Next.js services call Supabase with the user's verified identity. PostgreSQL functions atomically enforce listing transitions and inquiry availability. RLS and grants also protect direct Supabase API access. Privileged keys are isolated on the server and never used as a blanket substitute for user authorization.

Use local Supabase in Docker for development and disposable CI tests, a separate hosted project for staging, and a hosted production project. Next.js runs on a managed container host near the Supabase region. Local PostgreSQL replaces the original SQLite requirement.

Core records: users, public profiles, private contacts, administrator membership, listings, photos, favorites, inquiries, reports, audit events, rate-limit buckets, and upload staging records. Details and source-tree ownership are defined in the [README architecture](README.md#application-architecture).

## 9. Validation and protection requirements

- Validate required vehicle fields, positive price, nonnegative mileage, sensible year bounds, supported choices, and bounded text. Use one configured currency and kilometers for mileage.
- Require at least one photo before submission. Allow up to 10 photos at 5 MB each, with a decoded pixel limit; inspect actual image bytes, normalize supported formats, and remove metadata.
- Store photos privately. Check listing visibility/ownership on media delivery; handle failed uploads and abandoned files without deleting valid existing images prematurely.
- Hide private contacts and internal notes in database permissions and response projections, not just in templates. Public contact values require explicit seller consent.
- Require sign-in for favorites and confirmed accounts for inquiries/reports. Block self-inquiries and check current listing availability inside the inquiry transaction.
- Use database uniqueness for favorites and one open report per reporter/listing. Add honeypots, duplicate checks, account limits, and trusted-IP throttling. Initial account limits: 5 inquiries/hour, 1 inquiry per listing/10 minutes, and 5 reports/day.
- Log decisions and operational errors without credentials, reset links, private contact information, or inquiry bodies.

## 10. Delivery milestones

| Stage | Deliverable | Exit gate |
| --- | --- | --- |
| 1. Foundation | Next.js, local Supabase, migrations, Auth, profiles, basic layout, RLS tests | Account/recovery works; private data and administrator roles cannot be accessed or changed by another user |
| 2. Seller workflow | Listings, photos, transitions, seller dashboard | Owner isolation, upload validation, and published-edit review rules pass |
| 3. Discovery | Homepage, search/filter/sort/pagination, detail/gallery | Every public query excludes unavailable listings and private contacts |
| 4. Interactions | Favorites, inquiries, inbox, reports, spam limits | Duplicate/concurrent operations preserve permissions and availability |
| 5. Moderation and readiness | Administrator queues, audit history, sample data, deployment preparation | Complete marketplace journey and release checks pass |

These are dependency-ordered milestones, not calendar estimates. Assign dates after the foundation validates the local tooling and integration effort.

## 11. MVP acceptance and release gate

The MVP is ready for a limited launch only when:

- The seller → review → buyer inquiry → sold journey passes in a browser.
- Seller A cannot read or edit Seller B's private data, through either Next.js or direct Supabase requests.
- A seller, including an administrator who sells, cannot approve their own car.
- Every allowed and denied status transition is tested, including stale edits and moderation decisions.
- Draft, pending, rejected, sold, and archived cars never appear in public discovery; new inquiries on them fail.
- Favorites remain unique and inquiry/sale races are resolved transactionally.
- Filters, sorting, pagination, image validation, recovery, and report permissions pass focused tests.
- Mobile and keyboard journeys have been inspected, with useful empty/error/loading states.
- Type checks, tests, production build, and fresh/upgrade migrations have actually run successfully.
- Staging configuration, SMTP recovery delivery, private Storage policies, backup/restore, and rollback procedures have been verified before production release.

Database backups do not include Storage object bytes, so images require a separate recovery process. Deployment approval and resource provisioning are outside this document's execution scope.

## 12. Pilot evaluation

Evaluate the MVP using completed, moderated listings; time from submission to a decision; inquiries successfully delivered to seller dashboards; and unresolved reports or access-control defects. During a small pilot these can be reviewed using restricted operational queries rather than building an analytics product.

No traffic, conversion, or revenue targets are assumed. Establish commercial targets once the initial audience and launch size are known. The immediate product test is whether sellers can list cars and buyers can reliably initiate contact.

## 13. Decisions needed before launch

- Marketplace currency and initial geographic coverage.
- Hosting/Supabase region and service plans, based on budget and expected use.
- SMTP sender/domain, backup retention/destination, and alert recipients.
- Who operates moderation and what response time they can support.
- Marketplace content rules, privacy notice, and support contact.

These choices do not block writing or reviewing this MVP scope. They must be resolved before accepting real users.
