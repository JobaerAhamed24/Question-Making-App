# QuestionBank --- Question Bank & Question Paper Generator

> A professional, minimal, distinctive, class-based subscription
> platform for browsing educational questions and creating printable
> exam papers.

## 1. Project Overview

QuestionBank is a web application for students and other subscribers to
access a centrally managed educational question bank and create
customized question papers.

The platform has three main experiences:

1.  **Public Website** --- introduces the platform, explains features,
    displays subscription plans, and supports registration/login.
2.  **User Dashboard** --- provides class-based subscribed access to
    questions, answers, favorites, saved questions, question-paper
    creation, payment history, and exports.
3.  **Admin Dashboard** --- manages academic structure, questions,
    subscription plans, manual payments, subscribers, content, and
    reports.

The platform uses a **manual payment approval model** and **class-based
subscriptions**. A user can access only the classes included in their
active subscription.

## 2. Core Business Rules

These rules are authoritative and must be implemented consistently in
the UI, backend, database, and tests.

-   Only Admin can create, edit, publish, archive, or delete master
    Question Bank questions.
-   Questions belong to the platform, not individual teachers or
    institutions.
-   There is no teacher question-submission workflow in the first
    release.
-   All Question Bank questions and answers require an active
    subscription for the question's class.
-   A subscription may include one class or multiple classes.
-   A user may hold subscriptions that grant access to multiple classes.
-   A subscription is valid only when its status is `active`, its start
    time has arrived, and its expiry time has not passed.
-   When a subscription expires, access to new Question Bank content is
    blocked immediately.
-   Payment is manual. A user submits payment details and a transaction
    reference; an Admin verifies and approves or rejects it.
-   A client-side success screen must never activate a subscription.
    Only trusted server-side approval logic may do that.
-   Renewal is immediate: when an Admin approves a renewal payment, the
    new subscription period starts at approval time. Remaining time on
    the old subscription is not carried forward. Explain this clearly
    before payment submission.
-   Existing user-owned question papers remain viewable and exportable
    after subscription expiry.
-   An expired user cannot add new Question Bank questions to a paper or
    create a new paper containing Question Bank content.
-   Paper snapshots preserve the question content used at the time the
    paper was created, so later edits to the master question do not
    silently alter old papers.
-   Users can only access and manage their own profile, payment
    submissions, subscriptions, favorites, saved questions, papers, and
    exports.
-   Admin can manage the platform and view all relevant records.
-   Never expose Supabase service-role credentials in browser code.

## 3. Recommended Technology Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   shadcn/ui or an equivalent accessible component system
-   React Router
-   TanStack Query
-   React Hook Form
-   Zod
-   Lucide icons

### Backend

-   Supabase Auth
-   Supabase PostgreSQL
-   PostgreSQL Row Level Security (RLS)
-   Supabase Storage
-   Supabase Edge Functions for privileged workflows
-   Database migrations for schema versioning
-   Scheduled function/cron for housekeeping and expiry status updates

### Document Export

-   PDF generation using a suitable browser/server-side PDF workflow
-   DOCX generation using a DOCX library
-   Store generated files in private Supabase Storage
-   Re-check paper ownership and export entitlement on every export
    request

### Deployment

-   Frontend: Vercel or equivalent
-   Backend: Supabase
-   Configure environment variables separately for development, preview,
    and production.

## 4. Product Design Direction

### Visual identity

Create a professional, minimal, distinctive education SaaS product.
Avoid generic school-management templates, excessive gradients, noisy
dashboards, oversized illustrations, and decorative clutter.

Design principles:

-   Clear hierarchy and generous whitespace
-   Restrained color palette
-   Strong typography and readable Bengali/English text
-   Consistent spacing, borders, radii, and iconography
-   Dense data tables where useful, spacious forms where useful
-   Responsive layouts from mobile to desktop
-   Accessible contrast, keyboard navigation, and visible focus states
-   Subtle transitions only; never sacrifice clarity for animation

Suggested direction:

-   Warm off-white or very light neutral page background
-   Deep ink/navy text
-   One distinctive accent color such as indigo, teal, or cobalt
-   Muted neutral borders and surfaces
-   Semantic success, warning, and danger colors used sparingly
-   A clean sans-serif typeface with Bengali glyph support
-   A compact, consistent icon system

Do not copy an existing website's branding or exact layout. Create an
original visual identity.

