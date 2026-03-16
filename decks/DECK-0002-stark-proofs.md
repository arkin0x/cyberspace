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

## 3. How STARK Proofs Work

This section explains STARK proofs for readers new to zero-knowledge proof systems.

### 3.1 What is a STARK?

A **STARK** (Scalable Transparent ARgument of Knowledge) is a cryptographic proof that allows someone to prove they executed a computation correctly, without revealing the internal values used in that computation.

**Key insight:** The prover does the full computation, but the verifier only checks a small sample of the work.

### 3.2 The STARK Circuit

The "circuit" is a description of the computation we want to prove. Think of it like a program that the prover runs, and the STARK proof is a certificate that the program was executed correctly.

**In our case, the circuit computes:**

1. **Spatial Cantor tree:** Hash all coordinates in the claimed territory, pair them up the tree
2. **Temporal Cantor tree:** Hash all block numbers in the duration, pair them up the tree
3. **Output:** Combine both roots into a domain identifier

### 3.3 Why Poseidon2 Inside the Circuit?

**The problem:** Hash functions like SHA256 are designed to be fast on CPUs, but they're slow inside STARK circuits.

**Why?** STARK circuits express computations as polynomial equations over a finite field. SHA256 involves bitwise operations (XOR, rotate, etc.) that require hundreds of constraints per round.

**The solution:** Poseidon2 is designed specifically for STARK circuits. It uses only field arithmetic (addition, multiplication) which maps directly to polynomial constraints.

| Hash Function | CPU Performance | STARK Circuit Constraints |
|---------------|-----------------|---------------------------|
| SHA256 | Very fast | ~25,000 constraints per hash |
| Poseidon2 | Slower on CPU | ~300 constraints per hash |

**That's ~80x fewer constraints** inside the circuit.

### 3.4 Inside vs Outside the Circuit

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE STARK PROOF                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PUBLIC INPUTS (known to everyone):                            │
│   • base_x, base_y, base_z                                      │
│   • height                                                      │
│   • block_height, expires_at                                    │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   INSIDE THE CIRCUIT (proven but not revealed):                 │
│                                                                 │
│   Step 1: Compute leaf values                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ FOR i in 0..2^height:                                   │   │
│   │     x = base_x + i                                       │   │
│   │     y = base_y + i                                       │   │
│   │     z = base_z + i                                       │   │
│   │     leaf[i] = Poseidon2(x, y, z)  ← STARK-FRIENDLY HASH  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Step 2: Build Cantor tree (pair leaves up to root)            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ FOR level in height..1:                                  │   │
│   │     FOR i in 0..2^(level-1):                             │   │
│   │         parent[i] = cantor_pair(left, right)              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Step 3: Output region_root (HIDDEN!)                          │
│                                                                 │
│   Step 4: Repeat for temporal tree → time_root (HIDDEN!)        │
│                                                                 │
│   Step 5: domain_identifier = Poseidon2(region_root, time_root) │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   OUTPUT (revealed):                                            │
│   • domain_identifier                                           │
│   • The STARK proof itself                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

OUTSIDE THE CIRCUIT (after proof is generated):

   • Prover uploads STARK proof to HTTPS
   • SHA256(proof) → proof_hash for integrity check
   • proof_hash goes in the Nostr event
```

### 3.5 What the Verifier Sees

The verifier receives:

1. **Public inputs:** base_x, base_y, base_z, height, block_height, expires_at
2. **domain_identifier:** The output of the circuit
3. **The STARK proof:** A ~50 KB bundle of cryptographic commitments

The verifier **never sees:**
- region_root (the spatial Cantor root)
- time_root (the temporal Cantor root)
- Any intermediate values in the trees

### 3.6 Concrete Example: Height 4 Domain

Let's trace through a small domain claim:

**Inputs:**
```
base_x = 1000
base_y = 2000
base_z = 3000
height = 4 (16 leaves)
block_height = 800000
expires_at = 800016 (duration = 16 blocks)
```

**Step 1: Compute spatial leaves (inside circuit)**
```
leaf[0]  = Poseidon2(1000, 2000, 3000)
leaf[1]  = Poseidon2(1001, 2001, 3001)
leaf[2]  = Poseidon2(1002, 2002, 3002)
...
leaf[15] = Poseidon2(1015, 2015, 3015)
```

**Step 2: Build spatial Cantor tree**
```
Level 4 (leaves):     [leaf[0], leaf[1], ..., leaf[15]]  (16 values)
Level 3:              [cantor(0,1), cantor(2,3), ..., cantor(14,15)]  (8 values)
Level 2:              [cantor(0,1), cantor(2,3), cantor(4,5), cantor(6,7)]  (4 values)
Level 1:              [cantor(0,1), cantor(2,3)]  (2 values)
Level 0 (root):       region_root = cantor(0,1)  (1 value)
```

**Step 3: Compute temporal leaves (inside circuit)**
```
time_leaf[0]  = Poseidon2(800000)
time_leaf[1]  = Poseidon2(800001)
...
time_leaf[15] = Poseidon2(800015)
```

**Step 4: Build temporal Cantor tree** (same pairing process)
```
time_root = cantor_pair up the tree
```

**Step 5: Output domain identifier**
```
domain_identifier = Poseidon2(region_root, time_root)
```

**Step 6: Generate STARK proof**
- The prover has computed all these values
- The STARK proof attests that this computation was done correctly
- The proof is ~40-60 KB (regardless of tree size!)

**What gets published:**
```
Nostr Event:
  tags: [
    ["h", "a1b2c3d4"],
    ["base_x", "1000"],
    ["base_y", "2000"],
    ["base_z", "3000"],
    ["height", "4"],
    ["block_height", "800000"],
    ["expires_at", "800016"],
    ["proof_url", "https://proofs.example.com/abc123.bin"],
    ["proof_hash", "def456..."]
  ]
