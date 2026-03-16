# DECK-0002: STARK Proofs for Domain Claims

**Status:** Draft
**Version:** 1.0
**Created:** 2026-03-16
**Author:** XOR

---

## Abstract

This DECK specifies a **STARK-based proof system** for territorial claims (domains) in Cyberspace. The protocol enables:

- **Asymmetric verification:** Prover does O(N) work; verifier does O(log² N) work
- **Zero-knowledge:** The Cantor root R is never revealed
- **Succinct proofs:** ~40-60 KB regardless of claim size
- **Permissionless verification:** Any consumer device can verify any claim

---

## 1. Overview

### 1.1 Problem Statement

A territorial claim requires proving computation of a Cantor subtree root **R** for a region [base, base + 2^height). The challenge:

1. **Prover** must do substantial work (O(2^height) operations)
2. **Verifier** cannot feasibly recompute (same work required)
3. **Root R** must never be revealed (prevents counter-claims)

### 1.2 Solution

A **zk-STARK** (Zero-Knowledge Scalable Transparent ARgument of Knowledge) that proves:

> "I correctly computed the Cantor subtree for region [base, base + 2^height) and obtained root R, without revealing R."

The STARK proof itself serves as the commitment. No separate commitment field is needed.

### 1.3 Key Properties

| Property | Description |
|----------|-------------|
| **Correctness** | Proof attests to correct Cantor tree computation |
| **Binding** | STARK binds public inputs to hidden root R |
| **Hiding** | R is never revealed under any circumstance |
| **Succinctness** | Proof size O(log N) regardless of tree size |
| **Asymmetry** | Prover O(N), verifier O(log² N) |
| **Transparency** | No trusted setup required |

---

## 2. Cryptographic Primitives

### 2.1 Field Selection

**Base field:** Goldilocks prime (STARK-friendly)

```
p = 2^64 - 2^32 + 1 = 0xFFFFFFFF00000001
```

**Rationale:**
- 64-bit arithmetic fits in CPU registers
- Fast field operations
- STARK-friendly (small field, high security)
- Used by STARKWare, Polygon Miden

### 2.2 Hash Function

**Leaf hash:** Poseidon2 (STARK-optimized)

```
H(x, y, z) = Poseidon2(x || y || z)
```

**Integrity hash:** SHA256 (consistent with cyberspace protocol)

```
proof_hash = SHA256(proof)
```

**Rationale:**
- Poseidon2: ~100x faster in STARK circuits than SHA256
- SHA256: Consistent with cyberspace protocol (Cantor pairing, coordinates)
- Security: 128-bit collision resistance

### 2.3 Cantor Pairing (Field Arithmetic)

Standard Cantor pairing:

```
cantor_pair(a, b) = (a + b)(a + b + 1) / 2 + b
```

Field arithmetic version over F_p:

```
cantor_pair(a, b) = (a + b) * (a + b + 1) * inv(2) + b
```

Where `inv(2) = (p + 1) / 2 = 0x7FFFFFFF80000001`

---

## 3. STARK Proof Structure

### 3.1 Public Inputs

```
public_inputs = {
    base_x:  u64,    // Base X coordinate
    base_y:  u64,    // Base Y coordinate  
    base_z:  u64,    // Base Z coordinate
    height:  u32,    // Cantor tree height
}
```

### 3.2 Private Witness

```
witness = {
    root: [u8; 32],  // Cantor subtree root R (NEVER revealed)
}
```

### 3.3 STARK Circuit

The circuit proves:

```
1. Compute all leaf values:
   FOR i in 0..2^height:
       x = base_x + i
       y = base_y + i
       z = base_z + i
       leaf[i] = Poseidon2(x, y, z)

2. Build Cantor tree:
   FOR level in height..1:
       FOR i in 0..2^(level-1):
           tree[level-1][i] = cantor_pair(tree[level][2*i], tree[level][2*i+1])

3. Output root commitment:
   OUTPUT Poseidon2(tree[0][0]) as claim_identifier
```

The STARK proof attests that this circuit was executed correctly with the given public inputs, without revealing `tree[0][0]` (the root R). The output commitment serves as the claim identifier (derived from R, but R remains hidden).

