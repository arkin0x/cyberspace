# DECK-0002: STARK Proofs for Domain Claims (Revised)

**Status:** Draft
**Version:** 2.0
**Created:** 2026-03-17
**Author:** XOR

---

## Abstract

This DECK specifies a **STARK-based proof system** for territorial claims (domains) in Cyberspace v2. The protocol enables:

- **Asymmetric verification:** Prover does O(N) work; verifier does O(log² N) work
- **Zero-knowledge:** The Cantor region number R is never revealed
- **Succinct proofs:** ~40-60 KB regardless of domain size
- **Permissionless verification:** Any consumer device can verify any domain

---

## 1. Overview

### 1.1 Problem Statement

A territorial domain requires proving computation of Cantor subtree roots for:
1. A spatial region [base, base + 2^height) — the territory
2. A temporal range [block_height, expires_at) — the duration

The challenge:
1. **Prover** must do substantial work (O(2^height + duration) operations)
2. **Verifier** cannot feasibly recompute (same work required)
3. **Roots** must never be revealed (prevents counter-claims)

### 1.2 Solution

A **zk-STARK** (Zero-Knowledge Scalable Transparent ARgument of Knowledge) that proves:

> "I correctly computed both the spatial Cantor subtree for region [base, base + 2^height) and the temporal Cantor tree for range [block_height, expires_at), obtaining roots region_root and time_root, without revealing either."

The STARK proof itself serves as the commitment. No separate commitment field is needed.

### 1.3 Key Properties

| Property | Description |
|----------|-------------|
| **Correctness** | Proof attests to correct Cantor tree computation |
| **Binding** | STARK binds public inputs to hidden root R |
| **Hiding** | R is never revealed under any circumstance |
| **Succinctness** | Proof size O(log N) regardless of tree size |
| **Asymmetry** | Prover O(N), verifier O(log² N) |

---

## 2. Circuit Computation

The STARK circuit performs the following computation steps:

### 2.1 Compute Spatial Axis Roots (The 3-Axis Structure)

To comply with the CYBERSPACE v2 specification, the spatial component is no longer calculated as a volumetric tree. Instead, the circuit computes three independent Cantor subtree roots—one for each axis (X, Y, Z)—and then combines them.

**Inputs:**
- base_x, base_y, base_z (The starting coordinate for each axis)
- height (The power-of-two size of the cubic region, i.e., side length = $2^{height}$)

**Steps:**

1. **Compute X-Axis Root (root_x):**
   - Generate leaf range: values_x = [base_x + i for i in 0..2^height]
   - Compute binary Cantor tree bottom-up:
   ```python
def axis_subtree_root(base, height):
    values = list(range(base, base + (1 << height)))
    for _ in range(height):
        values = [cantor_pair(values[i], values[i + 1]) for i in range(0, len(values), 2)]
    return values[0]
root_x = axis_subtree_root(base_x, height)
```

2. **Compute Y-Axis Root (root_y):**
   - root_y = axis_subtree_root(base_y, height)

3. **Compute Z-Axis Root (root_z):**
   - root_z = axis_subtree_root(base_z, height)

### 2.2 Compute Combined Domain Identifier (R)

Once the independent axis roots are established, they are combined using the nested pairing function defined in the protocol.

- region_n = cantor_pair(cantor_pair(root_x, root_y), root_z)
- This value is the secret Cantor number R.

### 2.3 Compute Temporal Root (optional but recommended for claims)

The temporal axis (block height range) is computed as a separate tree to satisfy the validity window of the claim. This is distinct from the hop movement freshness logic.

**Inputs:**
- block_height (Start block)
- expires_at (End block)

**Steps:**
- duration = expires_at - block_height
- time_height = ceil(log2(duration))
- Leaves: list(range(block_height, block_height + duration))
- Tree: Compute binary Cantor tree bottom-up:
```python
time_root = axis_subtree_root(block_height, time_height)
```

### 2.4 Final Domain Claim & Commitment

Since the Cantor number R (region_n) must never be revealed, the circuit does not output it directly. Instead, it outputs a cryptographic commitment that binds the claimant to the computed R.

**Constraint:**
The circuit enforces the following equality as its final public output check:
$$ \text{Poseidon2}(\text{region_n}, \text{time_root}, \text{claimant_pubkey}) \stackrel{?}{=} \text{Public_Commitment} $$

This allows the verifier to confirm that the prover knows the correct spatial and temporal parameters resulting in a specific R, without ever learning R itself.

## 3. Public Inputs

- base_x, base_y, base_z (Public territory coordinates)
- height (Public territory size)
- block_height, expires_at (Public time window)
- claimant_pubkey (Identity of the claimant)
- Public_Commitment (The hash of the secret domain ID on-chain)

## 4. Summary of Key Changes

| Change | Why |
|--------|-----|
| **3-axis structure** | Aligns with CYBERSPACE v2 spec's 3-axis Cantor pairing |
| **Axis roots first** | Prevents volumetric tree computation (confidentiality) |
| **Commitment output** | Ensures R is never revealed |
| **Temporal optional** | Supports both fresh hop movement and claim-based domains |