```

**What the verifier does:**
1. Fetches the proof from proof_url
2. Checks SHA256(proof) == proof_hash
3. Runs STARK verification (~10ms for Height 4)
4. If verification passes, the domain is valid

### 3.7 Why Two Hash Functions?

| Hash | Where Used | Why |
|------|------------|-----|
| **Poseidon2** | Inside STARK circuit | Designed for ZK proofs. Uses field arithmetic that's efficient in circuits. |
| **SHA256** | Outside circuit (proof_hash) | Standard, widely available, consistent with cyberspace protocol. |

**Key insight:** We're not replacing SHA256 in the cyberspace protocol. Poseidon2 is only used inside the STARK circuit because it's 100x more efficient there. The output (domain_identifier) and integrity check (proof_hash) still use standard hashes.

---

## 4. STARK Proof Structure

### 4.1 Public Inputs

```
public_inputs = {
    base_x:  u64,    // Base X coordinate
    base_y:  u64,    // Base Y coordinate  
    base_z:  u64,    // Base Z coordinate
    height:  u32,    // Cantor tree height (territory size)
    block_height: u64,  // Current Bitcoin block
    expires_at: u64,    // Expiration block height
}
```

### 4.2 Private Witness

```
witness = {
    region_root: [u8; 32],  // Spatial Cantor subtree root (NEVER revealed)
    time_root: [u8; 32],    // Temporal Cantor tree root (NEVER revealed)
}
```

### 4.3 STARK Circuit

The circuit proves:

```
1. Compute spatial Cantor tree (territory proof):
   FOR i in 0..2^height:
       x = base_x + i
       y = base_y + i
       z = base_z + i
       leaf[i] = Poseidon2(x, y, z)
   
   FOR level in height..1:
       FOR i in 0..2^(level-1):
           tree[level-1][i] = cantor_pair(tree[level][2*i], tree[level][2*i+1])
   
   region_root = tree[0]

2. Compute temporal Cantor tree (time proof):
   duration = expires_at - block_height
   tree_height = ceil(log2(duration))
   
   FOR i in 0..2^tree_height:
       leaf[i] = Poseidon2(block_height + i)
   
   FOR level in tree_height..1:
       FOR i in 0..2^(level-1):
           tree[level-1][i] = cantor_pair(tree[level][2*i], tree[level][2*i+1])
   
   time_root = tree[0]

3. Output domain identifier:
   OUTPUT Poseidon2(region_root || time_root) as domain_identifier
```

The STARK proof attests that both trees were computed correctly, without revealing either `region_root` or `time_root`.

### 4.4 Proof Output

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

### 4.5 Proof Size Estimation

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

## 5. Domain Protocol

### 5.1 Domain Creation

**Input:**
- `base_x, base_y, base_z`: Base coordinates
- `height`: Cantor tree height (territory size)
- `block_height`: Current Bitcoin block
- `expires_at`: Expiration block

**Process:**

```
1. Compute spatial Cantor subtree (territory proof):
   - Initialize tree with 2^height leaves
   - For each leaf: leaf[i] = Poseidon2(base_x + i, base_y + i, base_z + i)
   - Build Cantor tree bottom-up
   - region_root = tree[0]

2. Compute temporal Cantor tree (time proof):
   - duration = expires_at - block_height
   - Initialize tree with 2^ceil(log2(duration)) leaves
   - For each leaf: leaf[i] = Poseidon2(block_height + i)
   - Build Cantor tree bottom-up
   - time_root = tree[0]

3. Generate STARK proof:
   - public_inputs = {base_x, base_y, base_z, height, block_height, expires_at}
   - witness = {region_root, time_root}
   - proof = generate_stark(circuit, public_inputs, witness)

4. Publish domain:
   - Upload proof to HTTPS host
   - Publish Nostr event (kind 33333)
