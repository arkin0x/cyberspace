# What can be sold in Cyberspace

**Status:** Design record, 2026-09-16
**Decided by:** arkinox, in review with Claude
**Applies to:** `CYBERSPACE_V2.md` §6.4, §6.12, §7.6, §7.8, §13.2

Anyone who wants to build a business on this protocol runs into the same question within an hour: movement costs real work, so can I do that work for other people and be paid for it?

The answer is yes, and it has a specific shape. The shape is not obvious, two plausible readings of the specification are wrong in opposite directions, and one sentence in the specification was itself wrong until this record was written. This document explains the shape slowly, because getting it wrong means building the wrong company.

No part of this is a protocol change. It is an explanation of rules that already exist.

---

## 1. Three things that are easy to confuse

When somebody says "selling movement," they could mean any of three different products with three different economics.

| | what is sold | reusable by a second buyer | what the seller needs |
|---|---|---|---|
| **a crossing** | a finished proof that you moved | **never** | hardware |
| **a root** | a number: one axis's Cantor root | yes, by anyone, forever | stored data |
| **a job** | someone else's work, done for them | not applicable, each job is theirs | hardware |

These are not three names for one thing. The protocol treats them completely differently, and it does so on purpose.

---

## 2. A crossing cannot be sold, and that is deliberate

A **sidestep** is how you cross a wall: a boundary so high that computing the Cantor tree for it is infeasible, so you prove a cheaper Merkle tree instead.

The Merkle tree's leaves are **seeded by your chain position** (§6.7). Concretely, the seed contains `previous_event_id`, the id of the last event in your own movement chain. Your tree is therefore yours alone. Nobody else's tree has the same leaves, so nobody else's proof has the same root, so your proof is worth exactly nothing to anybody else.

§6.4 states the consequence plainly: a sidestep's work "is paid in full by every traveller and cannot be reduced, sold, or inherited from anyone else's published proof."

**Why the protocol wants this.** §6.14 gives the reason, and it is worth reading as a warning rather than a footnote. Without the seed, the leaves would contain no identity and no chain context, so the root for a given subtree would be the same 32 bytes for every traveller in the history of the protocol. Destinations are deterministic and proofs are published in the clear, so **the first identity ever to cross a boundary would publish everything a later identity needs.** Crossings would be priced for the pioneer and free for everyone after. Walls would stop being walls the moment one person climbed one.

So the seeding is what keeps a wall a wall. It is not friction the design failed to remove; it is the mechanism.

---

## 3. A root can be sold, and that is also deliberate

A **hop** is how you move when the boundary is low enough to compute a Cantor tree for it. That tree's root is **canonical**: it depends only on the region, not on who computed it. Two people standing in the same place derive the same number without ever meeting, which is the property that makes location-derived keys work at all (§4.9).

Canonical means transferable. If I compute a root and tell you the number, you have the same number I have, and it is as good in your hands as in mine.

§6.12 is built on this, and its heading says it: **a crossing cannot be sold; a root can.** The section is careful to frame the sale as legitimate rather than as an exploit: "A region root is disclosed only when a holder chooses to disclose it, one recipient at a time, and that disclosure is exactly the act the protocol is built to support: handing someone the key to a place. Movement is priced; disclosure is a social act."

### 3.1 A root is one boundary, not a region

This trips people up, so it is worth being exact.

An axis root is `compute_subtree_cantor(base, h)`, where `h` is the **lowest common ancestor height** of the move's start and end on that axis, and `base` is the aligned block containing both (§4.6). Both numbers come from the specific move.

So a root is not "the key to a region." It is one aligned block, on one axis, at one height. A different move inside the same neighbourhood has a different lowest common ancestor and therefore needs different roots. §4.4 makes the same point from another angle: a one-Gibson move that happens to cross a large power-of-two boundary is expensive, while a thousand-Gibson move inside one block is cheap. Cost follows which boundary you cross, not how far you travel.

**Holding is the thing that covers a region.** §7.6 and §7.8 define holding as keeping every intermediate node of the trees, which is every aligned sub-region's root at every height. A holder can cross any boundary inside their holding because they have all of the roots, not one of them. Being handed a single root is a much smaller gift than holding, and the two are often spoken of as if they were the same.

---

## 4. Why being handed a root helps less than it sounds