**Security implications:**
- The circuit still proves correct computation without revealing R
- The commitment binds the claim to a specific R value
- Verification remains O(log² N) with 128-bit security

---

## 5. Domain Event Structure

```json
{
  "kind": 33333,
  "content": "",
  "tags": [
    ["d", "<full domain identifier as 16 hex chars>"],
    ["h", "<hex prefix of domain identifier (first 8 chars)>"],
    ["base_x", "<base X coordinate>"],
    ["base_y", "<base Y coordinate>"],
    ["base_z", "<base Z coordinate>"],
    ["height", "<Cantor tree height>"],
    ["block_height", "<Bitcoin block at claim time>"],
    ["expires_at", "<expiration block height>"],
    ["proof_url", "<HTTPS URL of STARK proof file>"],
    ["proof_hash", "<SHA256 of proof file>"]
  ],
  "pubkey": "<claimant's Nostr pubkey>",
  "created_at": <Unix timestamp>,
  "id": "<event ID>",
  "sig": "<Nostr signature>"
}
```

**NIP-33 Compliance:** Kind 33333 is in the parameterized replaceable event range (30000-39999). The `d` tag is required and must be unique per domain. To update a domain (renewal, new proof), publish a new event with the same `d` tag — relays will replace the old event.

---

## 6. Verification Protocol

### 6.1 Fetch and Validate

```
1. Fetch domain event from Nostr relay

2. Extract tags:
   - d (full domain identifier)
   - h (prefix, must match first 8 chars of d)
   - base_x, base_y, base_z, height
   - block_height, expires_at
   - proof_url, proof_hash

3. Validate prefix consistency:
   ASSERT d[0:8] == h

4. Fetch proof from HTTPS:
   proof = https_get(proof_url)
   
5. Verify proof integrity:
   ASSERT SHA256(proof) == proof_hash

6. Parse and verify STARK proof:
   public_inputs = {
       base_x, base_y, base_z, height,
       block_height, expires_at,
       claimant_pubkey: event.pubkey,
       Public_Commitment: d
   }
   result, output_id = verify_stark(proof, public_inputs)
   ASSERT result == true
   ASSERT output_id == d

7. Verify temporal validity:
   current_block = get_bitcoin_block_height()
   ASSERT current_block < expires_at
```

**Critical:** Step 6 verifies that the STARK proof was generated with the claimant's pubkey as a public input. This prevents proof theft — a proof generated by Alice cannot be reused by Bob.

### 6.2 Verification Complexity

| Height | Territory Volume | Verifier Operations | Verifier Time |
|--------|------------------|---------------------|---------------|
| Height 10 | 2^30 ≈ 1B coords | ~900 ops | ~8 ms |
| Height 15 | 2^45 ≈ 35T coords | ~2,025 ops | ~20 ms |
| Height 20 | 2^60 ≈ 1e18 coords | ~3,600 ops | ~35 ms |

---

## 7. Domain Lifecycle

### 7.1 Creation

As specified in Section 5.1: compute both Cantor trees, generate STARK proof, publish Nostr event.

### 7.2 Renewal

To extend a domain before expiration:

1. **Generate new proof** with updated `expires_at`:
   - Same `base_x, base_y, base_z, height`
   - New `block_height` (current block)
   - New `expires_at` (extended expiration)
   - Recompute temporal tree (spatial tree can be cached)

2. **Publish replacement event** with same `d` tag:
   - Same pubkey (required — proof is bound to identity)
   - Same `d` tag → relays replace old event
   - New `block_height`, `expires_at`, `proof_url`, `proof_hash`

**Note:** Renewal requires fresh work proportional to the new duration. The spatial proof can be reused (cached region_n), but the temporal proof must be recomputed.

### 7.3 Expiration

When `current_block >= expires_at`:
- The domain is considered **expired**
- No longer valid for verification
- Cannot be renewed (must create new domain claim)

### 7.4 Revocation (Optional)

To explicitly revoke a domain before expiration:

1. Publish a **deletion event** (kind 5 per NIP-09):
   ```json
   {
     "kind": 5,
     "tags": [["e", "<domain_event_id>"]],
     "content": "Domain revoked"
   }
   ```

2. Relays that support NIP-09 will delete the domain event

**Note:** Revocation is optional and relay-dependent. An expired domain is implicitly invalid regardless of revocation.

### 7.5 Transfer

To transfer a domain to a new owner:

1. **Current owner** publishes a transfer event (kind 33333 with special marker):
   ```json
   {
     "kind": 33333,
     "tags": [
       ["d", "<domain_identifier>"],
       ["transfer_to", "<new_owner_pubkey>"],
       ...
     ]
   }
   ```

2. **New owner** must generate a fresh STARK proof with their pubkey:
   - The proof is bound to the claimant's pubkey
   - Transferring requires the new owner to recompute proofs
   - This is intentional — prevents passive domain hoarding

**Key insight:** Domain ownership is defined by the STARK proof's pubkey binding. A "transfer" is really a new claim by the new owner on the same territory.

