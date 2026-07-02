---
name: laravel-services-support
description: >-
  Convention for organizing PHP classes in Laravel projects by separating
  external integrations from internal abstractions. Consult and follow this
  whenever creating, moving, or placing a PHP class and deciding where it
  belongs — specifically the choice between app/Services/ and app/Support/.
  Apply it even when the user doesn't name the rule: any new API client, SDK
  wrapper, or payment/webhook/SMS/verification integration goes in Services,
  and any self-contained internal helper (calculator, formatter, aggregator,
  manager) goes in Support. Triggers on any Laravel task that adds or relocates
  a class under app/, or asks where a service or helper class should live.
---

# Laravel: Services vs Support

**Services are external. Supports are internal abstractions.**

- `app/Services/` — anything that talks to the outside world: third-party API
  clients/SDKs, payment/card providers, webhooks, SMS, verification, etc.
- `app/Support/` — internal, self-contained abstractions over our own domain
  (aggregations, calculators, formatters, mode/connection managers, etc.) with
  no outbound integration.
- Place new classes accordingly, and mirror that in tests: Support-class unit
  tests live in `tests/Unit/Support/`.

The deciding test: does the class reach outside the application — network, a
vendor SDK, an external process? If yes, it's a Service. If it only operates on
our own data and logic, it's Support.
