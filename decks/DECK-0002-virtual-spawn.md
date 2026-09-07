# DECK-0002: Virtual Spawn

DECK: 0002
Title: Virtual Spawn
Status: Draft
Created: 2026-04-21
Last updated: 2026-04-21
Requires: `CYBERSPACE_V2.md`

## Abstract

This DECK defines **virtual spawn**: a genesis action chain event where the spawn coordinate (C tag) does not equal pubkey. Unlike the standard spawn action, virtual spawn is not backed by proof-of-work. Its validity is determined entirely by application-level policy, not protocol enforcement.

A virtual spawn is useful for identities who wish to spawn in a particular location in cyberspace in order to take advantage of local applications, such as game environments.

## Specification

### Virtual Spawn Definition (normative)

A **virtual spawn** is a genesis movement event (kind 3333, A=spawn) where:
- The `C` tag contains an arbitrary 256-bit coordinate denoting where the identity spawns into cyberspace.
- The `C` value does NOT equal pubkey of the signing identity
- The event is otherwise structurally valid per CYBERSPACE_V2.md §8.3

Virtual spawn events MAY include:
- Application-specific tags for context or credentials

### Validation (normative)

Virtual spawn events are syntactically valid. The protocol does not distinguish them from standard spawn at the event structural level.

**Protocol layer**: The virtual spawn event and all actions in the chain following it are INVALID for the cyberspace protocol, as a virtual spawn is by definition a spawn with an invalid C tag. To any observer, a virtually spawned identity is "derezzed" and awaiting a valid respawn according to the cyberspace protocol.

**Application layer**: Acceptance is entirely application-specific. Applications MAY:
- Accept only virtual spawns meeting specific criteria (signed credentials, whitelisted identities, coordinate ranges, etc.)
- Accept all virtual spawns
- Reject all virtual spawns

The application may benefit from the enforcement of other cyberspace protocol standards, such as proof-of-work based movement, location-based encryption, and uniform spatial structures. The virtual spawn is a clean way to enable identities to travel to the application's area of cyberspace without breaking the continuity of the protocol or forfeiting it's spatial structure.

## Consequences

### 1. No Universal Validity

A virtual spawn has no guaranteed access to any part of Cyberspace. Each application decides whether to recognize the spawned identity at that coordinate.

An identity with a virtual spawn can:
- Publish movement events from that coordinate
- Be referenced by other events

An identity with a virtual spawn cannot assume:
- Access to any application or service
- Recognition by other identities
- Any special relationship to the spawn coordinate

### 2. Application-Scoped Existence

A virtually-spawned identity's presence in Cyberspace is meaningful only where applications choose to recognize it. A game may display the identity as a player avatar or NPC. A social app may hide it entirely. A service may require additional credentials before interaction.

The identity persists as a keypair and event chain. Its *presence* — where it appears, what it can do — is determined by each application's policy.

### 4. No Scarcity or Cost

Virtual spawn is cheap. Any identity can spawn at any coordinate without expending work. This enables:

- Programmatic entities (NPCs, service agents, automated systems)
- Arbitrary placement for application-specific purposes
- Rapid iteration and experimentation

This also enables:

- Spam (unlimited spawns at unlimited coordinates)
- Sybil attacks (one actor, many identities, many coordinates)
- Coordinate squatting (claiming "desirable" locations without cost)

Applications accepting virtual spawn MUST implement their own scarcity mechanisms if location is to remain meaningful within their context.

### 5. Standard Spawn Comparison

| Property | Standard Spawn | Virtual Spawn |
|----------|---------------|---------------|
| C tag | pubkey | Arbitrary |
| Proof-of-work | Required (Cantor tree) | Optional |
| Protocol validity | Universal | invalid |
| Application validity | Assumed unless rejected | Rejected unless accepted |
| Thermodynamic backing | Yes | Optional |
| Cyberspace Features | All | All Optional |

## Example (normative)

### Standard Spawn (for comparison)

Identity spawns at their pubkey-derived coordinate. All tags required by §8.3 and §10 are included:

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "spawn"],
    ["C", "e8ed3798c6ffebffa08501ac39e271662bfd160f688f94c45d692d876dd345a0"],
    ["X", "19088986011188665"],
    ["Y", "27231467915017080"],
    ["Z", "11846810334975873"],
    ["S", "19088986011188665-27231467915017080-11846810334975873"]
  ],
  "pubkey": "e8ed3798c6ffebffa08501ac39e271662bfd160f688f94c45d692d876dd345a0",
  "sig": "<schnorr_signature>"
}
```

Note: C = pubkey. Sector tags (X, Y, Z, S) are computed from the coordinate per §10. This spawn is universally valid under the protocol.

### Virtual Spawn

Same identity spawns at an arbitrary coordinate (e.g., to enter a game environment at its designated spawn zone):

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "spawn"],
    ["C", "a3f2b9c1d4e5f6789012345678901234567890123456789012345678908d91a0"],
    ["X", "17608966908225142"],
    ["Y", "23932066471776953"],
    ["Z", "23385833927348309"],
    ["S", "17608966908225142-23932066471776953-23385833927348309"],
    ["app", "forge-world"],
    ["meta", "player-spawn-zone-alpha"]
  ],
  "pubkey": "e8ed3798c6ffebffa08501ac39e271662bfd160f688f94c45d692d876dd345a0",
  "sig": "<schnorr_signature>"
}
```

Note: C ≠ pubkey. Sector tags are still computed from the arbitrary C coordinate. This spawn is **invalid under the cyberspace protocol** — the identity is derezzed and awaiting a valid respawn. However, the "forge-world" application may still recognize this spawn and allow the identity to interact within its environment.

## Security Considerations

### Trust and Verification

Applications accepting virtual spawn should define:
- Which identities are trusted to create virtual spawns
- What credentials or attestations are required
- Rate limits (max spawns per identity, per time window)
- Coordinate restrictions (allowed zones, reserved areas)

### Abuse Mitigation

Without restrictions, virtual spawn enables:
- Flooding (millions of spawns across coordinate space)
- Impersonation (spawning at coordinates associated with legitimate services)
- Confusion (users cannot distinguish standard vs. virtual spawn without inspection)

Mitigations are application-layer:
- Reputation systems
- Verification registries
- User-facing indicators (show spawn type, show verification status)
- Reporting and takedown procedures

## Open Questions

1. **Should virtual spawn use a distinct action tag?** (e.g., `A=virtual-spawn` vs `A=spawn`)
   - Makes spawn type immediately visible
   - Adds complexity to client handling

2. **Should there be a protocol-level indicator?** (e.g., `virt` tag)
   - Enables filtering without computing pubkey
   - Or keep this purely verification-layer (client computes and compares)

3. **Relationship to future domain rules?**
   - Can domain owners restrict virtual spawns within their domain?
   - Can domain owners create virtual spawns without restriction?

## Implementation Guidance

For applications accepting virtual spawn:

1. **Verify spawn type**: Compare pubkey to C tag. Mismatch = virtual spawn.

2. **Define acceptance policy**: What virtual spawns are accepted? What credentials required?

3. **Communicate to users**: Show spawn type, verification status, any relevant credentials.

4. **Implement rate limiting**: Prevent spam via per-identity, per-time, or per-coordinate limits.

5. **Plan for abuse**: Takedown procedures, blacklisting, user reporting.
