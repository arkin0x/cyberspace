> Working notes (2026-08-26/27) behind `../territory-conflict-game-layer.md`, which is the decision. In these notes the word *readiness* is used loosely for what the record and `CYBERSPACE_V2.md` §7.6 call **holding**: keeping a region's Cantor trees on disk, which buys latency on keys and nothing else. *Readiness* proper, an engagement-latency edge, exists only inside a game running D2. Figures and section references are as of the inputs listed in each note.

# Domains, from the ground up

Date: 2026-08-26
Inputs: `CYBERSPACE_V2.md` @ origin/master 919494a (post DECK-0001 v3), DECK-0001 v3 (merged #18), DECK-0002 Domains draft (PR #7, `deck/2-stark-proofs`), DECK-0003 Derezz draft (PR #8), DECK Virtual Spawn draft (PR #15), `RATIONALE.md`, `decks/README.md`, and the recovered revision guide (the revision guide circulated privately by XOR (August 2026)).

Question: is a Domains DECK needed at all, and if so, which parts?

Method: take the word "domain" apart into every separable claim it bundles, and test each one against what the current protocol already provides, what mathematics can and cannot deliver, and what the base thesis permits.

---

## 1. What R actually is

Every "domain" construction rests on the region root `R = π(π(rx, ry), rz)`, where each `rx` is the Cantor root of the aligned per-axis subtree at height `h` (spec §4.5 to §4.7).

Facts that follow directly from the spec:

1. **R is a public function of `(base, h)`.** No secret input exists. Anyone who spends the work obtains the identical value (§4.5: "the math is the same for everyone"). This is not a weakness to engineer around; it is the property that makes location encryption and discovery work at all (§4.9 property 4).
2. **The cost of R is storage, not compute** (§9.9, §9.11, §13.2). Per axis: h34 is 185 GB, h40 is 12 TB, h46 is 756 TB, h51 is 24 PB, h57 is 1.5 EB. No ASIC advantage exists; the bound is data movement.
3. **Computing R produces the entire tree as a by-product.** Bottom-up construction materialises every intermediate node, and every intermediate node is itself the aligned root of a sub-region (§4.5). Every aligned sub-cube's discovery key at every height passes through the hands of whoever computes R. Whether they keep it is a storage decision.
4. **Every level of the per-axis tree has roughly the same total size**, about `86 · 2^h` bits, so the whole tree is about `(h+1)` times the root. Retaining the full tree for all three axes at h34 is about 19 TB; at h40 about 1.5 PB; at h46 about 107 PB.
5. **The chain of cubes containing a single point is much cheaper.** For one position there is exactly one aligned cube per height, so the nodes on that path total about twice the root per axis: about 1.1 TB across three axes at h34.

Consequence: "knowledge of R" cannot be scarce in the exclusive sense. It is rate-limited by work and by disk, never exclusive. Any construction that treats R as a secret whose knowledge confers title is a category error, and the revision guide is right to call it one. The draft's central sentence, "Root R must never be revealed (prevents counter-claims)", is false: a counter-claimant never needs your R; they compute their own identical copy.

---

## 2. What R gives the holder, exactly

Given the full tree (or the path), the holder can, using only base protocol features:

- **Read** every location-encrypted event (kind 33330) in the region, at every height, without travelling to it (§7.2 keys are `sha256(region_bytes)`).
- **Write** location-encrypted content at any height in the region, instantly.
- **Lock a house:** encrypt to `KDF(region_key || owner_secret)`, which requires presence AND the owner's factor. The base spec already lists "independent key" as a privacy model; this is the same thing composed with the region key. No new primitive.
- **Win any speed-resolved interaction** in the region. Under DECK-0003, a derezz proof is a hop-style proof over the aligned cube containing both attacker and victim. That cube is always on the holder's own path, so the holder has it cached. A visitor must compute it fresh: about a day and 185 GB at h34, during which they were already derezzed and respawned at their own pubkey, which for any region below about h75 is unreachably far away (§12.3 key grinding).

What the holder can never do, by any construction:

- Prevent anyone else from computing the same R and acquiring the same four capabilities.
- Make a policy binding on another client without that client verifying a claim and choosing to obey it.

Two holders of the same tree are symmetric gods. If both are present and hostile, derezz resolves to whoever acts first, then the loser respawns far away and must walk back. That is not a bug in derezz; it is the protocol's honest answer to contested possession: possession is held by presence and defended by readiness, and nothing in the mathematics adjudicates title.

---

## 3. The three layers, re-derived

The draft's Mathematical / Protocol / Social skeleton is right. What populates each layer is not.

| Layer | What the draft puts there | What actually lives there |
|---|---|---|
| Mathematical | STARK proof, "subtree knowledge", CP-ABE | Region keys (chalk tier); two-factor locked tier; hierarchical read; readiness. All four are **capabilities of presence**, all already in the base protocol or trivially composed from it. CP-ABE does not belong here at all (see §6). |
| Protocol | Action control, content sovereignty, owner exemption | A **title registry**: a claim event, a priority rule, a time anchor, a renewal window, and cheap verification so strangers can check it. None of this exists yet and none of it is mathematical. |
| Social | Arbitrary keys, payment, credentials | Correct as written, and needs no DECK: it is applications. |

The revision guide's four mechanisms map onto this cleanly:

- M2 (two-factor) and M3 (readiness) are mathematical-layer facts. They need prose, not normative text.
- M1 (first pubkey-bound claim wins) and M4 (renewal by reproof) are the protocol-layer registry. They are the only genuinely new machinery, and they stand or fall together with the STARK.

---

## 4. What the STARK buys, and what it costs

The draft's stated problem (§2.1) is real: a verifier cannot recompute R, so a bare claim `sha256(R || pubkey)` is checkable only by someone who also holds R. That is the base protocol's existing verification model for sidesteps (§6.11 "deterministic fraud detectability"), and it is a peer model: residents can check residents, strangers cannot check anyone.

The STARK's real value is therefore exactly one thing: **letting non-residents verify a claim cheaply**. That matters only if there is something non-residents must obey (policy). It is not, as the draft says, about hiding R (pointless, §1) or preventing counter-claims (impossible, §1). The revision guide has this right: anti-distribution and succinct verification, not exclusivity.

The feasibility hole:

- The draft's cost table (§2.5: 35 to 60 ms) is the **verifier** column. There is no prover column anywhere in the draft, the guide, or the repo.
- A STARK must arithmetise the actual computation. At h34 that is 2^34 leaves per axis and bignum pairings on integers up to 185 GB. The trace is on the order of the total bit-operations, well beyond 10^13 field elements. Current provers run at roughly 10^6 to 10^7 elements per second. That is months to years of proving per proof, plus memory the draft never estimates. No existing toolchain proves multi-gigabyte bignum arithmetic in-circuit.
- M4 (renewal by reproof) inherits this directly. The guide notes the tax "scales with holdings, which is the desired economics", but at h34 the tax may be a year of proving per renewal window, and at h40 it is not computable. The guide itself says "verify current prover benchmarks before fixing RENEWAL_WINDOW"; there are none.
- Sampled verification (DECK-0001 §5.5) does not transfer. Hyperjump leaves are independent and each costs at most h22; a Cantor tree is one deep dependent computation and the expensive part (the top levels) is exactly the part a sampled opening cannot check.
- The only non-STARK route to stranger-verifiable claims is optimistic: accept the claim, allow a bisection challenge between two tree-holders down to a single disputed pairing, and have the world check that one step. Interactive, requires both parties online with full trees, and the final check is a bignum multiply on up-to-185 GB operands. It is honest but it is not "any smartphone".

Until a prover exists, the whole protocol layer of the draft is unimplementable, and every normative sentence in it is speculative.

---

## 5. The registry against the thesis

Even granting a prover, the protocol layer as described is a **title registry with first-seen priority**. Test it against the base spec's own words:

- §3.1: "No authority assigns locations. No registry tracks who is where. The math does it."
- §8: "knowledge of global state is not possible, just as in physical reality."
- §1.1: "fairness by physics (which cannot be broken), not fairness by agreement (which can)."

First-seen ordering on a permissionless relay network is not well-defined: two relays, two "first" claims, no arbiter. Bitcoin anchoring fixes not-before but not-after requires OpenTimestamps or a coinbase commitment, both of which reintroduce a trusted or paid ordering service. At that point priority is "whoever anchored first", which is a land registry on Bitcoin: legitimate, but it is fairness by agreement, and it is the one thing the protocol's introduction says it refuses to be.

The guide's defence, that this "mirrors physical title: recorded priority, registry consensus", is accurate and is precisely the problem. Physical title is a state artefact. Physical **territory** without a state is possession, defence, and reputation. Cyberspace was built to model the latter.

---

## 6. Things in the draft that are not about domains

- **CP-ABE role keys** (draft §8). The draft says it itself: "the ABE master key is arbitrary. Authority comes from pubkey binding, not key derivation." Any pubkey can be an ABE authority for any set of users about anything. It has no relationship to R, to regions, or to work. It is an application credential system and should not appear in a territory DECK.
- **Shard content sovereignty** (draft §5.5 to §6). Client-side filtering by a tag. Social layer; a client convention, not protocol.
- **Domain policy JSON via HTTPS** (draft §3.2, §4.2). An out-of-band mutable policy file under a hash. Fine as an app convention, nothing to do with territory mathematics.
- **Overlap resolution** (draft §10.4) says "smaller domain (higher height) wins"; a smaller domain has a **lower** height. Symptomatic of a draft that was never run against the numbers.

---

## 7. What is already done elsewhere

- Part I of the revision guide (hyperspace entry) is absorbed: DECK-0001 v3 removed plane entry, reserves the toll (§7, domain string `CYBERSPACE_ENTER_HYPERSPACE_V1`), and carries Appendix A with both derivations.
- Part III (key grinding threat vector, ultrametric geometry) is already in the base spec: §12.3 "Key grinding" and DECK-0001 §9.1.
- The base spec already frames R as capability, not title: §6.12 "You can walk into a building without having the keys." The one wording to tighten is the phrase "domain authority" in §6.12 and "spatial authority" in §13.1, which presuppose a domain concept the base spec never defines.

---

## 8. Property tax by physics

The guide wants a recurring cost that scales with holdings so abandoned domains decay. It proposes reproving. The protocol already contains one, without any mechanism: **readiness is disk rent.**

| Height | Root per axis | Defence-ready (path, 3 axes) | Surveillance-ready (full trees, 3 axes) |
|---:|---:|---:|---:|
| h34 (2 m) | 185 GB | ~1.1 TB | ~19 TB |
| h40 (128 m) | 12 TB | ~72 TB | ~1.5 PB |
| h46 (7 km) | 756 TB | ~4.5 PB | ~107 PB |
| h51 (262 km) | 24 PB | ~144 PB | ~3.7 EB |

Stop paying the rent and you fall back to recomputing on demand (a day at h34, weeks at h40, infeasible above), which is exactly the "lapsed claim" the guide wanted: the region becomes contestable by anyone who is ready when you are not. Two tiers fall out naturally: holding your own path makes you undefeatable at home; holding the full trees makes you omniscient at home. Both scale as `h · 2^h`, both are paid continuously, neither needs a line of normative text.

---

## 9. What falls out as useful

Keep, and where it goes:

| Item | Status | Home |
|---|---|---|
| R is capability, not title; entering ≠ claiming; the category error made explicit | Prose fix | Base spec §6.12, §13.1 wording; RATIONALE new section |
| Two-factor locked tier `KDF(region_key || owner_secret)`; "landlord can bug the room" | Recommended construction | Base spec §7 (one paragraph) or RATIONALE |
| Readiness / home-field advantage, with the disk-rent table | Non-normative | RATIONALE; cross-referenced from DECK-0003 |
| Territory as possession + defence: derezz with home-field is the territorial mechanism; the spawn-camp defence is "hold the tree around your spawn" | Normative-adjacent | DECK-0003, which then needs no domain dependency at all |
| Location as a privacy dial for territory (near a stop: reachable for ~3 GPU-hours; h60 inland: unreachable) | Non-normative | Already in DECK-0001 §9.5; one sentence linking it to territory |
| Time-anchored, pubkey-bound, cheaply verifiable claims (M1) and renewal (M4) | **Blocked** on a prover | A future DECK, only after a feasibility spike, and only if a title registry is wanted |
| CP-ABE, policy JSON, shard filtering | Not territory | Drop from any domain DECK; app-layer conventions if anyone wants them |

Dissolves: the notion that any DECK can make a region exclusive, the owner-exemption from policy (there is no policy without a registry), and the claim that "any smartphone can verify any domain."

---

## 10. The decision

Three coherent positions. They are not compatible; pick one.

**A. No Domains DECK. Territory is emergent.** Land the prose (base spec wording, RATIONALE section on capability/readiness/two-factor), strip the domain dependency out of DECK-0003 and make home-field advantage its explicit territorial mechanism, close PR #7 with a note pointing at the analysis. Consistent with §3.1 and §8. Costs nothing, blocks nothing, and every capability people actually want from "owning" a place is already delivered. Recommended.

**B. A small "Claims" DECK, peer-verified.** Define a `claim` action in the movement chain (kind 3333, must be published from inside the region, MAC over region key, pubkey and a recent block hash). Verifiable only by other tree-holders, exactly like sidestep Level 2. No STARK, no registry, no policy. It gives residents a shared, checkable record of who was ready when. Modest value: a reputation input, not a title. Honest, cheap, optional.

**C. A title registry, gated on a prover.** Keep the ambition of PR #7 (stranger-verifiable, time-anchored, renewable claims with binding policy), but do not write another normative sentence until someone demonstrates a STARK (or folding scheme) for `compute_subtree_cantor` at h30 or above with a measured prover time. If that spike succeeds, the revision guide's Part II is the correct rewrite. If it does not, C collapses to A or B. Either way, be explicit that C is fairness by agreement and say so in the DECK.

Housekeeping regardless of choice: DECK number 0002 is claimed by both PR #7 (Domains) and PR #15 (Virtual Spawn); one of them must renumber.
