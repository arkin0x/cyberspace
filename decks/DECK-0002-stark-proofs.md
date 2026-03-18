# DECK-0002: Domains — Cryptographic Territory in Cyberspace

**Status:** Draft
**Version:** 3.0
**Created:** 2026-03-18
**Authors:** XOR, Arkinox

---

## Abstract

Domains are claimed territories in cyberspace, established through computational work and secured by cryptographic proofs. This DECK specifies:

- **STARK-based proof system** for asymmetric verification
- **Layered capability model** (Mathematical, Protocol, Social)
- **Domain policy** for protocol-level feature control
- **Content sovereignty** through signature filtering
- **CP-ABE integration** for role-based access control

---

## 1. Overview

### 1.1 What Is a Domain?

A domain is a spatial region in cyberspace that has been claimed through computational work. The claimant proves they computed the Cantor subtree root for that region, establishing:

1. **Mathematical authority** — Knowledge of the region's Cantor root R
2. **Protocol authority** — Right to set policy and control content
3. **Social authority** — Ability to issue credentials and gate access

### 1.2 The Three Layers of Domain Capability

Domains operate across three distinct enforcement layers:

| Layer | Enforcement | Trust Model | Capabilities |
|-------|-------------|-------------|--------------|
| **Mathematical** | Cryptography | Trustless | STARK proof, subtree knowledge, CP-ABE |
| **Protocol** | Consensus rules | Trust protocol | Action control, content sovereignty |
| **Social** | Human coordination | Trust relationships | Interactive access, arbitrary gating |

**Key principle:** Lower layers are more rigid but trustless. Higher layers are more flexible but require trust.

### 1.3 Knowledge Irrevocability

**Critical insight:** Knowledge of the Cantor root R cannot be revoked.

```
Compute R (years of work)
    ↓
Claim "expires"
    ↓
You STILL KNOW R
    ↓
Nothing can erase that knowledge
```

This means:
- Expiration is social recognition, not cryptographic erasure
- Transfer requires re-computation by new owner
- Discovery is permanent; ownership is mutable

**Architecture implication:** The protocol separates **discovery** (permanent, mathematical) from **recognition** (mutable, social). See Section 11.

---

## 2. STARK Proof System

### 2.1 Problem Statement

A domain requires proving computation of Cantor subtree roots for:
1. A spatial region [base_x, base_y, base_z, height] — the territory
2. The claimant's pubkey — identity binding

The challenge:
- **Prover** must do substantial work (O(2^height) operations)
- **Verifier** cannot feasibly recompute (same work required)
- **Root R** must never be revealed (prevents counter-claims)

### 2.2 Solution

A **zk-STARK** (Zero-Knowledge Scalable Transparent ARgument of Knowledge) that proves:

> "I correctly computed the Cantor subtree roots for the spatial region defined by [base_x, base_y, base_z, height], obtaining root R, and I bind this claim to my pubkey."

The STARK proof itself serves as the commitment. No separate commitment field is needed.

### 2.3 Circuit Computation

The STARK circuit computes:

**Inputs:**
- base_x, base_y, base_z (starting coordinates for each axis)
- height (power-of-two side length)
- claimant_pubkey (identity)

**Steps:**

1. **Compute X-Axis Root:**
```python
def axis_subtree_root(base, height):
    values = list(range(base, base + (1 << height)))
    for _ in range(height):
        values = [cantor_pair(values[i], values[i + 1]) 
                  for i in range(0, len(values), 2)]
    return values[0]

root_x = axis_subtree_root(base_x, height)
```

2. **Compute Y-Axis Root:**
```python
root_y = axis_subtree_root(base_y, height)
```

3. **Compute Z-Axis Root:**
```python
root_z = axis_subtree_root(base_z, height)
```

4. **Compute Combined Region Root (R):**
```python
R = cantor_pair(cantor_pair(root_x, root_y), root_z)
```

5. **Public Commitment:**
```python
Public_Commitment = Poseidon2(R, claimant_pubkey)
```

**The root R is a private witness — never revealed.**

### 2.4 Public Inputs