### Shared UI system

Build reusable components for:

-   Buttons and icon buttons
-   Inputs, selects, textareas, checkboxes, radio groups
-   Form field wrappers and validation messages
-   Cards, badges, dialogs, drawers, popovers, tooltips
-   Data tables with pagination, sorting, filters, and empty states
-   Tabs, breadcrumbs, dropdown menus
-   Toast/notification feedback
-   Loading skeletons
-   Empty, error, access-denied, and not-found states
-   Confirm-delete and confirm-payment dialogs

## 5. User Roles and Access

### Visitor

-   View public marketing pages and pricing.
-   Register, log in, and reset password.
-   Cannot read Question Bank questions or answers.
-   Can view public class/subject catalogue if enabled.

### Registered user without an active class subscription

-   Manage own profile.
-   View available plans and payment instructions.
-   Submit a manual payment request.
-   View own payment and subscription status.
-   View and export own existing saved paper snapshots if any.
-   Cannot access Question Bank content.

### Active subscriber

-   Access only the class or classes included in their active
    subscription.
-   Browse questions, options, answers, and explanations for permitted
    classes.
-   Search and filter permitted questions.
-   Save favorites and bookmarked questions.
-   Create and edit own question papers using currently accessible
    questions.
-   Export own papers to PDF and DOCX.
-   View own payment history and subscription details.

### Admin

-   Full administrative access.
-   Manage academic structure and master questions.
-   Manage plans, prices, plan duration, and class entitlements.
-   Review manual payments and activate subscriptions.
-   Manage users and subscriptions.
-   View reports and activity logs.
-   Manage public website content and payment instructions.

Admin role must be provisioned securely by a trusted process. Users must
not be able to assign or edit their own role.

## 6. Public Website Pages

Create the following pages:

-   `/` --- Home
-   `/about` --- About
-   `/pricing` --- Subscription plans
-   `/how-it-works` --- How the platform works
-   `/faq` --- Frequently asked questions
-   `/contact` --- Contact
-   `/login` --- Login
-   `/register` --- Registration
-   `/forgot-password` --- Password recovery
-   `/reset-password` --- Password reset
-   `/payment-instructions` --- Payment instructions (only if
    appropriate)

### Home page sections

1.  Header with logo, navigation, login, and primary CTA
2.  Hero with a concise value proposition and clear CTA
3.  Trust/benefit strip
4.  How it works in three or four steps
5.  Supported classes and subjects
6.  Question Bank and paper generator feature highlights
7.  Subscription plan preview
8.  FAQ preview
9.  Final CTA
10. Footer with links and contact details

Do not invent real testimonials, institutional affiliations, statistics,
or endorsements. Use clearly marked placeholder content where data is
unavailable.

## 7. User Dashboard

Recommended routes:

-   `/dashboard`
-   `/dashboard/classes`
-   `/dashboard/questions`
-   `/dashboard/questions/:questionId`
-   `/dashboard/favorites`
-   `/dashboard/saved`
-   `/dashboard/papers`
-   `/dashboard/papers/new`
-   `/dashboard/papers/:paperId`
-   `/dashboard/papers/:paperId/preview`
-   `/dashboard/subscription`
-   `/dashboard/payments`
-   `/dashboard/payments/new`
-   `/dashboard/downloads`
-   `/dashboard/profile`

### Dashboard overview

Show:

-   Subscription status
-   Subscribed classes
-   Expiry date and remaining time
-   Recent papers
-   Recent activity
-   Payment status
-   Clear CTA to subscribe or renew when relevant

### Question Bank

Support filters for:

-   Class
-   Group (where applicable)
-   Subject
-   Chapter
-   Topic
-   Question type
-   Difficulty
-   Marks
-   Search text

Question details should support:

-   Question text
-   MCQ options
-   Answer and explanation
-   Question images
-   Marks and difficulty
-   Add to favorites
-   Save question
-   Add to paper

Do not reveal answer data to users who lack access. The backend must
enforce this; hiding answer UI alone is not security.

## 8. Class-Based Subscription and Pricing

Plans are configurable by Admin. Do not hard-code prices or durations in
the frontend.

A plan should support:

-   Name
-   Description
-   Price
-   Currency (default BDT)
-   Duration in days
-   Active/inactive status
-   One or more included classes
-   Optional features/limits
-   Display order
-   Optional promotional price or discount configuration

