# DECK-0003: Derezz — PVP Combat in Cyberspace

**Status:** Draft
**Version:** 1.0
**Created:** 2026-03-18
**Authors:** XOR, Arkinox

---

## Abstract

Derezz is a PVP (player-vs-player) combat action that returns avatars to their spawn location. This DECK specifies:

- **Proof-based attack validation** using Cantor proofs for spatial proximity
- **Temporal ordering rules** preventing gaming/timing attacks
- **Domain owner advantage** — knowledge of R enables instant derezz within owned territory
- **Post-derezz state** — victim must respawn

---

## 1. Overview

### 1.1 What Is Derezz?

Derezz is a protocol-level action that "kills" an avatar, forcing them to respawn at their original spawn location. It represents the danger of being predictable in cyberspace.

**Etymology:** Short for "de-resurrect" — to undo a resurrection, returning an avatar to a pre-spawn state.

### 1.2 Core Mechanics

```
Attacker publishes derezz action
    ↓
Action includes Cantor proof for region containing both positions
    ↓
If valid: victim is "derezzed"
    ↓
Victim must respawn at their original spawn location
```

### 1.3 Design Principles

1. **Movement chain integration** — Derezz is part of the movement proof chain
2. **Spatial proximity required** — Attacker must prove both parties are in same region
3. **Temporal ordering** — Timestamps prevent gaming
4. **Domain authority** — Domain owners have natural advantage within their territory

### 1.4 Layer Summary

This DECK operates across three layers:

| Layer | Components | Enforcement |
|-------|------------|-------------|
| **Mathematical** | Cantor proof of spatial proximity, temporal chain validation | Trustless — proof either validates or doesn't |
| **Protocol** | Event structure (kind 3333, A="derezz"), chain invalidation rules, domain policy checks | Consensus — clients enforce rules |
| **Social** | Bounties, reputation, safe zone agreements, spawn camping norms | Coordination — trust-based, cultural |

**Key principle:** Derezz validity is mathematical — the proof either proves proximity or it doesn't. But safe zones and domain policies are protocol-layer rules that can be changed by governance.

---

## 2. Derezz Event Structure

### 2.1 Event Format (Kind 3333)

Derezz uses the standard action event kind (3333) with `A` tag set to "derezz". The structure follows the core protocol movement event pattern:

```json
{
  "kind": 3333,
  "content": "<optional: message or taunt>",
  "tags": [
    ["A", "derezz"],
    ["e", "<attacker_spawn_event_id>", "", "genesis"],
    ["e", "<attacker_previous_event_id>", "", "previous"],
    ["p", "<victim_pubkey>"],
    ["e", "<victim_movement_event_id>", "", "victim"],
    ["c", "<attacker_prev_coord_hex>"],
    ["C", "<attacker_current_coord_hex>"],
    ["proof", "<proof_hash_hex>"],
    ["X", "<sector_x>"],
    ["Y", "<sector_y>"],
    ["Z", "<sector_z>"],
    ["S", "<sector_s>"]
  ],
  "pubkey": "<attacker_pubkey>",
  "created_at": <Unix timestamp>,
  "id": "<event ID>",
  "sig": "<Nostr signature>"
}
```

**Tag details (following core protocol §6.4 pattern):**
- `A` — Action type: "derezz"
- `e` (genesis) — Attacker's spawn event (chain root)
- `e` (previous) — Attacker's previous movement event
- `p` — Victim's pubkey (the target)
- `e` (victim) — Victim's most recent movement event (proves their position)
- `c` — Attacker's previous coordinate (32-byte hex)
- `C` — Attacker's current coordinate (32-byte hex)
- `proof` — Cantor proof hash (32-byte hex)
- `X`, `Y`, `Z`, `S` — Sector tags

**Key difference from hop events:**
- Includes `p` tag for victim pubkey
- Includes `e` tag referencing victim's movement event
- Proof must demonstrate both attacker and victim positions are in the same spatial region

### 2.2 Proof Requirements

The Cantor proof must demonstrate spatial proximity between attacker and victim:

```
Attacker_position ∈ Region
Victim_position ∈ Region
```

**Proof structure (following core protocol §5):**
1. Compute the spatial region integer `region_n` for a region containing both positions
2. Derive the temporal height `K` from the attacker's current coordinate
3. Compute the temporal axis root `cantor_t` from the attacker's previous event id and `K`
4. Compute `derezz_n = π(region_n, cantor_t)`
5. Compute `proof_hash` per core protocol §5.6
6. Place in `proof` tag

The proof is computed the same way as a hop proof (core protocol §6.5), but the region must contain both the attacker's position AND the victim's position.

---

## 3. Temporal Ordering Rules

### 3.1 Timestamp Requirements

The derezz event timestamp must satisfy:

```
derezz.timestamp > attacker_previous_action.timestamp + 1
```

**Why +1 second?** Prevents rapid-fire attacks. Each action must be at least 1 second after the previous.

### 3.2 Victim State Requirement

The derezz targets the victim's **most recent movement action** where:

```
victim_movement.timestamp <= derezz.timestamp
```

**Critical:** If the derezz is valid, it **invalidates all future actions** in the victim's action chain. The victim must start a new chain with a new spawn event.

This means an attacker can publish a derezz that is backdated (minutes or even hours old) to cut off a victim's chain at a point in the past. This is valid.

**Why timing attacks are unlikely:** For a backdated derezz to work, the attacker must:
1. Be spatially near the victim at the backdated time
2. Have published NO movement events since (their chain timestamp must not have advanced)
3. Essentially have a spawned pubkey "lying in wait" for the victim to pass by

