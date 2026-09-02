> Working notes (2026-08-26/27) behind `../territory-conflict-game-layer.md`, which is the decision. In these notes the word *readiness* is used loosely for what the record and `CYBERSPACE_V2.md` §7.6 call **holding**: keeping a region's Cantor trees on disk, which buys latency on keys and nothing else. *Readiness* proper, an engagement-latency edge, exists only inside a game running D2. Figures and section references are as of the inputs listed in each note.

# D2: work as the clock. An honest pass on the theory behind derezz

Date: 2026-08-27
Companion to `deck-derezz-ground-up-analysis.md`.

The theory under test, as stated by arkinox:

1. `created_at` can be gamed, but each chain's own movement and the enemy's movement commitments narrow the space of valid values, until the clock is the relative, always-forward movement of the chains themselves.
2. Distance plus work then create the finesse: unpredictable outcomes centred on skill and hardware.
3. Fundamentally, defending territory falls out of thermodynamics: you spend energy to obtain, so others must spend energy to take it, and thermodynamics is the only final verdict on conflict.

---

## 1. What is true in part 1, stated precisely

A chain is a hash chain. Each event names its predecessor by id, so within one chain the order of events is fixed by cryptography, not by `created_at`. `created_at` is a label, constrained to be monotone along the chain, but the *order* would be the same if the label were deleted.

Across chains, a reference is a proof of "after": a derezz that names V's event D by id was created after D existed. No timestamp is needed for that. This is exactly the happens-before relation of Lamport clocks, and it is the mechanism your intuition is reaching for: chains, and references between chains, are a partial order that no one can forge.

So: hash links give a free, unforgeable "after". That much of the theory is not only right, it is the only clock the protocol actually has.

## 2. Where part 1 fails

References prove "after". Nothing proves "before". A can prove the derezz came after D. A cannot prove the derezz came before V's next event, because V's next event will never reference A's derezz. In Lamport terms, a withheld derezz and everything V does after D are *concurrent*: no causal order exists between them, and no timestamp can create one.

"Always-forward movement narrows the window" is true only for the party that moves. Every new event a mover publishes is a new lower bound on all their future labels; their window shrinks. A sitter publishes nothing, so a sitter's window never shrinks: they may label a derezz with any time after their last event, which may be arbitrarily old. The constraint is real but asymmetric, and the asymmetry favours the passive party. That is the "sitter always wins" result: not a quirk of the +1 rule, but the direct consequence of using labels to settle concurrency.

The theory would hold as stated only if every chain were forced to advance continuously, a heartbeat, which the spec deliberately refuses (§5.1: "This is not a continuous heartbeat cost").

So the mistake is narrow and specific: **created_at may serve as a monotone label, but it must play no part in any verdict.** Concurrency between chains has to be resolved by something else. Your part 2 names it.

## 3. Part 2 is the resolution, and it is Bitcoin's

Bitcoin's insight was that a timestamp server needs no clock: cumulative work *is* time. Two concurrent histories are ordered by which one carries more work, and rewriting the past costs as much work as was stacked on top of it since.

Read derezz in that frame and every piece falls into place:

- Each avatar's chain is a proof-of-work chain.
- A derezz that targets V's event D is a **reorg attack**: it proposes that V's history ends at D.
- V's work accumulated after D is V's **temporal armour**: the cost of rewriting that stretch of history.
- The derezz succeeds iff the attacker's fresh work exceeds the armour (plus any explicit armour V holds).
- Withholding is self-defeating: while A waits, V's armour grows.
- Sitting confers nothing: A's work must be fresh and seeded by D, so A cannot begin grinding until V has arrived; the sitter's only advantage is being present, and presence was prepaid by travelling there.
- Retroactive depth is priced: cutting V back to their spawn costs V's entire life's work, because that is what sits on top of the spawn.
- `created_at` appears nowhere in the verdict.

This is v1's design (temporal armour, explicit armour, power minus distance) rebuilt on v2's primitives. v1 had the physics right; v2's draft replaced the physics with labels. The theory's parts 2 and 3 are correct; the draft did not implement them.

## 4. Where distance enters

