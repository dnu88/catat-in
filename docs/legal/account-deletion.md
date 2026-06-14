# Kaswise Account Deletion Policy

Last updated: 2026-06-14

This document is the canonical in-repo source for Kaswise account deletion wording and public deletion guidance.

## Purpose

Kaswise provides users with a clear path to request account deletion and removal of their personal finance data from active service use.

## Current minimum public deletion path

For the current Track A store-readiness path, Kaswise provides two aligned request channels:
- signed-in users can submit an authenticated deletion request directly from the mobile app Settings screen
- public users and reviewers can still reach the account deletion page and support contact without login

Public path:
- Account deletion page: https://kaswise.com/account-deletion
- Support contact: https://kaswise.com/contact
- Support email: kaswise.id@gmail.com

## What the user should provide

To help process a deletion request safely, the user may be asked to provide:
- the email address used for the Kaswise account
- confirmation that the requester controls the account
- optional context if the user is reporting a problem with access

Kaswise should avoid requesting unnecessary personal identifiers.

## What happens when a deletion request is accepted

Kaswise should:
- disable or remove active account access
- delete or anonymize user finance data from active service systems where appropriate
- remove profile metadata, preferences, and stored user-generated content associated with the account where appropriate
- revoke access to premium/account entitlements associated with the deleted account

## What may be retained temporarily or conditionally

Some limited records may be retained for a reasonable period when needed for:
- fraud or abuse prevention
- security investigation
- backup recovery windows
- legal, accounting, tax, or regulatory obligations
- proving that a deletion request was processed

Kaswise should retain only the minimum data needed for those purposes.

## Expected processing time

Kaswise should aim to process deletion requests within 30 days, subject to identity verification, system constraints, and any applicable legal/security retention requirements.

## Difference between deletion request and immediate hard delete

A deletion request workflow is the current minimum safe public path. It allows Kaswise to:
- verify the requester
- prevent accidental or fraudulent irreversible deletion
- handle edge cases such as premium access, pending support issues, or legal retention requirements

If Kaswise later introduces a stronger self-service delete-account flow, the public wording and in-app UX should be updated to match the new behavior exactly.

## In-app access point

Kaswise should keep the deletion entry point easy to find without adding unnecessary navigation clutter:
- Mobile app: Settings → Request Penghapusan Akun (authenticated request flow)
- Public fallback: Settings → Penghapusan Akun opens the public policy page and support details

## Contact

Deletion requests and related questions:
- Email: kaswise.id@gmail.com
- Public deletion page: https://kaswise.com/account-deletion
- Public support page: https://kaswise.com/contact