The probability of an attacker being near a victim without having published any movement events is extremely low. This is the natural defense against timing attacks.

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
   - Has A tag with value "derezz"
   - Has e tags (genesis, previous, victim)
   - Has p tag (victim pubkey)
   - Has c, C tags (coordinates)
   - Has proof tag

3. Validate attacker's chain:
   a. Fetch attacker's previous event (e tag with marker "previous")
   b. Verify derezz.timestamp > previous.timestamp + 1
   c. Verify c tag matches previous event's C tag

4. Validate victim reference:
   a. Fetch victim's movement event (e tag with marker "victim")
   b. Verify victim pubkey matches p tag
   c. Verify victim_movement.timestamp <= derezz.timestamp

5. Verify spatial proof (per core protocol §6.5):
   a. Parse attacker coordinates from C tag
   b. Parse victim coordinates from victim_movement event
   c. Compute spatial region containing both positions
   d. Compute region_n, cantor_t, and proof_hash
   e. Verify proof_hash matches event's proof tag

6. Check domain policy (if in a domain):
   domain = find_domain_at(victim_position)
   IF domain AND domain.policy.derezz == "deny":
       IF attacker != domain.owner:
           REJECT (PVP disabled in this domain)
       # Domain owner is exempt from policy

7. Derezz is VALID if all checks pass
```

### 4.2 After Valid Derezz

**Victim state:**
```
victim.status = "derezzed"
victim.derezzed_at = derezz.timestamp
victim.derezzed_by = attacker_pubkey
```

**Victim can only publish:**
- Spawn event (kind 3333, A="spawn") — to respawn

**All other victim actions are ignored until respawn.**

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

After being derezzed, the victim must publish a spawn event to re-enter cyberspace at their original spawn location.

### 6.1 Respawn Event (Kind 3333)

The respawn event uses the core protocol spawn action (`A: "spawn"`):

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

**Critical constraint:** `coord_hex` MUST equal `pubkey` — the victim returns to their original spawn location. This is the dire consequence of being derezzed.

### 6.2 Respawn Validation

```
1. Victim must have been derezzed (status == "derezzed")

2. Spawn location must be valid:
   - coord_hex MUST equal victim's pubkey (original spawn location)

3. After valid respawn:
   victim.status = "active"
   victim.position = original_spawn_coordinate
```

**The penalty of derezz:** Being sent back to your spawn location. All progress lost.

**Note on spawn restrictions:** The protocol cannot have spawn restrictions that deny specific pubkeys access to cyberspace. Every pubkey has the right to spawn at their coordinate (pubkey = spawn location).

**However, domain owners can derezz avatars spawning in their territory.** This creates de facto access control:
- Mine a domain over someone else's spawn coordinate
- Derezz them as soon as they spawn
- They must respawn → you derezz again → infinite loop

**The incentive:** Mine your own domain where your pubkey spawns. Own your spawn point. This is the natural defense against spawn camping.

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

### 8.4 Backdated Derezz (Timing Attacks)

**Possibility:** An attacker could publish a derezz with a backdated timestamp (minutes or hours old) to cut off a victim's action chain at a point in the past.

**Why this is valid:** The derezz targets the victim's most recent movement action where `timestamp <= derezz.timestamp`. If the derezz is valid, all future actions in the victim's chain are invalidated.

**Why this is unlikely:** For a backdated derezz to succeed, the attacker must:
1. Have been spatially near the victim at the backdated time (proof must contain both positions)
2. Have published NO movement events since (their chain timestamp must not have advanced beyond the derezz timestamp)
3. Essentially have a "sleeper" pubkey lying in wait

The probability of an attacker being near a victim without any published movement events is extremely low. Normal play involves continuous movement and chain advancement.

**Mitigation:** The natural defense is continuous movement. A moving player's chain timestamp advances, making backdated attacks impractical.

### 8.5 Spawn Camping by Domain Owners

**Risk:** A domain owner can derezz anyone spawning in their territory repeatedly, creating an infinite loop of spawn → derezz → respawn → derezz.

**Implication:** Domain owners have de facto access control over spawn points within their domain. This can be used to:
- Extract payment for safe passage
- Exclude specific individuals
- Create private enclaves

**Defense:** Mine your own domain at your spawn coordinate. Own your spawn point. This guarantees you cannot be spawn-camped (you're the domain owner).

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
| After derezz | Can only publish spawn (kind 3333, A="spawn") |
| Spawn location | MUST equal pubkey (original spawn) |
| Protection | Enter safe zone (domain with derezz: deny) |

---

## 10. Protocol Summary

**Action Types (Kind 3333):**

| `A` tag | Action | Description | Reference |
|---------|--------|-------------|-----------|
| `spawn` | Spawn | Enter cyberspace (coord = pubkey) | Core §6.3 |
| `hop` | Movement | Traversal proof | Core §6.4 |
| `derezz` | PVP attack | Return victim to spawn | This DECK |

**Policy Actions:**

| Action | Values | Effect |
|--------|--------|--------|
| derezz | allow/deny | Enable/disable PVP in domain |

**The Game:**

```
Movement → Predictability → Vulnerability
    ↓
Derezz (if PVP enabled)
    ↓
Respawn at original spawn location
    ↓
Movement → ...
```

**The Meta:**

- Stay in safe zones to avoid PVP
- Enter domains at your own risk
- Domain owners are gods within their territory
- Being idle makes you an easier target

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
