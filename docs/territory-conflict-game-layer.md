# Territory, conflict, and the game layer

**Status:** Design record, 2026-08-27
**Decided by:** arkinox, in review with Claude
**Inputs:** `CYBERSPACE_V2.md` at 919494a (post DECK-0001 v3), DECK-0001 v3 (merged, #18), the DECK-0002 Domains draft (PR #7), the DECK-0003 Derezz draft (PR #8), the Virtual Spawn draft (PR #15), `RATIONALE.md`, the v1 archive (derezz, armour, stealth, echo resistance), and a revision guide circulated privately by XOR in August 2026.
**Supporting analyses** (working notes; this record is the decision):
- `analysis/deck-domains-ground-up-analysis.md`: domains taken apart claim by claim
- `analysis/deck-derezz-ground-up-analysis.md`: the derezz draft's defects, including the sitter-wins proof, and a 12-scenario test plan
- `analysis/deck-derezz-d2-work-clock.md`: the work-as-clock design and the honest pass on the theory behind it

---

## 1. Decisions

### 1.1 Domains: no Domains DECK. Territory is holding.

The region root `R` is a public function of `(base, height)`; anyone who spends the work obtains the identical value, and that is the property that makes location encryption and discovery work at all. Knowledge of `R` can be rate-limited by work and disk but never made exclusive. The Domains draft treated `R` as a secret whose knowledge confers title, and built a STARK to hide it. That is a category error: a counter-claimant computes their own copy and never needs yours.

What computing `R` and keeping the result gives is **holding** (spec §7.6): the per-axis roots of every aligned sub-region, at every height, on disk, so that every location-based key inside the region is one pairing step away instead of a tree away. Holding buys latency and nothing else:

- read anything published anywhere in the region, at any height, without per-item work (a passerby's interactive scan reaches roughly h16);
- write anywhere in the region, at any height, at once;
- lock a house: `KDF(region_key || owner_secret)`, presence plus the holder's factor.

Holding does not buy exclusion (anyone who does the work holds identical keys), any advantage in observing chains (they are public to everyone), or any effect on anyone else. It is a keyring. It costs disk for as long as it is held: about 19 TB for the full trees of an h34 cube, 1.5 PB at h40, 107 PB at h46; about 1.1 TB at h34 for just the nested cubes around one position. Lapse and the keys are a recomputation away again; nothing else happens. That is the whole of the protocol's maintenance economics, and it needed no mechanism.

A protocol-layer domain (claim, priority, time anchor, renewal, stranger verification) is a **title registry**. The base spec says in §3.1 "No registry tracks who is where" and in §8 "knowledge of global state is not possible." It is also blocked in practice: the STARK in the draft has no prover column anywhere, and arithmetising 2^34 bignum pairings on 185 GB integers is months to years per proof with anything that exists.

**Games may define territory.** A game is free to run its own registry, claims, taxes and policy for its players. That is what the game box (§2) is for, and it is where the ambitions of the Domains draft can live without a STARK, because the game's client is the verifier and its players opted in. Nothing about it binds anyone outside the game.

**Actions taken in this change:** spec §6.12, §9.3 and §13.1 reworded from "authority" to holding; spec §7.6 added; RATIONALE §4 and §6 extended; DECK-0001 §6 reworded. **Actions for the maintainers:** close PR #7 with a pointer here; the CP-ABE, policy-JSON and shard-filtering material in it is application convention, not territory, and may be re-homed by whoever wants it. DECK number 0002 goes to Virtual Spawn.

**Kept open, not scheduled:** a peer-verified "claims" DECK (a `claim` published from inside the region, MAC over region key, pubkey and a recent block hash, checkable only by other holders, exactly like sidestep Level 2). A reputation input, never a title. With the encounter primitive (§4.1) it becomes a co-signed attestation between holders rather than a new mechanism.

### 1.2 Derezz: withdrawn from the protocol layer. Lives in the game box.

The draft is unsound, and the defect is structural. Derezz is the first rule under which one identity's signed event changes the validity of another identity's chain, and the draft settles the resulting ordering with `created_at`, a number the signer chooses. Under its own rules, the party that has been stationary longer always wins any encounter, retroactively and at leisure (`analysis/deck-derezz-ground-up-analysis.md` §2). Consequences: nobody can ever approach anyone; spawn camping is permanent and undefendable; every hyperspace stop is a kill box; the dominant strategy is to never move.

The theory behind derezz survives the draft. Chains and cross-chain references are an unforgeable clock for "after" (Lamport's happens-before). They can never prove "before", and no label can fill the gap. The resolution is Bitcoin's: **work is the clock.** A derezz targeting event D is a reorg attack on the victim's chain; the victim's work accumulated after D is temporal armour; the attack succeeds iff the attacker's fresh work exceeds it. Withholding is self-defeating, sitting confers nothing, deep reorgs cost the victim's whole life, and `created_at` appears in no verdict. This is v1's design rebuilt on v2 primitives, called **D2** below.

**Why the game box.** Spec §1.1 promises "no administrator who can move you or delete you." A derezz moves you. As a protocol fact it would break that promise. As a game rule it does not: every DECK is optional, a derezz exists only for clients that honour it, and the thermodynamic verdict applies among those who agreed to be judged by it.

**Readiness, precisely.** Inside a game running D2, holding gains a second consequence: the holder can engage anyone in the holding without first computing the box between them, so the holder's time-to-engage is shorter. That engagement-latency edge is what *readiness* means, and it exists only inside such a game. In the base protocol there is nothing to engage, and holding is a keyring.

**Actions for the maintainers:** rewrite DECK-0003 as a game DECK per D2, test-first (§3); until the simulator and scenario suite exist and pass, it stays Draft with a note that the old text is known unsound. Remove the domain-policy dependency and owner exemption entirely. Keep "derezz" as the client's respawn verb (ONOSENDAI's panel already means that); the game action is a derezz attack.

### 1.3 Virtual spawn: game box.

Already correctly framed in its own draft: protocol-invalid, application-valid. Its open question 3 (relationship to domain rules) is answered: there are no domain rules; a game defines who may virtually spawn where, and the game's own liveness rules apply from there.

### 1.4 The premises, as revised

Recorded because the reasoning is part of the protocol's defensibility.

- *"Cyberspace has scarce space."* Positions are not scarce (2^255 of them, and two avatars may share one). Proximity to meaningful things is scarce. At the math layer territory is non-rival: my holding a region takes nothing from yours. Physical territory is rival because two bodies cannot share a point; cyberspace lacks that, so conflict from scarcity must be chosen, not assumed.
- *"You spend energy to obtain, so others must spend energy to take it."* True of presence already: the only defence the base thesis promises is that others must do the work too. Force adds a second thing, the power to make a place cost more than the work of reaching it. That is a game design choice.
- *"Thermodynamics is the final verdict on conflict."* Kept, inside the game box, with its bill written down: combat work is SHA-256 (ASIC work, spec §12.3) while holding is storage-bound (§9.11). A state that cannot cheaply hold your h46 cube can cheaply kill you inside it. The verdict is thermodynamic; the currency is the one that most favours hardware.

---

## 2. The game box

### 2.1 Two axes, never confused

| | Game-alive | Game-dead |
|---|---|---|
| **Protocol-valid** | ordinary play | derezzed (D2): chain valid, game says respawn |
| **Protocol-invalid** | virtual spawn: chain invalid, game recognises it | ordinary invalid chain (fork, bad proof) |

The base protocol owns exactly one verdict, validity, and nothing in the game box ever changes it. A game owns liveness, and the protocol never consults it. The Virtual Spawn draft already uses "derezzed" for its protocol-invalid state; the table makes the two meanings explicit.

### 2.2 Invariants (also in `decks/README.md`)

1. A game mechanic MUST NOT alter the validity of any kind 3333 chain under the base spec.
2. A game mechanic MUST be verifiable from a bounded set of events plus, if it needs a clock, Bitcoin block headers. `created_at` MUST NOT decide any game verdict.
3. A game mechanic that resolves conflict MUST resolve it by work, with the unit of work stated and the verification cost bounded (sampled openings, DECK-0001 §5.5, are the existing pattern).
4. A game mechanic's effects MUST be specified as a fixed point over the reference graph where events can void one another (reorg semantics), with convergence under partial views stated.
5. A client that does not implement a game DECK MUST see nothing wrong with any chain the game considers dead.

### 2.3 In the box now, and what v1 suggests next

- **Virtual spawn** (PR #15): the entry point for games. DECK-0002.
- **Derezz attack** (D2, replacing PR #8): the reorg attack; explicit armour as the defence. DECK-0003.
- From v1, once D2 exists: **armour** (stock work worn while travelling), **stealth** (obscured position bought with work); **vortex** and **bubble** only if a game has continuous motion, which v2 hops do not.

### 2.4 For game developers

A game on cyberspace is: a region (any aligned cube; a landfall neighbourhood on Earth or an inland cube in the void), a spawn zone (a virtual-spawn policy: who may appear, where, under what credential or cost), a ruleset (which game DECKs the game's client honours, with which parameters), and a client (or a mode of an existing one), usually with a relay that has its own admission policy (the reference relay already auth-gates with NIP-42).

What the protocol gives a game for free: locality (movement priced by ultrametric distance, no teleportation, decomposition invariance); region keys at every height (chalk, locked houses, discovery radius as a level-design tool); holding, for whoever wants to keep a region's keys; chains as tamper-evident audit trails of every player's path; a global clock through Bitcoin block hashes; a transit system with stops (DECK-0001); and identity that is also a coordinate.

What a game must supply itself: scarcity for virtual spawns (the draft is explicit that they are free and sybil-able); its own liveness rules; its own balance (D2's stock-versus-flow armour choice is a balance knob, not a protocol constant); and the understanding that nothing it does binds anyone outside its client.

---

## 3. D2 in one page (for the DECK-0003 rewrite)

- **Unit of work:** SHA-256 Merkle trees, sidestep-style, verified by sampled openings. Movement's own fresh work (temporal axis, at most 2^16 pairs per hop) does not count; it is five orders of magnitude below one GPU-second and was never meant to be armour.
- **Derezz attack:** kind 3333, `A = derezz`, in the attacker's chain; `c == C` (it does not move you); same plane as the target; the box proof over attacker position and target position (work equivalence applied to aggression, the one good idea in the old draft); fresh work seeded by the attacker's previous event id and the target event id, height chosen by the attacker, scaled by the box height so distance is repaid per shot.
- **Armour:** an explicit action carrying fresh work seeded by chain position. Flow-dominant: the verdict weighs work accumulated since the targeted event more than a held stock, so presence has to be maintained; idling is allowed but undefended.
- **Verdict:** attack succeeds iff attacker work exceeds target armour since D. `created_at` is not consulted. Verdicts are eventually consistent: they converge toward the party that spent more as observers learn more.
- **Effect:** the target's chain is game-dead from D; the target's next game-valid action is a spawn. Events voided by a reorg void their own effects (a voided derezz revives its victim). Liveness is a fixed point over the reference graph.
- **Block commitments:** any movement event may carry a recent block hash; a derezz must. They bound withholding to one block and give arrivals at stops a defensible move.

Open balance questions (game parameters, not protocol): the distance scaling function; the flow-versus-stock weighting; whether stops get a grace rule beyond block commitments.

**Test-first plan.** A Python simulator in cyberspace-cli beside the existing Level-1 verifiers: N avatars as chains; actions hop, armour, derezz; a verifier computing liveness as a fixed point over the graph; the 12 scenarios of `analysis/deck-derezz-ground-up-analysis.md` §7 re-expressed in work terms (sitter vs arriver, withholding, spawn camp, stop kill box, relay partition, cross-plane, free move, stale target, same-block mutual, holder vs deep intruder, fork interaction, derezz chaining); adversarial strategies (sitter, withholder, whale, swarm) against a moving defender with a fixed budget; property tests that no never-moving strategy dominates a moving one, that verdicts converge, and that every arrival at a stop has a surviving continuation. The normative text is whatever survives.

---

## 4. Is the protocol missing something without derezz?

No. Removing derezz costs the base protocol nothing it promised: every guarantee in spec §12.1 is a property of an isolated chain. But asking why derezz felt necessary exposes two real gaps it was covering badly, and one property that is not a gap but should be stated plainly.

v1's derezz did two jobs under one word: it was the *state* of having an invalid chain ("a forked action chain is wholly invalid and causes its owner to derezz"), and it was aggression. The first job is fully intact in v2 (an invalid chain is not a position; the newest spawn resets; the client's Derezz panel is this; Virtual Spawn uses the word this way). Only the second was boxed.

### 4.1 Gap: there is no contact primitive

Physical space has distance (it costs energy to cross) and contact (being near something lets it affect you). The protocol models distance completely and contact not at all. Proximity lets you observe another chain and read a region's chalk; it never lets you affect anyone, and nothing lets two avatars prove they met.

Derezz was a hostile contact primitive. The sound version is cooperative: an **encounter**, in which two chains reference each other's heads and each carries the box proof over both positions. Mutual references are a causal knot, the only way the protocol can ever produce a proof of "before" (a unilateral reference proves only "after"). An encounter costs nothing beyond the proximity work, violates nothing in §1.1, needs no clock, and is what the rationale's own use case requires: "a witness can only be in one place" (RATIONALE §1) is unusable without a witnessing primitive. AI embodiment, handoffs, trades, doors and co-signed attestations of co-location follow from it, and it hands games a contact mechanic that is not combat. It also gives D2 a cheaper clock among willing parties.

The fundamental thing missing is contact; derezz was its hostile half; the constructive half belongs in the base protocol.

### 4.2 Gap: fraud is detectable but the verdict cannot be shared

Sidestep and hyperjump security rest on deterministic fraud detectability (spec §6.11, DECK-0001 §5.5): a bad root is objectively wrong and anyone who redoes the work can see it. But no event says "this event is fraudulent, here is the evidence," so every observer redoes Level 2 or trusts. v1 needed derezz as the consequence of fraud; the missing piece is a **fraud-proof event**, which needs no consequence at all because an invalid chain is already dead by definition. For a hyperjump the evidence is compact: one recomputed leaf (at most h22) against the published opening. For a sidestep it is not, since a Merkle root can only be shown wrong by producing the right one; that case needs either a bisection game between two holders or a signed "recomputed, disagree" attestation weighted by who signs it. Either way the shape is a cheap, shareable verdict, not a kill. The fork-rule inconsistency (work list item 8) is the same gap from another angle: nothing can publish "this chain forked here."

### 4.3 Not a gap, but say it out loud: presence is a record, not a state

Once you hop somewhere you are there until you publish again (spec §5.1, no heartbeat). Physical presence costs energy per second; cyberspace presence costs energy once. So popular regions and stops fill with ghosts, and "who is here" means "whose last event is here." Derezz was v1's broom for ghosts and is the wrong tool; the property was chosen deliberately, because demanding continuous work is what §5.1 refuses. The honest handling is a client-side liveness convention (age of last event) and a sentence in the spec admitting that an avatar is a last-known position. Related and equally unavailable: position is non-rival, and no protocol can add collision without global state.

### 4.4 Consequence for priorities

The encounter primitive and the fraud-proof event are protocol-grade, sound without a clock, and better served by cooperative mechanisms than by a kill. They go on the base-protocol work list ahead of the D2 simulator.

---

## 5. Work list

| # | Item | Where | Status |
|---|---|---|---|
| 1 | Close PR #7 with a pointer to this record | cyberspace | maintainers |
| 2 | Base spec wording: §6.12, §9.3, §13.1; new §7.6 | cyberspace | this change |
| 3 | RATIONALE: exclusive territory limitation; holding, not owning | cyberspace | this change |
| 4 | decks/README: game-mechanics category and reservations | cyberspace | this change |
| 5 | Block-commitment tag: base spec or tiny DECK | cyberspace | pending |
| 6 | DECK-0003 rewrite per D2, Status Draft, known-unsound note on the old text | cyberspace | pending, after 7 |
| 7 | Simulator and scenario suite | cyberspace-cli | pending |
| 8 | Fork rule: DECK-0001 §8 (both branches invalid) vs the ONOSENDAI client (older branch wins); make one true | cyberspace, ONOSENDAI | pending |
| 9 | Virtual Spawn: answer open question 3; becomes DECK-0002 | cyberspace PR #15 | pending |
| 10 | Encounter primitive: mutual-reference contact event with the box proof over both positions (§4.1) | cyberspace | pending, before 7 |
| 11 | Fraud-proof event: compact evidence for hyperjump leaves; bisection or signed disagreement for sidesteps (§4.2); unifies with item 8 | cyberspace | pending, before 7 |
| 12 | Spec sentence: an avatar is a last-known position; client liveness convention by event age (§4.3) | cyberspace, ONOSENDAI | pending |
