# DECK-0003: Derezz — PVP Combat in Cyberspace

**Status:** Draft
**Version:** 1.0
**Created:** 2026-03-18
**Authors:** XOR, Arkinox

---

## Abstract

Derezz is a PVP (player-vs-player) combat action that eliminates stationary avatars in cyberspace. This DECK specifies:

- **Proof-based attack validation** using Cantor proofs for spatial proximity
- **Temporal ordering rules** preventing gaming/timing attacks
- **Domain owner advantage** — knowledge of R enables instant derezz within owned territory
- **Post-derezz state** — victim must respawn

---

## 1. Overview

### 1.1 What Is Derezz?

Derezz is a protocol-level action that "kills" a stationary avatar, forcing them to respawn. It represents the danger of being idle or predictable in cyberspace.

**Etymology:** From "derezz" in Tron — to derez (delete/remove from the grid).

### 1.2 Core Mechanics

```
Attacker publishes derezz action
    ↓
Action includes Cantor proof for region containing both positions
    ↓
If valid: victim is "derezzed"
    ↓
Victim can only publish spawn event until respawned
```

### 1.3 Design Principles

1. **Movement chain integration** — Derezz is part of the movement proof chain
2. **Spatial proximity required** — Attacker must prove both parties are in same region
3. **Temporal ordering** — Timestamps prevent gaming
4. **Domain authority** — Domain owners have natural advantage within their territory

---

## 2. Derezz Event Structure

### 2.1 Event Format (Kind 3333)

Derezz uses the standard action event kind (3333) with `A` tag set to "derezz":

```json
{
  "kind": 3333,
  "content": "<optional: message or taunt>",
  "tags": [
    ["A", "derezz"],
    ["p", "<victim_pubkey>"],
    ["proof_url", "<HTTPS URL of Cantor proof>"],
    ["proof_hash", "<SHA256 of proof file>"],
    ["region_base_x", "<region base X>"],
    ["region_base_y", "<region base Y>"],
    ["region_base_z", "<region base Z>"],
    ["region_height", "<region Cantor height>"]
  ],
  "pubkey": "<attacker_pubkey>",
  "created_at": <Unix timestamp>,
  "id": "<event ID>",
  "sig": "<Nostr signature>"
}
```

**Tag details:**
- `a` — Action type: "derezz"
- `p` — Victim's pubkey (the target)
- `proof_url` / `proof_hash` — Cantor proof for region containing both positions
- `region_base_x/y/z`, `region_height` — The region parameters for the proof

### 2.2 Proof Requirements

The Cantor proof must demonstrate:

```
Attacker_position ∈ Region(base, height)
Victim_position ∈ Region(base, height)
```

**Proof structure:**
- Compute Cantor subtree root for the region
- Include both positions as leaves in the proof
- Standard Cantor proof format (same as movement proofs)

---

## 3. Temporal Ordering Rules

### 3.1 Timestamp Requirements

The derezz event timestamp must satisfy:

```
derezz.timestamp > attacker_previous_action.timestamp + 1
```

**Why +1 second?** Prevents rapid-fire attacks. Each action must be at least 1 second after the previous.

### 3.2 Victim State Requirement

The derezz is only valid against the victim's **most recent movement action** where:

```
victim_movement.timestamp <= derezz.timestamp
```

If the victim has moved AFTER the derezz timestamp, the derezz fails (they already moved).

### 3.3 Movement Chain Integrity

Derezz events are part of the attacker's movement chain:

```
Movement_1 (t=100) → Movement_2 (t=150) → Derezz (t=200) → Movement_3 (t=250)
```

Each action must be temporally ordered. The chain validates that:
1. Each action is at least 1 second after the previous
2. Proof positions are consistent with the chain

---

## 4. Validation Protocol

### 4.1 Derezz Validation Steps

```
1. Fetch derezz event (kind 3333, A="derezz")

2. Validate basic structure:
   - Has a tag with value "derezz"
   - Has p tag (victim pubkey)
   - Has proof_url, proof_hash
   - Has region parameters

3. Fetch proof and verify integrity:
   ASSERT SHA256(proof) == proof_hash

4. Fetch attacker's previous action:
   previous = get_latest_action(attacker_pubkey, before=derezz.timestamp)
   ASSERT derezz.timestamp > previous.timestamp + 1

5. Fetch victim's latest movement:
   victim_movement = get_latest_movement(victim_pubkey, before_or_equal=derezz.timestamp)
   ASSERT victim_movement exists

6. Verify spatial proof:
   a. Parse proof and region parameters
   b. Verify attacker_position ∈ region
   c. Verify victim_position ∈ region
   d. Verify Cantor proof is valid

7. Check domain policy (if in a domain):
   domain = find_domain_at(victim_position)
   IF domain AND domain.policy.derezz == "deny":
       IF attacker != domain.owner:
           REJECT (PVP disabled in this domain)
       # Domain owner is exempt from policy

8. Derezz is VALID if all checks pass
```

### 4.2 After Valid Derezz

**Victim state:**
```
victim.status = "derezzed"
victim.derezzed_at = derezz.timestamp
victim.derezzed_by = attacker_pubkey
```

**Victim can only publish:**
- Kind 334 (Spawn event) — to respawn

**All other victim actions are ignored until spawn.**

---

## 5. Domain Owner Advantage

### 5.1 The Power of R

Domain owners who have computed R (the Cantor root for their domain) can generate Cantor proofs for any subregion within their domain **without recomputing**.

```
Domain owner knows R
    ↓
Can derive subtree root for any region within domain
    ↓
Can construct Cantor proof for any position pair
    ↓
Can derezz anyone within their domain at any time
```