```

**Work Scaling:**
- Territory size scales with `2^height` (spatial leaves)
- Duration scales with `expires_at - block_height` (temporal leaves)
- Total work = O(2^height + duration)

### 5.2 Domain Event Structure

```json
{
  "kind": 33333,
  "content": "",
  "tags": [
    ["h", "<hex prefix of domain identifier>"],
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

### 5.3 Tag Definitions

| Tag | Required | Description |
|-----|----------|-------------|
| `h` | Yes | Hex prefix of domain identifier (for prefix queries) |
| `base_x/y/z` | Yes | Base coordinates of claimed region |
| `height` | Yes | Cantor tree height (determines claim size) |
| `block_height` | Yes | Bitcoin block when claim was made |
| `expires_at` | Yes | Block height when claim expires |
| `proof_url` | Yes | HTTPS URL of the STARK proof file |
| `proof_hash` | Yes | SHA256 hash of proof file for integrity |

**Note:** The `h` tag enables efficient prefix-based queries. It is derived from the STARK proof's output (domain_identifier, derived from region_root || time_root).

---

## 6. Verification Protocol

### 6.1 Fetch and Validate

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
   public_inputs = {base_x, base_y, base_z, height, block_height, expires_at}
   result = verify_stark(proof, public_inputs)
   ASSERT result == true

6. Verify temporal validity:
   current_block = get_bitcoin_block_height()
   ASSERT current_block < expires_at
```

### 6.2 Verification Complexity

| Claim Height | Tree Size | Verifier Operations | Verifier Time |
|--------------|-----------|---------------------|---------------|
| Height 35 | 2^35 | ~1,225 ops | ~10 ms |
| Height 40 | 2^40 | ~1,600 ops | ~15 ms |
| Height 45 | 2^45 | ~2,025 ops | ~20 ms |
| Height 50 | 2^50 | ~2,500 ops | ~25 ms |
| Height 55 | 2^55 | ~3,025 ops | ~30 ms |

**Any domain can be verified on a phone in under 50 milliseconds.**

---

## 7. Ownership Verification

### 7.1 Implicit Ownership

The STARK proof itself establishes ownership. Only the prover who computed the Cantor trees knows `region_root` and `time_root`, and generating a valid proof requires both. The proof cryptographically binds the claimant to the domain.

### 7.2 Ownership Proofs (Optional)

For scenarios requiring explicit proof of ongoing ownership (transfers, disputes), the claimant generates a new STARK proof:

```
1. Claimant recomputes Cantor trees (or loads cached roots)
2. Generates fresh STARK proof with same public inputs
3. Publishes new proof, establishing continued ownership
```

This proves the claimant still has access to both roots without ever revealing them.

### 7.3 Key Insight

The STARK proof replaces traditional commitment schemes:

| Traditional | STARK-Based |
|-------------|-------------|
| Commit to R via hash | R hidden inside STARK proof |
| Reveal R to prove ownership | Generate new proof to prove ownership |
| Commitment is public | No commitment needed (ZK property) |

**The STARK proof IS the commitment.**

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
|----------|-----------|-----------------|
| Correctness | STARK proof of both Cantor trees | 128-bit |
| Binding | STARK binds public inputs to hidden roots | 128-bit |
| Hiding | region_root and time_root never leave prover | Information-theoretic |
| Succinctness | FRI polynomial commitments | O(log N) proof size |
| Transparency | No trusted setup | Trustless |

### 9.2 Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Fake domain | STARK verification fails |
| Root theft | Both roots never revealed (ZK property) |
| Proof forgery | STARK soundness (128-bit) |
| Precomputation | Temporal proof binds to block_height |
| Overlapping domains | Social resolution (layer 2) |

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

## 11. Protocol Versioning

### 11.1 Version Field

```
proof.version = 1  // Initial STARK protocol
```

Future versions may include:
- Optimized polynomial commitments
- Different hash functions
- Batch proofs for multiple domains
- Recursive proofs

### 11.2 Backward Compatibility

Verifiers MUST:
- Check proof version
- Reject unknown versions
- Support all documented versions

---

## 12. Test Vectors

### 12.1 Minimal Example (Height 4)

```
base_x = 0
base_y = 0
base_z = 0
height = 4

// STARK proof binds to these public inputs
// Root R is hidden in the proof
```

### 12.2 Golden Vectors

Production implementations should include golden vectors for:
- Height 8 (small, fast test)
- Height 12 (medium test)
- Height 16 (integration test)

---

## 13. Future Extensions

### 13.1 Batch Proofs

Prove multiple non-overlapping domains in one proof:

```
BatchProof {
    domains: [(base, height, block_height, expires_at), ...],
    proof: STARKProof
}
```

### 13.2 Recursive Proofs

Wrap STARK proof in a SNARK for constant-size verification:

```
RecursiveProof = SNARK(STARKVerify(proof))
```

Size: ~200-500 bytes (fits easily in Nostr event)

### 13.3 Challenge Protocol

For disputed domains, implement a challenge-response protocol where the claimant must prove ongoing ownership without revealing roots.

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

### C.1 Personal Domain (Height 35)

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

### C.2 City Domain (Height 50)

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