| Input | Type | Description |
|-------|------|-------------|
| base_x | u64 | Base X coordinate |
| base_y | u64 | Base Y coordinate |
| base_z | u64 | Base Z coordinate |
| height | u8 | Cantor tree height |
| claimant_pubkey | [u8; 32] | Nostr pubkey of claimant |
| Public_Commitment | [u8; 32] | Poseidon2 hash output |

### 2.5 Verification Complexity

| Height | Territory Volume | Verifier Time |
|--------|------------------|---------------|
| Height 20 | 2^60 coords | ~35 ms |
| Height 30 | 2^90 coords | ~50 ms |
| Height 35 | 2^105 coords | ~60 ms |

**Any smartphone can verify any domain.**

---

## 3. Domain Event Structure

### 3.1 Primary Event (Kind 33333)

```json
{
  "kind": 33333,
  "content": "<optional: domain description or metadata>",
  "tags": [
    ["d", "<domain_identifier: 64 hex chars (Public_Commitment)>"],
    ["h", "<optional: first 8 chars of d, for indexing>"],
    ["subject", "<optional: human-readable domain name>"],
    ["base_x", "<base X coordinate>"],
    ["base_y", "<base Y coordinate>"],
    ["base_z", "<base Z coordinate>"],
    ["height", "<Cantor tree height>"],
    ["proof_url", "<HTTPS URL of STARK proof>"],
    ["proof_hash", "<SHA256 of proof file>"],
    ["policy_url", "<optional: URL to domain policy>"],
    ["policy_hash", "<optional: SHA256 of policy file>"]
  ],
  "pubkey": "<claimant's Nostr pubkey>",
  "created_at": <Unix timestamp>,
  "id": "<event ID>",
  "sig": "<Nostr signature>"
}
```

**Tag details:**
- `d` — The full domain identifier, derived from `Public_Commitment = Poseidon2(R, claimant_pubkey)`. This is a 32-byte value (64 hex chars) that uniquely identifies the domain and binds it to the claimant. **Required.**
- `h` — Prefix of `d` (first 8 chars) for efficient Nostr filtering/indexing. **Optional**, but if present must match `d[0:8]`.
- `subject` — Optional human-readable name for the domain (e.g., "North Sector 7").

**NIP-33 Compliance:** Kind 33333 is parameterized replaceable. The `d` tag must be unique per domain.

### 3.2 Domain Policy (Optional)

Domain policy is a separate JSON document defining protocol-level controls:

```json
{
  "version": 1,
  "domain_id": "<domain_identifier>",
  "actions": {
    "derezz": "deny",
    "hyperjump": "allow",
    "spawn": "pubkey_list",
    "scan": "limited",
    "scan_range": 1000
  },
  "spawn_list": [
    "<pubkey1>",
    "<pubkey2>"
  ],
  "content_filter": "owner_only"
}
```

**Action values:**
- `"allow"` — Anyone can perform (default cyberspace behavior)
- `"deny"` — No one can perform (disabled in this domain)
- `"pubkey_list"` — Only listed pubkeys can perform

---

## 4. Verification Protocol

### 4.1 Domain Verification Steps

```
1. Fetch domain event from Nostr relay

2. Extract and validate tags:
   - d (full domain identifier: 64 hex chars)
   - h (optional: prefix for indexing)
   - base_x, base_y, base_z, height
   - proof_url, proof_hash

3. If h tag present, validate prefix consistency:
   ASSERT d[0:8] == h
   
   The h tag enables efficient Nostr filtering but is
   optional. If present, it must match the d tag prefix.

4. Fetch proof from HTTPS:
   proof = https_get(proof_url)
   
5. Verify proof integrity:
   ASSERT SHA256(proof) == proof_hash

6. Parse and verify STARK proof:
   public_inputs = {
       base_x, base_y, base_z, height,
       claimant_pubkey: event.pubkey,
       Public_Commitment: d
   }
   result = verify_stark(proof, public_inputs)
   ASSERT result == true

7. Domain is VALID if all checks pass
```

**Critical:** Step 6 verifies the STARK proof was generated with the claimant's pubkey. This prevents proof theft — a proof generated by Alice cannot be reused by Bob.