Until this record, §6.12 said that a recipient of a root could hop "for the cost of the temporal axis alone, roughly 100 ms, at any height." That was wrong, and the way it was wrong is instructive.

### 4.1 The numbers involved are enormous

Cantor pairing is `π(a, b) = (a+b)(a+b+1)/2 + b`. It squares the sum of its inputs, so **the result is about twice as long as its inputs.** A tree of height `h` pairs `h` times, so the size doubles `h` times.

Starting from 85-bit coordinates:

| level | values left | bits in each |
|---|---|---|
| 0 | 256 | 85 |
| 1 | 128 | 170 |
| 2 | 64 | 340 |
| 3 | 32 | 680 |
| 8 | 1 | 21,760 |

A root at height `h` is exactly `85 × 2^h` bits. That is not an approximation; it holds to the bit at every height, because each level doubles the width and halves the count.

| height | one axis root |
|---|---|
| h16 | 680 KB |
| h20 | 10.6 MB |
| h24 | 170 MB |
| h30 | 10.6 GB |
| h34 | 170 GB |
| h40 | 10.6 TB |

### 4.2 A hop is four stages, and a recipient skips one

1. **Build** three axis trees.
2. **Combine** them: `region_n = π(π(cantor_x, cantor_y), cantor_z)`.
3. **Temporal**: `cantor_t = compute_subtree_cantor(t_base, K)`, where `t_base` comes from your own `previous_event_id` (§5.3).
4. **Bind and hash**: `hop_n = π(region_n, cantor_t)`, then double SHA-256.

A recipient skips stage 1 only.

### 4.3 The counting error

Building three trees at h34 takes about **51.5 billion pairings**. Stages 2 to 4 take **three pairings and a hash**. Three against 51 billion looks like nothing, and that is the trap: the sentence counted operations instead of measuring them.

Each of those three pairings multiplies numbers the size of a root. Measured, one pairing on operands of exactly root size:

| height | operand size | one pairing |
|---|---|---|
| h10 | 11 KB | 1.6 ms |
| h13 | 85 KB | 44 ms |
| h16 | 680 KB | **766 ms** |
| h18 | 2.7 MB | 6.9 s |

At seven micrometres, **one** pairing already costs more than seven times the budget the old sentence gave the entire hop.

### 4.4 The tree is top-heavy, so the part you skip is the cheap part

Level `k` of a tree has `2^(h-k-1)` pairings on operands of `85 × 2^k` bits. Each level therefore costs roughly 1.5 times the level below it, and the whole tree costs about three times its single final pairing. Measured, the final pairing alone is 23% to 33% of the entire build.

Meanwhile the combine stages work on the largest numbers in the computation: `region_n` is about four times a root, and `hop_n` about eight times. **The combine costs more than all three tree builds put together.**

Measured end to end, building trees and then combining:

| height | three trees | combine and bind | what a root recipient saves |
|---|---|---|---|
| h12 | 30 ms | 124 ms | 19.7% |
| h14 | 266 ms | 1,116 ms | 19.2% |
| h16 | 2,358 ms | 10,030 ms | 19.0% |

**About a fifth, not a bypass.** Stable across heights, and smaller still with faster multiplication, because better algorithms flatten the tree's top-heaviness and leave the combine dominating even more.

### 4.5 And part of what remains is yours alone

`cantor_t` is derived from the recipient's own `previous_event_id`. A discloser cannot precompute it, cannot share it between recipients, and cannot reuse it on a second hop. Every hop by every person carries a term nobody else can supply.

### 4.6 So what a handed root really is

A real saving of about a fifth on a real cost, to a recipient who already owns hardware of the discloser's class. `region_n` at h47 is on the order of petabytes; being handed the roots does not put that on a laptop.

The answer to the question in §3.1, restated: **the root is the right root, and it still does not make the hop cheap.**

---

## 5. HOSAKA works, and it shows what the rules actually forbid

Everything above reads like an argument that nobody can be paid to move anybody. HOSAKA has been selling exactly that for months, including sidesteps, which §6.4 says cannot be sold at all.

Both are true, and the resolution is the important part of this document.

**§6.4 forbids resale. It does not forbid service.**

HOSAKA never sells one proof to many people. It takes your chain position, computes a proof seeded to you, and hands you a proof only you can use. Every customer's job is unique and priced in full. §6.4 is satisfied to the letter: every traveller pays in full. The only thing that changes is the currency, sats instead of your own electricity.