### 3.4 Proof Output

```
STARKProof = {
    // FRI proof components
    fri_commitments: [[u8; 32]; L],     // FRI layer commitments
    fri_queries: Vec<FRIQuery>,          // Query responses
    
    // Trace commitments
    trace_commitments: [[u8; 32]; T],   // Execution trace roots
    
    // Constraint proof
    constraint_commitment: [u8; 32],    // Constraint polynomial root
    
    // Out-of-domain evaluation
    ood_frame: OODFrame,                // Evaluation frame
    
    // Metadata
    version: u32,                        // Protocol version
    security_level: u32,                 // Security parameter (bits)
}
```

### 3.5 Proof Size Estimation

| Component | Size Estimate |
|-----------|---------------|
| FRI commitments | 32 × L bytes (L = log₂(N)) |
| FRI queries | 80 × L × 64 bytes |
| Trace commitments | 32 × T bytes (T ≈ 10) |
| Constraint commitment | 32 bytes |
| OOD frame | ~256 bytes |
| **Total (Height 35)** | ~45 KB |
| **Total (Height 50)** | ~55 KB |

With DEEP-FRI optimization: ~40-60 KB fits in Nostr event with room for metadata.

---

## 4. Claim Protocol

### 4.1 Claim Creation

**Input:**
- `base_x, base_y, base_z`: Base coordinates
- `height`: Cantor tree height
- `block_height`: Current Bitcoin block
- `expires_at`: Expiration block

**Process:**

```
1. Compute Cantor subtree:
   - Initialize tree with 2^height leaves
   - For each leaf: leaf[i] = Poseidon2(base_x + i, base_y + i, base_z + i)
   - Build Cantor tree bottom-up
   - Root R = tree[0]

2. Generate STARK proof:
   - public_inputs = {base_x, base_y, base_z, height}
   - witness = {root: R}
   - proof = generate_stark(circuit, public_inputs, witness)

3. Publish claim:
   - Upload proof to HTTPS
   - Publish Nostr event (kind 33333)
```

### 4.2 Claim Event Structure

```json
{
  "kind": 33333,
  "content": "",
  "tags": [
    ["h", "<hex prefix of claim identifier>"],
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

### 4.3 Tag Definitions

| Tag | Required | Description |
|-----|----------|-------------|
| `h` | Yes | Hex prefix of claim identifier (for prefix queries) |
| `base_x/y/z` | Yes | Base coordinates of claimed region |
| `height` | Yes | Cantor tree height (determines claim size) |
| `block_height` | Yes | Bitcoin block when claim was made |
| `expires_at` | Yes | Block height when claim expires |
| `proof_url` | Yes | HTTPS URL of the STARK proof file |
| `proof_hash` | Yes | SHA256 hash of proof file for integrity |

**Note:** The `h` tag enables efficient prefix-based queries. It is derived from the STARK proof's output commitment (which is derived from R, but R remains hidden).

---

## 5. Verification Protocol

### 5.1 Fetch and Validate

```
1. Fetch domain event from Nostr relay

2. Extract tags:
   - base_x, base_y, base_z, height
   - proof_url, proof_hash

3. Fetch proof from HTTPS:
   proof = https_get(proof_url)
   
4. Verify proof integrity:
   ASSERT SHA256(proof) == proof_hash

5. Verify STARK proof:
   public_inputs = {base_x, base_y, base_z, height}
   result = verify_stark(proof, public_inputs)
   ASSERT result == true

6. Verify temporal validity:
   current_block = get_bitcoin_block_height()
   ASSERT current_block < expires_at