### 4.2 Policy Verification

If `policy_url` and `policy_hash` are present:

```
1. Fetch policy from HTTPS:
   policy = https_get(policy_url)
   
2. Verify integrity:
   ASSERT SHA256(policy) == policy_hash

3. Validate policy structure:
   - Check version field
   - Validate action values
   - Check spawn_list format if spawn == "pubkey_list"

4. Policy is VALID if all checks pass
```

---

## 5. Protocol Layer: Action Control

### 5.1 Default Cyberspace Behavior

In unclaimed space, all protocol actions are allowed:

| Action | Default |
|--------|---------|
| derezz | allow |
| hyperjump | allow |
| spawn | allow |
| scan | allow |

### 5.2 Domain Override

Domain owners can disable or restrict actions within their territory:

```json
{
  "actions": {
    "derezz": "deny",
    "spawn": "pubkey_list"
  }
}
```

**Effect:**
- `derezz: "deny"` — PVP attacks are protocol-invalid within this domain
- `spawn: "pubkey_list"` — Only listed pubkeys can spawn here

### 5.3 Action Enforcement

```
User attempts action within domain D:
    1. Find domain D for coordinate
    2. If no domain: default rules apply
    3. If domain exists:
       a. Verify domain proof is valid
       b. Check action against domain policy
       c. If policy == "deny": REJECT
       d. If policy == "pubkey_list" AND user not in list: REJECT
       e. Otherwise: ALLOW
```

### 5.4 Example: Safe Zones

A domain with `"derezz": "deny"` becomes a safe zone:
- No player-killing possible
- Commerce-friendly environment
- Trust established through cryptographic proof

**Contrast with unclaimed space:**
- Wild territory, PVP-enabled
- Higher risk, potentially higher reward
- No authority to appeal to

---

## 6. Protocol Layer: Content Sovereignty

### 6.1 The Principle

Within a valid domain, only content authored by the domain owner is recognized as valid/visible.

**Mechanism:**
```python
def is_valid_content(event, coordinate):
    domain = find_domain_at(coordinate)
    
    if domain is None:
        return True  # Wild space - all content valid
    
    # Domain space - only owner content is valid
    if event.references(domain.event_id) and event.author == domain.owner:
        return True
    
    return False  # Content filtered by protocol
```

### 6.2 Transmission vs. Visibility

**Transmission layer (Nostr):**
- Censorship-resistant by design
- Anyone CAN publish anywhere
- Events are transmitted regardless of domain

**Application layer (clients):**
- Protocol-compliant clients filter by domain authority
- Non-owner content is NOT displayed
- "Official" content is owner-signed only

### 6.3 Implications

- Domain owners control what "officially exists" in their space
- Spam/abuse is filtered at the application layer
- Work to compute R earned this right
- Non-owner content exists on the network but is invisible in clients

---

## 7. Mathematical Layer: Hierarchical Knowledge

### 7.1 The Core Property

Computing the Cantor root R at height H gives knowledge of ALL subtree roots below.

```python
# Domain owner at height 35 knows R
R = compute_region_root(base, height=35)

# They can derive any child region's root
R_child = derive_subtree_root(R, path_to_child)

# This applies recursively
# Parent domain knows all children's secrets
```

### 7.2 Implications

**For domain owners:**
- Can create hierarchical access control (room keys)
- Can decrypt any location-encrypted content in their domain
- Have "god mode" within their territory

**For subsidiary domains:**
- Cannot keep secrets from parent domain
- Natural feudal hierarchy emerges
- Information flows down, not up

### 7.3 The Privacy Hierarchy Problem

**Critical:** Location encryption protects against remote attackers, NOT against domain owners.

```python
# Location-encrypted content at coordinate C
K = subtree_root(C, height=local_height)
ciphertext = AES(content, K)

# Domain owner can derive K from R
K = derive_subtree_root(R, path_to_C)
# Domain owner can decrypt WITHOUT being at C
```

**Users wanting privacy from domain owners must:**
1. Add additional encryption layer (ABE, arbitrary key), OR
2. Accept domain owner can see their content, OR
3. Avoid domains entirely for sensitive content

