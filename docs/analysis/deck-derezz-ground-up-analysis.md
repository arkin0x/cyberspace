> Working notes (2026-08-26/27) behind `../territory-conflict-game-layer.md`, which is the decision. In these notes the word *readiness* is used loosely for what the record and `CYBERSPACE_V2.md` §7.6 call **holding**: keeping a region's Cantor trees on disk, which buys latency on keys and nothing else. *Readiness* proper, an engagement-latency edge, exists only inside a game running D2. Figures and section references are as of the inputs listed in each note.

# Derezz, from the ground up

Date: 2026-08-27
Inputs: DECK-0003 Derezz draft (PR #8, `deck/3-derezz`), `CYBERSPACE_V2.md` @ 919494a, DECK-0001 v3, v1 archive readme (derezz / armor / echo resistance), ONOSENDAI v2 `events.ts` (chain resolution) and `DerezzPanel.tsx`.
Companion: `deck-domains-ground-up-analysis.md` (option A there assumes derezz is the mechanism of territorial defence; this document tests that assumption).

Implementation status: none. The client's "Derezz" panel is self-respawn (spec §3.2). No verifier, prover, or test exists for the PVP action in cyberspace-cli, cyberspace-ts, cyberspace-cli-js, or ONOSENDAI.

---

## 1. What derezz introduces that nothing else in the protocol has

Every rule in the base protocol is **per-pubkey and self-contained**: a chain is valid or not as a function of its own events. Derezz is the first rule under which one identity's signed event changes the validity of another identity's chain. Three consequences follow before any detail is examined:

1. **Liveness becomes a global query.** To know whether V is alive you must have seen every derezz targeting V on every relay. The spec is explicit that "knowledge of global state is not possible" (§8). Two observers with different relay sets will disagree about who is alive.
2. **Validity becomes non-monotone.** The draft makes a derezz valid iff it names V's "most recent" event as of the derezz timestamp. An observer who later receives an older V event that was actually more recent must flip the derezz from valid to invalid. Nothing else in the protocol un-happens.
3. **It needs a clock, and the protocol has none.** DECK-0001 §4.2 says it outright: the declared bound "replaces a clock the protocol does not have." The base spec uses `created_at` for exactly one consensus decision, newest-spawn-wins, and that one only ever harms the signer. Derezz uses `created_at` to decide who harms whom.

Point 3 is not a detail. It is the whole problem, and §2 shows it is fatal to the draft as written.

---

## 2. The sitter always wins (a proof from the draft's own rules)

Draft rules used (§3.1, §3.2):

- R1: `derezz.ts > attacker_previous.ts + 1`.
- R2: the derezz targets V's most recent movement event with `ts ≤ derezz.ts`, and cuts V's chain there.
- R3: backdating is explicitly valid ("This is valid").
- R4: a derezzed avatar may only publish a spawn.

Scenario: A is stationary with last event at time `a`. V arrives next to A with a hop at time `v`, where `v > a + 1`.

- A's derezz may carry any `ts ≥ v` (R2 binds it to V's arrival; R1 is trivially satisfied since `a` is old). A chooses `ts = v`.
- V's derezz of A must carry `ts > v + 1` (R1, because V's own previous event is the arrival hop at `v`). So V's earliest possible derezz is `v + 2`.
- At `v`, V is dead (A's derezz). V's derezz at `v + 2` is from a dead avatar and is void (R4).

A wins by construction, and A may publish this derezz at any later time (R3). Generalising: whichever party's previous event is older can always choose the earlier timestamp, because the mover's own arrival is the event the sitter targets. **Whoever moved last loses, deterministically, and the sitter can decide this retroactively at leisure.**

Corollaries:

- **Approach is impossible.** No one can ever close distance on an attentive sitter and survive; and the sitter need not be attentive, only present, since the kill can be published later.
- **Spawn camping is permanent and undefendable.** After V respawns at `s`, V's "previous" is the spawn at `s`; a sitter at V's spawn kills with `ts = s`; V's counter needs `ts ≥ s + 2`. The draft's defence ("own your spawn point") does not help: holding the tree gives nothing against a party who is already adjacent, because the region between adjacent points is trivial and free for both.
- **Stops are kill boxes.** Every hyperspace exit disgorges at one exact coordinate (DECK-0001 §9.5). A sitter at any stop kills every arrival, retroactively, forever. Derezz as drafted makes DECK-0001 unusable.
- **The dominant strategy is never to move.** The protocol whose thesis is that presence costs movement would reward immobility with invulnerability and unlimited retroactive kills.

The draft's own defence of backdating ("the attacker must have published NO movement events since; a sleeper lying in wait; extremely low probability") describes the winning strategy and calls it unlikely. Sleepers are free: sybil is explicitly not resisted (§12.2), and a sleeper needs only to have reached the spot once.

---

## 3. What the proof actually proves

The derezz proof is a hop-style proof over the box containing A's `C` and V's targeted coordinate, plus the temporal axis seeded from A's previous event id. It proves: "A, at this chain position, has the region root of the box containing both of us." That is a good and honest statement: to affect someone you must have done the work to see them, which is work equivalence applied to aggression. It says nothing about time.

Cost structure that falls out:

- The region-root component is cacheable by design (it is the domain premise). For adjacent parties the box is trivial. The only fresh work is the temporal axis, `K ≤ 16`, about 100 ms.
- So a derezz between adjacent parties costs 100 ms, has no scaling knob, and can be repeated at will. Distance is the only cost, and it is paid once.
- Holding R (the domain case) therefore does not give an "instant" kill that others lack; it gives the ability to engage anyone anywhere in the domain without first computing the box root. That is an engagement-cost advantage, real and worth keeping, not the "god mode" the draft describes. Against an adjacent intruder the holder has no advantage at all.

---

## 4. Further defects in the draft (each independently disqualifying for a normative text)

1. **Free movement.** The event carries `c` (previous) and `C` (current) like a hop, but the proof is over the attacker-victim box, not the `c` to `C` box. A derezz with `c ≠ C` is an unpaid hop. Must require `c == C`, as `enter-hyperspace` does.
2. **Cross-plane kills for free.** LCA ignores the plane bit. A dataspace attacker and an ideaspace victim at the same X/Y/Z share a trivial box. Must require same plane.
3. **Relay-dependent "most recent".** R2 is undefined without global state; see §1.
4. **The +1 second rule** is a rate limit on a number the signer chooses. It constrains nothing.
5. **Domain policy dependency** (`derezz: deny`, owner exemption) presupposes a verifiable registry; per the domains analysis there is none. Remove.
6. **Chain-length rate limits** (v1's `floor(chain length / 1000)`) were dropped without replacement, so the attack has no cost that scales with anything.
7. **Backdated proactive respawn.** V can publish a spawn dated before a derezz, which retires the targeted event out of V's active chain and voids the derezz. Outcome is the same (V is at spawn), but it shows the validity rule can be gamed from the victim side too; ordering by self-declared time is symmetric nonsense.

Adjacent inconsistency worth fixing while here: on the one cross-event ordering the base protocol already has (forks), DECK-0001 §8 says both branches are invalid, while the client's `buildChain` keeps the older branch by `created_at`. Same clock problem, two answers.

---

## 5. What a sound derezz would need

Requirements, derived from §1 to §4:

- **R-a. An ordering source that is not self-declared.** The protocol has exactly two: Bitcoin block hashes (already the clock of DECK-0001) and work.
- **R-b. Non-retroactivity.** A derezz must not cut a chain further back than some bound the victim can defend.
- **R-c. Monotone validity.** Once an observer has the derezz, the attacker's chain and the victim's chain, the verdict must not flip as more events arrive.
- **R-d. Same plane, `c == C`, box proof as drafted.**
- **R-e. A cost that scales**, or an explicit acceptance that adjacency makes killing free and the design must survive that.
- **R-f. Compatibility with stops.** Arrival at a stop must not be a death sentence.

Three coherent designs satisfy these to different degrees.

### D0. No unilateral kill. "Derezz" is the respawn verb.

Territory becomes possession without force: holding R gives read, write, lock and readiness (the chalk model taken seriously); exclusion is social (communities ignore intruders' events; relays already auth-gate, cyberspace.nostr1.com runs NIP-42). Nothing new is specified. This is where the client already is. It weakens option A in the domains analysis from "possession plus defence" to "possession plus readiness" and is fully consistent with §3.1 and §8.

### D1. Block-clocked derezz (minimal sound version).

- Every movement event MAY carry a block commitment, e.g. a `bh` tag with a recent block hash (DECK-0001 already carries `as_of` heights; this generalises the idea). A hop that commits to block `b` provably happened after `b`.
- A derezz MUST carry a block commitment `b_d` and MUST target V's newest event that commits to a block `≤ b_d` (or carries no commitment). It cuts V there.
- A derezz is void against any V event that commits to a block `> b_d` and descends from the targeted event: V has provably moved on since. This bounds withholding to one block (about ten minutes) and makes the victim's defence free: commit the latest block hash on every hop.
- Ties (both parties' derezzes commit to the same block): resolve by fresh work (see D2's knob) or, absent a knob, mutual destruction. Never by `created_at`, never by who sat longer.
- Same plane; `c == C`; the proof as drafted.
- Stops: arrival commits to the current block; a sitter's derezz at the same block is a tie, not a loss, and the arrival can ride on before the next block. Kill boxes become contested ground rather than guaranteed death.

Validity is then a function of three chains and one block header set, and it is monotone: later-arriving events can only add commitments, which only ever void derezzes, never revive them. Verdicts converge instead of flipping.

### D2. Work as the clock (v1's insight in v2 primitives).

v1 had the right idea: a derezz is an amount of work, the victim's chain since the targeted event is temporal armour, and withholding is self-defeating because the victim keeps accumulating armour. v2 lacks a scalable fresh-work knob (the temporal axis is capped at 2^16). D2 adds one: a sidestep-style Merkle work component seeded by the attacker's previous id and the victim's targeted event id, height chosen by the attacker, verified by sampled openings as in DECK-0001 §5.5. Victim armour is the fresh work in the victim's chain after the targeted event. Success iff attacker work exceeds armour. This restores v1's game (armour, pursuit, stealth economics) and removes the clock entirely, at the price of a substantially larger DECK and real balance testing. It composes with D1 (block commitments bound the window; work decides inside it).

---

## 6. Recommendation

Adopt **D0 now**: withdraw the unilateral kill from DECK-0003, keep "derezz" as the respawn verb the client already uses, and state in prose that the protocol offers no cross-chain effect until one is specified with a real clock. Revise the domains conclusion accordingly: territory under option A is possession and readiness, and exclusion is social.

If force is wanted, **D1 is the design to write**, and it must be written test-first (§7). D2 is the design to aim at if a game is wanted rather than a deterrent, and it should not be attempted before D1's clock exists.

Either way, add the block-commitment tag to the base protocol or to a tiny standalone DECK, because it is useful independently: it gives every movement event a provable not-before, which the domains claim design (option B there) and DECK-0001 both want.

---

## 7. Test plan for any derezz DECK (normative text is not done until these pass)

A reference verifier (Python, in cyberspace-cli, matching the existing Level-1 verifiers) and a scenario suite. Each scenario is a fixed set of signed events plus the expected verdict per observer. Scenarios:

1. **Sitter vs arriver.** A stationary since `a`; V hops adjacent. Expected under D1: V survives unless A's derezz commits to V's arrival block, in which case tie rules apply; never "A wins by timestamp."
2. **Withholding.** A builds a derezz at block `b`, V publishes two hops committing to `b+1`, `b+2`, A publishes. Expected: void.
3. **Spawn camp.** V respawns; A adjacent. Expected: V has a defensible move (commit and ride or hop) before the next block; no permanent lock.
4. **Stop kill box.** Ten arrivals at one stop in one block with one sitter. Expected: no arrival dies without a tie-break; all can ride on.
5. **Relay partition.** Observers O1 (sees derezz) and O2 (does not). Expected: verdicts differ only until O2 receives the events, then converge; no verdict ever flips valid to invalid on receipt of a victim event older than the derezz's block.
6. **Cross-plane.** Attacker and victim same X/Y/Z, different plane. Expected: invalid.
7. **Free move.** Derezz with `c ≠ C`. Expected: invalid.
8. **Stale target.** Derezz names an event that is not the newest at-or-before `b_d`. Expected: invalid.
9. **Mutual derezz, same block.** Expected: tie rule (work, else mutual destruction), never `created_at`.
10. **Domain holder vs deep intruder.** Holder at one corner, intruder at the far corner of an h34 region. Expected: holder's proof uses the cached box root; verdict identical to a fresh computation; cost difference documented, not normative.
11. **Fork interaction.** Victim forks after the targeted event. Expected: consistent with whichever fork rule is chosen (§4, last paragraph), and that rule made identical in DECK-0001 and the client.
12. **Chain of derezzes.** A derezzes V then hops. Expected: A's chain remains valid; A's next temporal seed is the derezz id.

Property tests over random geometries: (i) validity monotone under event arrival order; (ii) no strategy that never moves dominates one that moves; (iii) every arrival at a stop has at least one surviving continuation under adversarial sitters.

Until this suite exists and passes, DECK-0003 should carry Status: Draft with a note that it is known unsound, or be withdrawn.