The mistake to avoid is reading "this work product cannot be inherited" as "nobody can be paid to do this work." They are different sentences.

**And the cost is the product, not an objection.** Nobody pays a compute service because the work is cheap. The Θ(2^h) combine that makes root-selling disappointing is exactly what makes a compute service viable. If the work were easy there would be no customers.

**Seeding is what keeps this market honest.** Because no proof can be resold, no operator can compute the world once and rent the archive forever. Every job is fresh work, so a competitor enters with hardware rather than having to catch up on an accumulated secret. The moat is capital that depreciates, not knowledge that compounds. That is a healthier market than the alternative, and the protocol produced it without anybody designing a market.

---

## 6. The three business shapes

| | movement service | root disclosure | holding |
|---|---|---|---|
| what it is | compute a traveller's proof for them | hand over a number | keep every root in a region |
| example | HOSAKA | one person helping another | §7.6, §7.8 |
| amortizes across customers | no | the tree build only, about 19% | fully, the keys are the product |
| per-customer cost | full, `Θ(2^h)` | still `Θ(2^h)` for the buyer | none once built |
| can a buyer leak it | nothing to leak | totally, one buyer can republish | totally |
| what it sells | access to hardware | a saving, to a peer with hardware | reading and writing at a place |
| capital | a cluster, which depreciates | storage | storage |

The pattern worth naming: **movement is a service and keys are an asset.** They want different business models and different defences. A movement service has no leak risk and no compounding asset. Holding compounds and leaks completely.

---

## 7. A worked example: the mountain

Here is the case that prompted this document.

You arrive at a hyperspace landfall near a city. The last sixteen kilometres are a wall, and every traveller who wants to get from the landfall to the city pays about three GPU-hours to sidestep it. You would like to compute that crossing once and charge a toll.

**As stated, this cannot work.** The last mile is a sidestep, sidestep proofs are seeded per-traveller, and there is no toll to collect because there is nothing transferable to sell. This is not an accident of the parameters; it is §6.14 doing its job.

**Two things that do work:**

*Run the crossing as a service.* Take a traveller's chain position, do their three GPU-hours on your hardware, hand them their proof. That is HOSAKA's shape, it is permitted, it is honest, and nothing leakable ever leaves your hands. What you own is a cluster, and you are renting it.

*Hold the destination and sell what holding buys.* Compute the region around the city and keep the trees. Now you can read and write at any height inside it (§7.8). That is a genuine asset with zero marginal cost per customer, and it is the thing you can build once and sell many times.

**But the second one leaks.** A region key is a number; one buyer can publish it and the asset is gone. A referral commission makes reselling more attractive than leaking for the marginal actor, but it does not stop the one defector, and it is self-undermining, because growing the buyer set is exactly what raises the chance that one of them defects. The construction that removes the risk instead of pricing it is to sell the *service* rather than the key: keep the root and encrypt or decrypt on request. You become a trusted party, but a competitive one, since anyone willing to do the work can undercut you.

**One coupling to notice before building any of this.** Whoever can make a place reachable is, as a free byproduct, whoever can read everything hidden there. Capital-intensive reachability selects for exactly the kind of actor the location encryption exists to resist. §6.4's seeding is the protocol's answer, and it is the reason the last mile cannot be capitalised away.

---

## 8. What was corrected, and when

Written 2026-09-16, from measurements taken the same day.

| where | was | is |
|---|---|---|
| §6.12 | a handed root costs "roughly 100 ms, at any height" | about a 19% saving, the rest `Θ(2^h)` with a per-traveller term |
| §7.8 | holding writes and derives keys "at once" | about 4.9 times faster, roughly two heights, still hours at h34 |
| §9.9 | a root is "about 86 × 2^h bits"; peak is "two levels live" | exactly `85 × 2^h` bits; peak is about 6.1 roots |
| §10 | sectors "fit into u32 systems" | a sector index needs 55 bits per axis |
| §13.2 | "storage-bound, not compute-bound" | capacity-bound on the ceiling, compute-bound beneath it by about 28 times |

Every one of these made the work sound cheaper or smaller than it is, which is the direction an author's optimism always points. The arithmetic is in §4 above and reproduces on any machine.