Example plans are placeholders only:

-   Single Class Monthly
-   Single Class Yearly
-   Multi-Class Bundle Monthly
-   Multi-Class Bundle Yearly

The actual prices and class combinations must come from the database.

### Subscription model

A subscription records:

-   User
-   Purchased plan
-   Status
-   Starts at
-   Expires at
-   Price snapshot
-   Plan name snapshot
-   Granted class snapshot
-   Approval/payment reference

Use a subscription-class join table or equivalent immutable snapshot to
preserve exactly which classes were purchased. Editing a plan later must
not unexpectedly change an existing subscriber's access.

### Access rule

A user can read a question only if:

1.  The user is authenticated.
2.  The user has an active subscription.
3.  The subscription has started.
4.  The subscription has not expired.
5.  The question's class is included in the subscription's granted class
    set.

Admin can access all questions.

## 9. Manual Payment Workflow

The first release uses manual payment, not automatic gateway callbacks.

### User flow

1.  Select a plan.
2.  Review price, duration, included classes, and renewal rule.
3.  See payment method instructions configured by Admin.
4.  Pay outside the website.
5.  Submit payment method, sender/account number, transaction
    ID/reference, amount, and optional receipt screenshot.
6.  See `pending` status.
7.  Receive approval or rejection result.

### Admin flow

1.  Open pending payment queue.
2.  Inspect user, plan, amount, transaction ID, sender details, and
    receipt.
3.  Compare against the actual payment received.
4.  Approve or reject with an internal note.
5.  On approval, activate the subscription using trusted server-side
    logic.
6.  Notify the user and write an audit record.

### Payment data and safeguards

-   Store a plan/price snapshot when the payment request is created.
-   Do not trust amount or plan ID sent by the browser; re-read and
    validate the plan server-side.
-   Enforce duplicate transaction-reference checks. Define uniqueness
    scope carefully because different providers may reuse formats; use
    provider/method plus normalized reference as appropriate.
-   A payment can be reviewed only once unless a controlled admin
    reversal workflow is explicitly implemented.
-   Keep payment receipts in a private Storage bucket.
-   Only the owner and Admin can read the relevant receipt.
-   Log who approved/rejected, when, and why.
-   Do not store payment PINs, OTPs, passwords, or full card details.

### Immediate renewal rule

On approval, the new period starts at the approval timestamp, even if
the old subscription still has remaining time. Remaining time is not
carried forward. Show this rule clearly before payment submission.

## 10. Question Paper Generator

### Paper creation flow

1.  User starts a new paper.
2.  Enters title, exam name, class, subject, duration, instructions, and
    optional school details.
3.  Filters the accessible Question Bank.
4.  Adds questions.
5.  Reorders questions.
6.  Adjusts paper-specific marks where allowed.
7.  Reviews total marks.
8.  Saves a durable snapshot.
9.  Previews the paper.
10. Exports to PDF or DOCX.

### Paper customization

-   School/institution name
-   Optional logo
-   Exam title
-   Class and subject
-   Student name and roll fields
-   Date
-   Duration
-   Instructions
-   Question numbering
-   Marks alignment
-   Header/footer
-   Page numbering
-   Answer key as a separate export option, subject to access rules

### Snapshot and post-expiry behavior

At paper creation or when questions are added, store an immutable
snapshot of the content used by that paper. A snapshot may include:

-   Question text
-   Options
-   Answer/explanation if the user is permitted to include them
-   Marks
-   Type
-   Relevant image references or safe copied assets

After subscription expiry:

-   User can view own saved papers.
-   User can export own existing paper snapshots.
-   User cannot access new Question Bank content.
-   User cannot add new Question Bank questions to an old paper.
-   User cannot create a new paper containing Question Bank content.

Use private storage and short-lived signed URLs for generated exports.
Re-check paper ownership before every download.

## 11. Admin Dashboard

Recommended navigation:

### Overview

-   Dashboard
-   Analytics and reports

### Academic Management

-   Classes
-   Groups
-   Subjects
-   Chapters
-   Topics
-   Question types

### Question Management

-   All questions
-   Add question
-   Edit question
-   Bulk import
-   Question images
-   Draft/published/archived status

### Subscription Management

-   Plans
-   Plan pricing
-   Plan-class mapping
-   Subscribers
-   Active subscriptions
-   Expired subscriptions
-   Manual activation/extension
-   Suspension/cancellation