In v1, distance was subtracted from derezz power per shot. In the v2 draft the box root between attacker and victim is paid once and cached (it is the domain premise), so distance is a cost to *see*, not a cost to *shoot*: adjacency makes shooting free.

D2 has a choice. If the derezz's fresh work is required to scale with the box height (the LCA height between A's position and D), then distance is repaid on every shot. The consequences are exactly the finesse you describe: closing distance before firing is a skill decision; standing in the middle of your holding is a positional advantage; an intruder deep in your domain pays per shot what you do not. Holding R then gives two distinct edges, cheap sight (cached roots) and cheap shots (being close), neither of which is a registry.

## 5. What D2 needs defined (the honest gap list)

1. **A unit of work.** Cantor pairs and SHA-256 hashes are different currencies and do not convert. Movement's fresh work is tiny by design (temporal axis ≤ 2^16 pairs per hop, about 6.5 × 10^4 per second at one hop per second; a single GPU does 2 × 10^10 hashes per second, five orders of magnitude more). So movement cannot be the armour; armour must be an explicit action with its own fresh work, and derezz work must be in the same unit. Simplest consistent choice: both are sidestep-style SHA-256 Merkle trees, seeded by chain position (and, for derezz, by D), verified by sampled openings exactly as DECK-0001 §5.5 already does for rides.
2. **Stock versus flow.** Explicit armour is a stock: grind 2^60 once and hold it. Flow armour (work since D) decays as you idle. Bitcoin stays honest because the chain must keep growing; an avatar with a huge one-time stock is a static fortress that old money wins permanently. v1 mixed both. A flow-dominant rule keeps presence a thing that must be maintained, which is what "being idle makes you a target" was reaching for, and does not contradict the no-heartbeat rule because idling is allowed, it is just undefended.
3. **The two regimes.** Knowledge of territory is storage-bound (Cantor roots, no ASIC advantage, §9.11). Combat work in D2 is SHA, which is ASIC work (§12.3). A state that cannot cheaply know your h46 root can cheaply kill you in it. The verdict is still thermodynamic, but the two currencies are not the same, and the defence of territory ends up priced in the cheaper one. This is a values decision, not a bug, and it should be stated in the DECK.
4. **Cascade semantics.** A reorg voids V's events after D. If one of those was V's derezz of W, W is alive again; if someone derezzed one of V's now-void events, that derezz is void too. Liveness becomes a fixed point over the reference DAG, like Bitcoin reorg semantics. It must be specified and tested; it is the true cost of any cross-chain effect.
5. **Eventual consistency, not monotonicity.** An observer's verdict flips as they learn of more work on either side. That is unavoidable when work decides, and it is acceptable: verdicts converge toward the side that spent more. The DECK should say so instead of pretending verdicts are final on first sight.
6. **Stops and the unarmoured.** Under D2 an arrival at a stop with zero armour dies to one hash. So armour is something you wear when you travel, and a newcomer who has done nothing has nothing to lose (their death returns them to a spawn they were already effectively at). Reasonable, but it must be designed for, and the client must make armour visible.
7. **Distance rule** (§4): per shot or per sight. Recommend per shot.

## 6. Verdict on the theory

- Part 1: half right. Chains and references are a real, unforgeable clock for "after". They cannot produce "before", and `created_at` cannot fill that gap; using it is what broke the draft.
- Part 2: right, and stronger than stated. Work is not a tiebreak for the clock; it *is* the clock, as in Bitcoin. Once that is taken all the way, derezz is a reorg attack, armour is history, and the "sitter wins" hole closes without any timestamp rule at all.
- Part 3: right, with one caveat to write down: combat lives in the compute-bound regime while territory knowledge lives in the storage-bound one.

## 7. Next step if D2 is chosen

Write it test-first. A Python simulator in cyberspace-cli: N avatars, each a chain; actions hop, armour, derezz; a verifier that computes liveness as a fixed point over the DAG; the 12 scenarios from the derezz analysis re-expressed in work terms, plus adversarial strategies (sitter, withholder, whale, swarm) run against a moving defender with a fixed budget. The normative text is whatever survives that.