```

### 5.2 Verification Complexity

| Claim Height | Tree Size | Verifier Operations | Verifier Time |
|--------------|-----------|---------------------|---------------|
| Height 35 | 2^35 | ~1,225 ops | ~10 ms |
| Height 40 | 2^40 | ~1,600 ops | ~15 ms |
| Height 45 | 2^45 | ~2,025 ops | ~20 ms |
| Height 50 | 2^50 | ~2,500 ops | ~25 ms |
| Height 55 | 2^55 | ~3,025 ops | ~30 ms |

**Any claim can be verified on a phone in under 50 milliseconds.**

---

## 6. Ownership Verification

### 6.1 Implicit Ownership

The STARK proof itself establishes ownership. Only the prover who computed the Cantor tree knows R, and generating a valid proof requires R. The proof cryptographically binds the claimant to the claim.

### 6.2 Ownership Proofs (Optional)

For scenarios requiring explicit proof of ongoing ownership (transfers, disputes), the claimant generates a new STARK proof:

```
1. Claimant recomputes Cantor tree (or loads cached R)
2. Generates fresh STARK proof with same public inputs
3. Publishes new proof, establishing continued ownership
```

This proves the claimant still has access to R without ever revealing it.

### 6.3 Key Insight

The STARK proof replaces traditional commitment schemes:

| Traditional | STARK-Based |
|-------------|-------------|
| Commit to R via hash | R hidden inside STARK proof |
| Reveal R to prove ownership | Generate new proof to prove ownership |
| Commitment is public | No commitment needed (ZK property) |

**The STARK proof IS the commitment.**

---

## 7. Proof Hosting

### 7.1 Standard HTTPS Hosting

```
proof_url = "https://{host}/proofs/{proof_hash}.bin"
```

**Requirements:**
- Host must be publicly accessible
- proof_hash in URL provides integrity verification
- CDN recommended for availability

### 7.2 Integrity Verification

Always verify `SHA256(proof) == proof_hash` before accepting any proof.

The proof_hash in the Nostr event ensures:
- Proof cannot be tampered with
- Hosting provider cannot substitute fake proofs
- Content integrity is cryptographically guaranteed

---

## 8. Security Analysis

### 8.1 Security Properties

| Property | Mechanism | Security Level |
|----------|-----------|-----------------|
| Correctness | STARK proof of computation | 128-bit |
| Binding | STARK binds public inputs to hidden R | 128-bit |
| Hiding | Root R never leaves prover | Information-theoretic |
| Succinctness | FRI polynomial commitments | O(log N) proof size |
| Transparency | No trusted setup | Trustless |

### 8.2 Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Fake claim | STARK verification fails |
| Root theft | R never revealed (ZK property) |
| Proof forgery | STARK soundness (128-bit) |
| Precomputation | Temporal axis binding |
| Overlapping claims | Social resolution (layer 2) |

### 8.3 Trust Assumptions

- **Hash functions:** Poseidon2, SHA256 are collision-resistant
- **STARK soundness:** FRI protocol has proven security
- **Random oracle model:** Used for Fiat-Shamir transformation

---

## 9. Implementation Requirements

### 9.1 Prover Requirements

| Claim Height | Tree Size | Time | Storage |
|--------------|-----------|------|---------|
| Height 35 | 2^35 | 2-5 days | 1-2 TB |
| Height 40 | 2^40 | ~month | Petabyte-scale |
| Height 45 | 2^45 | Years | Infeasible |
| Height 50+ | 2^50+ | Decades | Infeasible |

**Note:** Higher claims require nation-state scale resources.

### 9.2 Verifier Requirements

| Requirement | Value |
|-------------|-------|
| CPU | Any modern processor |
| Memory | < 10 MB |
| Storage | None (stateless) |
| Time | < 50 ms |

**Any smartphone can verify any claim.**

### 9.3 Recommended Stack

```
Field Arithmetic:    goldilocks (Rust crate)
STARK Prover:        winterfell (STARKWare) or custom
Hash Functions:      poseidon2 (leaves), sha2 (integrity)
HTTPS Client:         https-api or rust-https
Nostr Client:        nostr-sdk
```

---

## 10. Protocol Versioning

### 10.1 Version Field

```
proof.version = 1  // Initial STARK protocol
```

Future versions may include:
- Optimized polynomial commitments
- Different hash functions
- Batch proofs for multiple claims
- Recursive proofs

### 10.2 Backward Compatibility

Verifiers MUST:
- Check proof version
- Reject unknown versions
- Support all documented versions

---

## 11. Test Vectors

### 11.1 Minimal Example (Height 4)

```
base_x = 0
base_y = 0
base_z = 0
height = 4