### Payment Management

-   Pending payments
-   Approved payments
-   Rejected payments
-   Payment methods/instructions
-   Payment review history

### User Management

-   All users
-   User details
-   Roles
-   User subscription history
-   Account status

### Website Management

-   Homepage content
-   Notices
-   FAQ
-   Contact messages
-   Media library

### System

-   Settings
-   Activity logs
-   Reports

### Admin question form

Use dynamic forms by question type:

-   MCQ: options and correct option
-   CQ: stem and sub-parts
-   Short answer: answer and explanation
-   Fill in the blanks
-   True/false
-   Math/equation question
-   Image-based question

Validate question type-specific requirements in both frontend and
backend.

## 12. Suggested Database Entities

Design a normalized PostgreSQL schema. Names may be refined during
implementation, but preserve these responsibilities.

### Identity

-   `profiles`
-   `user_roles`

### Academic structure

-   `classes`
-   `groups`
-   `subjects`
-   `chapters`
-   `topics`
-   `question_types`

### Question bank

-   `questions`
-   `question_options`
-   `question_answers`
-   `question_images`
-   Optional question tags and relations

### Subscription

-   `plans`
-   `plan_classes`
-   `plan_features`
-   `subscriptions`
-   `subscription_classes` (immutable purchased class snapshot)

### Manual payments

-   `payment_methods`
-   `payments`
-   `payment_receipts`
-   `payment_reviews`

### User features

-   `favorites`
-   `saved_questions`
-   `question_papers`
-   `question_paper_items`
-   `export_history`

### Platform operations

-   `activity_logs`
-   `site_settings`
-   `notices`
-   `contact_messages`

Use UUID primary keys, foreign keys, appropriate `ON DELETE` behavior,
timestamps, check constraints, unique constraints, and indexes. Add
indexes for common filters such as class, subject, chapter, status,
user, subscription expiry, and payment status.

## 13. RLS and Security Requirements

Enable RLS on every exposed table.

Required policies:

-   Public visitors can read only explicitly public marketing/catalogue
    data.
-   Anonymous and unsubscribed users cannot read Question Bank
    questions, options, answers, or protected images.
-   Active subscribers can read only questions and child records
    belonging to classes granted by their active subscription.
-   Admin can manage academic structure, master questions, plans,
    payments, subscriptions, and administrative content.
-   Users can read/update only their own profile fields.
-   Users can read only their own payment and subscription records.
-   Users can submit payment requests but cannot approve them or alter
    their payment status.
-   Users can manage only their own favorites and saved questions, and
    only for questions they currently have access to.
-   Users can manage only their own papers and paper items.
-   Users can read/export their own immutable paper snapshots after
    expiry.
-   Users cannot add new question-bank content to papers after the
    relevant class access expires.
-   Payment receipt storage is private and owner/Admin restricted.
-   Question images must not bypass question access through public
    object URLs.
-   Never rely only on React route guards for security.

Use carefully designed security-definer functions only when necessary.
Set a safe `search_path`, restrict execute privileges, avoid recursive
RLS checks, and test policies using separate anonymous, unsubscribed,
subscribed, wrong-class, expired, and admin accounts.

## 14. Suggested Backend Workflows

Use Supabase client + RLS for normal permitted reads and user-owned
CRUD. Use trusted Edge Functions or secure database transactions for
privileged workflows.

Recommended functions:

-   `submit-payment`
-   `review-payment`
-   `activate-subscription`
-   `check-class-access`
-   `expire-subscriptions`
-   `create-paper-snapshot`
-   `export-question-paper`
-   `record-activity`

### Payment approval must be atomic

The approval workflow should:

1.  Lock/read the payment row.
2.  Confirm status is still pending.
3.  Validate the plan and stored amount snapshot.
4.  Check transaction-reference duplication.
5.  Record the admin reviewer.
6.  Mark payment approved.
7.  Create the subscription and class snapshot with start time =
    approval time.
8.  Set expiry from the plan duration.
9.  Write audit log.
10. Commit all changes together.

If any step fails, roll back the entire operation. Make the operation
idempotent so repeated requests cannot create duplicate subscriptions.

## 15. UX States and Error Handling

Design complete states, not just happy-path screens:

