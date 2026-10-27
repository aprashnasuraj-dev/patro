# TOOL-0004 — SQL DDL to Prisma Schema

## Job
Review PostgreSQL DDL as Prisma v7 model definitions

## Design
Convert plain CREATE TABLE SQL into Prisma models. Conservative conversion deliberately rejects unsupported SQL constructs rather than producing subtly broken relations.

UI differentiation: Strict SQL subset · Prisma ORM v7 · manual relation review. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
PostgreSQL CREATE TABLE subset; Prisma ORM v7 fields.

## Assumptions and limitations
DDL grammars differ across vendors. This deliberately excludes foreign keys, advanced defaults, CHECK constraints and full relation reconstruction. For actual databases prefer Prisma introspection.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference
- https://docs.prisma.io/docs/orm/v6/prisma-schema/introspection