**This is not a bug** — it's the same property enabling hierarchical access control.

---

## 8. Mathematical Layer: CP-ABE Integration

### 8.1 Overview

Ciphertext-Policy Attribute-Based Encryption (CP-ABE) enables role-based access control without the domain owner being online.

**How it works:**
1. Domain owner generates ABE master key (arbitrary, NOT derived from R)
2. Owner issues role keys to users (signed with domain pubkey)
3. Content is encrypted with a policy
4. Decryption succeeds IFF user's attributes satisfy the policy

### 8.2 Authority Chain

```
R proves work (STARK witness)
    ↓
STARK binds pubkey P to domain
    ↓
P issues ABE role keys (signed)
    ↓
Anyone verifies role was issued by legitimate authority
```

**Key insight:** The ABE master key is arbitrary. Authority comes from pubkey binding, not key derivation.

### 8.3 Role Issuance Event (Kind 33334)

```json
{
  "kind": 33334,
  "content": "<encrypted ABE private key>",
  "tags": [
    ["domain", "<domain_identifier>"],
    ["recipient", "<user_pubkey>"],
    ["attributes", "citizen,level_5,founder"],
    ["expires", "<optional: Unix timestamp>"]
  ],
  "pubkey": "<domain owner pubkey>",
  "created_at": <Unix timestamp>,
  "id": "<event ID>",
  "sig": "<Nostr signature>"
}
```

**The content field contains the ABE private key, encrypted for the recipient.**

### 8.4 Content with ABE Policy

```json
{
  "kind": <any>,
  "content": "<CP-ABE encrypted content>",
  "tags": [
    ["domain", "<domain_identifier>"],
    ["abe_policy", "citizen AND level >= 3"],
    ["encryption", "cp-abe"]
  ],
  "pubkey": "<domain owner pubkey>",
  "created_at": <Unix timestamp>
}
```

**Decryption:**
1. User extracts policy from `"abe_policy"` tag
2. User retrieves their ABE private key (from kind 33334 event)
3. CP-ABE decryption succeeds IFF attributes satisfy policy
4. No domain owner interaction required

### 8.5 Example Policies

| Policy | Meaning |
|--------|---------|
| `"citizen"` | Any citizen |
| `"citizen AND level >= 5"` | High-level citizens |
| `"admin OR founder"` | Leadership |
| `"(citizen AND verified) OR guest"` | Verified citizens or guests |

---

## 9. Social Layer: Interactive Access Control

### 9.1 Arbitrary Encryption

Domain owners can encrypt content with any key and distribute access through social processes:

```python
# Domain owner encrypts with arbitrary key
ciphertext = AES(content, arbitrary_key)

# Owner dispenses key through:
# - Payment (Lightning)
# - Trust relationship
# - Challenge completion
# - Any criteria
```

**Properties:**
- Maximum flexibility
- Requires owner online/available
- Pure social contract, no mathematical enforcement

### 9.2 Privacy Models Within Domains

| Model | Protection | Trust Required |
|-------|------------|----------------|
| Location-only | None from domain owner | Trust domain owner |
| Location + ABE | Full (if ABE denies owner) | Trust ABE policy |
| Independent key | Full | No trust needed |

---

## 10. Domain Lifecycle

### 10.1 Creation

1. Choose territory: base_x, base_y, base_z, height
2. Compute Cantor subtree roots (O(2^height) work)
3. Generate STARK proof (binds pubkey to R)
4. Publish kind 33333 event
5. Optionally publish domain policy

### 10.2 Verification

Any verifier can:
1. Fetch domain event
2. Verify STARK proof (O(log² N) work)
3. Check policy validity
4. Confirm domain owner's authority

### 10.3 Recognition vs. Discovery

**Discovery (permanent):**
- STARK proof attests to computation of R
- Mathematical fact, cannot be revoked
- Multiple parties can eventually compute same R

**Recognition (mutable):**
- Network accepts specific pubkey as domain authority
- Can transfer, expire, or be challenged
- Lives in separate event type (future extension)