-   Loading and skeleton
-   Empty question bank
-   No subscribed classes
-   Subscription required
-   Wrong-class access
-   Payment pending
-   Payment rejected with reason
-   Subscription expired
-   No search results
-   No saved papers
-   Export processing
-   Export failed
-   Network error
-   Permission denied
-   Session expired
-   Not found

All forms need field-level validation and clear success/error feedback.
Confirm destructive actions.

## 16. Accessibility and Responsive Design

-   Mobile-first responsive layouts.
-   Desktop sidebar and compact mobile navigation.
-   Keyboard-accessible menus and dialogs.
-   Visible focus indicators.
-   Semantic HTML.
-   Accessible form labels and errors.
-   Sufficient color contrast.
-   Do not use color alone to convey status.
-   Ensure Bengali text and fonts render correctly.
-   Tables should adapt to mobile via responsive rows/cards or
    horizontal scrolling.

## 17. Testing Strategy

### Authentication

-   Registration and verification
-   Login/logout
-   Password reset
-   Session expiration

### Subscription and access

-   No subscription
-   Active subscription for matching class
-   Active subscription for wrong class
-   Multiple subscribed classes
-   Expired subscription
-   Future-start subscription
-   Renewal approval and immediate start
-   Plan edited after purchase; old snapshot remains unchanged

### Payment

-   Pending submission
-   Correct approval
-   Rejection
-   Duplicate transaction reference
-   Wrong amount
-   Inactive plan
-   Double approval attempt
-   Unauthorized user attempting approval

### Question Bank

-   Admin CRUD
-   Non-admin write denied
-   Subscriber read for permitted class
-   Wrong-class read denied
-   Unsubscribed read denied
-   Direct child-table query denied
-   Protected image access denied

### Paper Generator

-   Create and edit own paper
-   Access another user's paper denied
-   Snapshot remains stable after master question edit
-   Expired user can view/export old paper
-   Expired user cannot add a new question
-   PDF and DOCX output validation

### Security

Test RLS directly through Supabase using distinct test accounts. Do not
treat successful UI behavior as proof of database security.

## 18. Implementation Milestones

1.  Repository setup, design tokens, shared components, routing.
2.  Supabase project, migrations, Auth, profiles, roles.
3.  Academic structure and admin CRUD.
4.  Question bank schema, dynamic forms, question management.
5.  Subscription plans and class entitlements.
6.  RLS and access-control tests.
7.  Manual payment submission and private receipt storage.
8.  Admin payment review and atomic subscription activation.
9.  User dashboard and class-filtered Question Bank.
10. Favorites and saved questions.
11. Paper builder and immutable snapshots.
12. PDF/DOCX export and private file storage.
13. Admin analytics, settings, notices, and logs.
14. End-to-end tests, accessibility, performance, deployment.

Build and verify one milestone at a time. Do not generate the entire
application in one unreviewed code dump.

## 19. Definition of Done

The first production-ready release is complete only when:

-   A visitor cannot read Question Bank data.
-   An unsubscribed user cannot read Question Bank data.
-   A subscriber can read only the classes they purchased.
-   Admin can manage all master questions.
-   Manual payments are reviewed securely.
-   Approval activates the correct class access exactly once.
-   Expiry blocks Question Bank access immediately.
-   Renewal starts immediately upon approval, without carrying forward
    unused time.
-   Old user-owned papers remain viewable and exportable after expiry.
-   Paper snapshots remain stable.
-   Users cannot access another user's records.
-   RLS and Storage permissions have been tested directly.
-   The site is responsive, accessible, and production-configured.

## 20. Notes for AI Coding Agents

-   Treat this README as the product requirements source of truth.
-   Before coding, inspect the repository and report its current
    structure.
-   If the repository is empty, scaffold the application cleanly.
-   Do not overwrite existing working code without explaining the
    change.
-   Propose a concise implementation plan and execute in milestones.
-   Ask only when a genuinely blocking product decision is missing.
-   Do not invent payment credentials, real prices, testimonials, logos,
    or contact details.
-   Use placeholders for unknown business information and make them
    editable in Admin.
-   Keep secrets in environment variables and server-side secret
    storage.
-   Provide `.env.example` with variable names only, never real secrets.
-   Add migrations, seed data, type definitions, and tests.
-   Include clear setup instructions and commands in the project README.
-   After each milestone, summarize files changed, tests run, and
    remaining work.
-   Prioritize correctness, maintainability, security, and a polished
    user experience over unnecessary complexity.
