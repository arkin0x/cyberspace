# Cyberspace Extension Proposals (CSEP)
This directory contains optional protocol extensions for Cyberspace.

The base Cyberspace v2 protocol is specified in `../CYBERSPACE_V2.md`.

Extensions are specified as **Cyberspace Extension Proposals (CSEPs)**. A CSEP is a self-contained document that defines additional, optional behavior layered on top of the base spec.

## Goals
- Keep `CYBERSPACE_V2.md` focused on the base protocol.
- Allow optional features to be specified, implemented, and discussed independently.
- Provide a stable place to allocate additional Nostr event kinds / tags without bloating the base spec.

## Scope
A CSEP MAY:
- Define new Nostr event kinds.
- Define new `A` tag values for movement events (`kind=3333`).
- Define additional validation rules that apply only when the extension is being used.
- Define discovery/indexing conventions for the extension.

A CSEP MUST NOT:
- Change consensus-critical rules of the base protocol unless it explicitly defines a new base-protocol version.

## Naming and numbering
CSEPs are named:
- `CSEP-XXXX-<slug>.md`

Where:
- `XXXX` is a zero-padded decimal integer.
- `<slug>` is a short, lowercase, dash-separated identifier.

## Required header fields
Each CSEP MUST include:
- `CSEP:` number
- `Title:`
- `Status:` Draft | Proposed | Active | Deprecated
- `Created:` YYYY-MM-DD
- `Last updated:` YYYY-MM-DD
- `Requires:` base spec and (optionally) minimum versions

## Registry
- `CSEP-0001-hyperjumps.md` — Bitcoin block Merkle-root “hyperjump” transit