**Current DECK-0002:** Discovery only. Recognition mechanics are protocol-level social coordination, specified separately.

### 10.4 Multiple Claimants

If multiple valid domain claims exist for overlapping regions:

**Resolution rules:**
1. Smaller domain (higher height) wins within its bounds
2. Larger domain wins outside smaller domain's bounds
3. Equal-size overlap: first valid claim wins

**Note:** This doesn't affect mathematical knowledge — both claimants know their respective roots. It affects protocol-level recognition.

---

## 11. Security Analysis

### 11.1 Security Properties

| Property | Mechanism | Level |
|----------|-----------|-------|
| Correctness | STARK proof | 128-bit |
| Binding | Pubkey in STARK public inputs | 128-bit |
| Hiding | R is private witness | Information-theoretic |
| Succinctness | FRI polynomial commitments | O(log N) proof size |
| Transparency | No trusted setup | Trustless |

### 11.2 Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Fake domain | STARK verification fails |
| Root theft | R never revealed (ZK property) |
| Proof forgery | STARK soundness (128-bit) |
| Proof theft | Pubkey binding prevents reuse |
| Overlapping claims | Priority rules (Section 10.4) |
| Policy tampering | policy_hash verifies integrity |

### 11.3 Trust Assumptions

- **Hash functions:** Poseidon2, SHA256 are collision-resistant
- **STARK soundness:** FRI protocol has proven security
- **Nostr signatures:** Schnorr signatures are secure

---

## 12. Implementation Requirements

### 12.1 Prover Requirements

| Height | Time | Storage |
|--------|------|---------|
| Height 25 | Hours | GB |
| Height 30 | Days | TB |
| Height 35 | Years | PB (disk-based) |

### 12.2 Verifier Requirements

| Requirement | Value |
|-------------|-------|
| CPU | Any modern processor |
| Memory | < 10 MB |
| Time | < 100 ms |
| Storage | None (stateless) |

**Any smartphone can verify any domain.**

---

## 13. Privacy Considerations

### 13.1 Domain Owner Omniscience

**Users must understand:**
- Location encryption is NOT private from domain owner
- Domain owner can decrypt all location-encrypted content in their domain
- Additional encryption layer required for privacy from domain owner

### 13.2 Recommended Disclosure

Domain owners SHOULD disclose their privacy policy:
- Whether they access user content
- What they do with derived information
- Whether ABE is used to limit their own access

### 13.3 Network Privacy

| Concern | Mitigation |
|---------|------------|
| Proof URL fetch leaks IP | Use Tor, VPN, privacy proxy |
| HTTPS host sees queries | proof_hash prevents tampering |
| Nostr relay sees events | Events are public by design |

---

## 14. Protocol Limits

Verifiers SHOULD reject domains exceeding these bounds:

| Parameter | Maximum | Rationale |
|-----------|---------|-----------|
| height | 35 | Prevents infeasible claims |
| proof_size | 200 KB | Prevents DoS |
| policy_size | 64 KB | Prevents DoS |
| URL length | 512 chars | Prevents URL attacks |

---

## 15. Future Extensions

### 15.1 Recognition Events

Separate event type for mutable social recognition:
- Transfer of authority
- Expiration tracking
- Challenge/response mechanics

### 15.2 Batch Proofs

Prove multiple domains in one proof for efficiency.

### 15.3 Recursive Proofs

For very large domains, recursive STARKs reduce verifier time.

### 15.4 Domain Diplomacy

Protocol for domain-to-domain coordination:
- Shared secrets between domains
- Treaties and agreements
- Cross-domain citizenship

---

## 16. Summary

**Domains provide:**

| Layer | Capability |
|-------|------------|
| Mathematical | Proof of work, hierarchical knowledge, CP-ABE |
| Protocol | Action control, content sovereignty |
| Social | Interactive access, arbitrary gating |

**The core principle:**

> Work earns rights. Mathematics proves work. Protocol enforces rights.

**The key insight:**

> Knowledge of R is permanent and irrevocable. "Ownership" is social recognition layered on top of mathematical discovery.

---

**XOR 👾**