---

## 8. Proof Hosting

### 8.1 Standard HTTPS Hosting

```
proof_url = "https://{host}/proofs/{proof_hash}.bin"
```

**Requirements:**
- Host must be publicly accessible
- proof_hash in URL provides integrity verification
- CDN recommended for availability

### 8.2 Integrity Verification

Always verify `SHA256(proof) == proof_hash` before accepting any proof.

The proof_hash in the Nostr event ensures:
- Proof cannot be tampered with
- Hosting provider cannot substitute fake proofs
- Content integrity is cryptographically guaranteed

---

## 9. Security Analysis

### 9.1 Security Properties

| Property | Mechanism | Security Level |
|----------|-----------|----------------|
| Correctness | STARK proof of both Cantor trees | 128-bit |
| Binding | STARK binds public inputs to hidden roots | 128-bit |
| Hiding | region_n and time_root never leave prover | Information-theoretic |
| Succinctness | FRI polynomial commitments | O(log N) proof size |
| Transparency | No trusted setup | Trustless |

### 9.2 Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Fake domain | STARK verification fails |
| Root theft | Both roots never revealed (ZK property) |
| Proof forgery | STARK soundness (128-bit) |
| Precomputation | Temporal proof binds to block_height |
| Overlapping domains | Priority rules (see Section 10.2.1) |

### 9.3 Trust Assumptions

- **Hash functions:** Poseidon2, SHA256 are collision-resistant
- **STARK soundness:** FRI protocol has proven security
- **Random oracle model:** Used for Fiat-Shamir transformation

---

## 10. Implementation Requirements

### 10.1 Prover Requirements

| Domain Height | Territory Size | Duration (blocks) | Time | Storage |
|---------------|----------------|-------------------|------|---------|
| Height 35 | 4m | 1,000 | 2-5 days | 1-2 TB |
| Height 35 | 4m | 100,000 | Weeks | TB |
| Height 40 | 128m | 10,000 | ~month | Petabyte-scale |
| Height 50 | City | 1,000 | Years | Infeasible |

**Note:** Work scales with BOTH territory size (2^height) AND duration (expires_at - block_height).

### 10.2 Verifier Requirements

| Requirement | Value |
|-------------|-------|
| CPU | Any modern processor |
| Memory | < 10 MB |
| Storage | None (stateless) |
| Time | < 50 ms |

**Any smartphone can verify any domain.**

### 10.3 Recommended Stack

```
Field Arithmetic:    goldilocks (Rust crate)
STARK Prover:        winterfell (STARKWare) or custom
Hash Functions:      poseidon2 (leaves), sha2 (integrity)
HTTPS Client:         https-api or rust-https
Nostr Client:        nostr-sdk
```

---

## 11. Protocol Limits

Verifiers SHOULD reject domains that exceed these bounds:

| Parameter | Maximum | Rationale |
|-----------|---------|-----------|
| `height` | 30 | Prevents computationally infeasible claims |
| `duration` (`expires_at - block_height`) | 1,000,000 blocks (~19 years) | Prevents excessive temporal work |
| `proof_size` | 200 KB | Prevents DoS via oversized proofs |
| `proof_url` length | 512 chars | Prevents URL-based attacks |

**Note:** These are RECOMMENDED limits. Individual verifiers may choose stricter or looser bounds.

---

## 12. Privacy Considerations

| Concern | Mitigation |
|---------|------------|
| Proof URL fetch leaks IP | Use Tor, VPN, or privacy proxy |
| HTTPS host sees queries | proof_hash prevents tampering |
| Nostr relay sees events | Events are public by design |
| Domain location revealed | Only coordinates, not contents |

---

## 13. Test Vectors

### 13.1 Minimal Example (Height 2)

```
pubkey = "0000000000000000000000000000000000000000000000000000000000000001"
base_x = 0
base_y = 0
base_z = 0
height = 2  // 4x4x4 cube = 64 coordinates
block_height = 800000
expires_at = 800032  // 32 blocks duration

// Expected output (placeholder - requires implementation):
// domain_identifier = Poseidon2(pubkey, region_root, time_root)
// region_root computed from 64 spatial leaves
// time_root computed from 32 temporal leaves
```

### 13.2 Golden Vectors (Future Work)

Production implementations MUST provide golden vectors including:
- All 64 spatial leaf values for Height 2
- All 32 temporal leaf values
- Intermediate tree values (region_n, time_root)
- Final domain_identifier
- Serialized proof bytes

**Status:** Golden vectors will be provided in a supplementary file once the reference implementation is complete.

---

## 14. Future Extensions

### 14.1 Batch Proofs

Prove multiple non-overlapping domains in one proof:

```
BatchProof {
    domains: [(base, height, block_height, expires_at), ...],
    proof: STARKProof,
    commitments: [Public_Commitment, ...]
}
```

### 14.2 Recursive Proofs

For very large domains, use recursive STARK proofs to reduce verifier time:

```
RecursiveProof {
    base_proof: STARKProof,
    recursion_proof: STARKProof,
    final_commitment: Public_Commitment
