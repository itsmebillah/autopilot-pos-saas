# Security Policy

## Current status

Autopilot POS is an early private prototype and is not suitable for production or real business data.

Known blockers include plaintext password comparison, missing session enforcement on API routes, incomplete authorization, insufficient request validation, and non-transactional sale and stock updates. Supabase Row Level Security must protect every table because the browser-safe anonymous key is not a secret.

## Reporting

Do not open a public issue containing credentials, customer information, or exploit details. Report security concerns privately to [itsmbillah@gmail.com](mailto:itsmbillah@gmail.com).

## Secrets

Copy `.env.example` to `.env.local` and use only project-specific development values. Never commit service-role keys, database passwords, access tokens, or customer data.