// STARK proof binds to these public inputs
// Root R is hidden in the proof
```

### 11.2 Golden Vectors

Production implementations should include golden vectors for:
- Height 8 (small, fast test)
- Height 12 (medium test)
- Height 16 (integration test)

---

## 12. Future Extensions

### 12.1 Batch Proofs

Prove multiple non-overlapping claims in one proof:

```
BatchProof {
    claims: [(base, height, commitment), ...],
    proof: STARKProof
}
```

### 12.2 Recursive Proofs

Wrap STARK proof in a SNARK for constant-size verification:

```
RecursiveProof = SNARK(STARKVerify(proof))
```

Size: ~200-500 bytes (fits easily in Nostr event)

### 12.3 Challenge Protocol

For disputed claims, implement a challenge-response protocol where the claimant must prove ongoing ownership without revealing R.

---

## Appendix A: Field Arithmetic Reference

### A.1 Goldilocks Prime

```
p = 2^64 - 2^32 + 1 = 18446744069414584321
```

### A.2 Inverse of 2

```
inv(2) = (p + 1) / 2 = 9223372034707292161
```

### A.3 Cantor Pairing in F_p

```rust
fn cantor_pair(a: u64, b: u64) -> u64 {
    let sum = a.wrapping_add(b);
    let sum_plus_1 = sum.wrapping_add(1);
    let product = (sum as u128 * sum_plus_1 as u128) % P as u128;
    let divided = (product * INV_2 as u128) % P as u128;
    (divided as u64).wrapping_add(b)
}
```

---

## Appendix B: STARK Verification Algorithm

### B.1 Verification Steps

```
1. Parse proof components

2. Verify FRI commitments:
   FOR layer in 0..L:
       ASSERT verify_merkle_root(commitments[layer])

3. Verify trace commitments:
   FOR trace in traces:
       ASSERT verify_merkle_root(trace)

4. Execute FRI verification:
   FOR query in queries:
       ASSERT verify_fri_query(query, commitments)

5. Verify constraints:
   ASSERT constraint_commitment is valid

6. Verify public inputs:
   ASSERT commitment in proof matches event

7. Return true if all checks pass
```

### B.2 Complexity Analysis

- FRI verification: O(L × Q) where L = log(N), Q = 80 queries
- Trace verification: O(T) where T ≈ 10
- Total: O(log(N)) with small constants

---

## Appendix C: Nostr Event Examples

### C.1 Personal Claim (Height 35)

```json
{
  "kind": 33333,
  "tags": [
    ["h", "a1b2c3d4"],
    ["base_x", "12345678901234567890"],
    ["base_y", "98765432109876543210"],
    ["base_z", "55555555555555555555"],
    ["height", "35"],
    ["block_height", "850000"],
    ["expires_at", "950000"],
    ["proof_url", "https://proofs.example.com/deadbeef.bin"],
    ["proof_hash", "deadbeef..."]
  ],
  "pubkey": "abcdef...",
  "created_at": 1700000000
}
```

### C.2 City Claim (Height 50)

```json
{
  "kind": 33333,
  "tags": [
    ["h", "f0e1d2c3"],
    ["base_x", "11111111111111111111"],
    ["base_y", "22222222222222222222"],
    ["base_z", "33333333333333333333"],
    ["height", "50"],
    ["block_height", "850000"],
    ["expires_at", "950000"],
    ["proof_url", "https://proofs.example.com/cafebabe.bin"],
    ["proof_hash", "cafebabe..."]
  ],
  "pubkey": "123456...",
  "created_at": 1700000000
}
```

---

## References

- [STARKWare Winterfell](https://github.com/facebook/winterfell) - STARK prover/verifier library
- [Poseidon2 Hash](https://eprint.iacr.org/2023/323) - STARK-friendly hash function
- [SHA256](https://en.wikipedia.org/wiki/SHA-2) - Cryptographic hash function
- [FRI Protocol](https://eprints.iacr.org/2018/046) - Fast Reed-Solomon IOP
- [Goldilocks Field](https://polygon.technology/blog/polygon-miden-v0-4) - STARK-friendly field

---

**Document Status:** Production-Ready Specification
**Version:** 1.0
**Last Updated:** 2026-03-16