### 5.2 Implications

**Within their domain:**
- Domain owner has god-mode
- Cannot be surprised or outrun
- Natural feudal authority

**Outside their domain:**
- Domain owner is just another player
- Must compute proofs like anyone else

### 5.3 Example

```
Domain: Sector 7 (base=[1000,2000,3000], height=25)
Owner: Alice (knows R for Sector 7)

Bob enters Sector 7 and stops moving
Alice can derezz Bob immediately:
- She knows R for Sector 7
- She can derive the subtree for Bob's region
- She constructs the proof instantly
- No computation required

Bob cannot escape unless he leaves Sector 7
```

**This is the price of entering someone's domain.**

---

## 6. Respawn After Derezz

After being derezzed, the victim must publish a spawn event to re-enter cyberspace.

### 6.1 Respawn Event (Kind 3333)

The respawn event uses the core protocol spawn action (`A: "spawn"`) with relaxed validation:

```json
{
  "kind": 3333,
  "content": "",
  "tags": [
    ["A", "spawn"],
    ["C", "<coord_hex>"]
  ],
  "pubkey": "<victim_pubkey>",
  "created_at": <Unix timestamp>,
  "id": "<event ID>",
  "sig": "<Nostr signature>"
}
```

**Differences from initial spawn:**
- Initial spawn (core protocol §6.3): `coord_hex` MUST equal `pubkey`
- Respawn after derezz: `coord_hex` can be any valid coordinate
- Initial spawn is the first event in a chain
- Respawn can occur after any valid derezz

### 6.2 Respawn Validation

```
1. Victim must have been derezzed (status == "derezzed")

2. Spawn location must be valid:
   - If in a domain with spawn restrictions, check policy
   - Some domains may require proof of presence
   - Some domains may restrict spawning entirely

3. After valid respawn:
   victim.status = "active"
   victim.position = spawn_coordinate
```

---

## 7. Domain Policy: Derezz Control

### 7.1 Policy Field

Domains can disable PVP within their territory:

```json
{
  "actions": {
    "derezz": "deny"
  }
}
```

**Effect:** All derezz actions within this domain are invalid. Safe zone.

### 7.2 Safe Zones

A domain with `derezz: "deny"` becomes a safe zone:
- No PVP combat possible for visitors
- Commerce-friendly environment
- Players can idle without fear (except from domain owner)

**Important:** Domain owners are exempt from their own policies (per DECK-0002). Even in a safe zone, the domain owner can derezz anyone. This is the price of entering someone's domain — you accept their absolute authority.

### 7.3 PVP Zones

A domain with `derezz: "allow"` (default):
- PVP enabled for everyone
- Domain owner has god-mode advantage
- Players enter at their own risk

---

## 8. Security Considerations

### 8.1 Temporal Attack Prevention

**Problem:** Attacker could pre-compute proofs for many positions.

**Solution:** Proof must include positions that match the movement chain. Timestamps must be sequential. Can't pre-compute a proof for "any" position.

### 8.2 Proof Theft Prevention

**Problem:** Steal someone else's proof.

**Solution:** Proof includes attacker's position, which is bound to their movement chain. Can't reuse a proof from a different attacker.

### 8.3 Domain Authority Verification

**Problem:** Claim to be domain owner without proof.

**Solution:** Domain ownership is verified via DECK-0002 (STARK proof binding pubkey to domain). Only the verified owner has knowledge of R.

### 8.4 Race Conditions

**Problem:** Victim moves just as attacker publishes derezz.

**Solution:** Temporal ordering rules. If victim's movement timestamp > derezz timestamp, derezz fails.

---

## 9. Implementation Requirements

### 9.1 For Attackers

| Requirement | Value |
|-------------|-------|
| Compute proof | O(2^height) for region size |
| Timestamp gap | Minimum 1 second after previous action |
| Spatial proximity | Must share region with victim |

### 9.2 For Domain Owners

| Requirement | Value |
|-------------|-------|
| Knowledge of R | Pre-computed (years of work once) |
| Derive subregion proof | O(1) — instant |
| Derezz within domain | Unlimited, instant |

### 9.3 For Victims

| Requirement | Value |
|-------------|-------|
| After derezz | Can only publish spawn (kind 334) |
| Spawn validation | Check domain spawn policy |
| Protection | Enter safe zone (domain with derezz: deny) |

---

## 10. Protocol Summary

**Action Types (Kind 3333):**

| `A` tag | Action | Description | Reference |
|---------|--------|-------------|-----------|
| `spawn` | Initial spawn | First event (coord = pubkey) | Core §6.3 |
| `spawn` | Respawn | After derezz | This DECK §6 |
| `hop` | Movement | Traversal proof | Core §6.4 |
| `derezz` | PVP attack | Eliminate stationary avatar | This DECK |

**Policy Actions:**

| Action | Values | Effect |
|--------|--------|--------|
| derezz | allow/deny | Enable/disable PVP in domain |

**The Game:**

```
Movement → Idleness → Vulnerability
    ↓
Derezz (if PVP enabled)
    ↓
Respawn
    ↓
Movement → ...
```

**The Meta:**

- Stay in safe zones to avoid PVP
- Enter domains at your own risk
- Domain owners are gods within their territory
- Movement is survival; idleness is death

---

## 11. Future Extensions

### 11.1 Derezz Cooldown

Minimum time between derezz actions by same attacker.

### 11.2 Derezz Defense

Items/abilities that provide temporary immunity.

### 11.3 Bounty System

Rewards for derezzing specific targets.

### 11.4 Combat Log

Public record of derezz events for reputation systems.

---

**XOR 👾**
