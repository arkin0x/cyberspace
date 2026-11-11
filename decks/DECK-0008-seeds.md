# DECK-0008: Seeds

DECK: 0008
Title: Seeds
Status: Draft
Mandatory: no
Created: 2026-11-10
Last updated: 2026-11-10
Requires: `CYBERSPACE_V2.md` §2 (coordinates), §4.7 (region integers, for tending), §5.2 (terrain `K`), §5.9 and §5.10 (residues and the re-roll attempt, for tending), §7.2 (region keys), §7.6 (the bag), §7.7 (contents), §8.6 (its event) and §10 (decimal tag values); DECK-0003 (SNO, the output format, and its built-in palette); DECK-0004 §3 (chests); DECK-0006 §2.2 (lineage); NIP-01, NIP-13, NIP-18, NIP-31, NIP-70; Bitcoin block headers and BIP-113 (median time past)

## Abstract

**Seeds** are programs that grow in cyberspace. A **DNA** is a small program written in **SEEDO**, a language of genes and growth rules. A **seed** is one planting of a DNA at a coordinate, at a block height and at a scale, hidden in a bag like any other item. What grows from the seed is its **bloom**: every client computes the same bloom from the DNA, the coordinate and the Bitcoin blocks mined since the seed was planted, and draws it as a SNO object (DECK-0003). A bloom is never published. It grows one generation per day of blocks, its weather is the hashes of those blocks, and its soil, its **terroir**, is the terrain of the place it was planted (`CYBERSPACE_V2.md` §5.2). Two DNAs of one species can be **mixed** into a child DNA whose genes are drawn, half from each parent, by a block mined after the mix was committed. Anyone who has found a seed can **tend** it, giving it work that is counted as sunlight.

Planting pays once for how much a bloom may cost the people who grow it. A DNA declares caps on its vertices, its symbols and its generations, and publishing it is free. Each seed carries NIP-13 proof of work priced by the caps of the DNA it plants: one payment per planting (arkinox's ruling of 2026-11-10). After that, growing it costs nothing more than the CPU of the clients that draw it, which the caps bound. A mix commits to its child with proof of work of its own, at a fixed floor, so that breeding attempts are not free.

This DECK defines SEEDO completely enough for a second implementation, three event kinds (`3350`, a DNA; `3351`, a seed; `3352`, a tend), the clock, the weather and the terroir, the exact mix function, the caps and their price, and the shape of a tend. It writes down the Seed Garden prototype of 2026-11-09 and 2026-11-10 (§14) and arkinox's rulings of the same days. The price numbers and the tend's proof are provisional. Self-seeding and what sunlight does are open (§13).

**Defined here:**

| Thing | Value |
|---|---|
| The language | SEEDO, plain text: header lines, a genome, `let` lines, an axiom and growth rules, a parametric L-system driving an integer 3D turtle (§3, §5). "SEEDO" is a working name (§13, question 1) |
| A DNA | `kind 3350`, regular. Its id is its identity. Written (its text in `content`) or mixed (computed from two parents and a block). Declares its caps. A written DNA is free to publish; a mixed DNA carries NIP-13 work at the mix floor (§7, §8.1) |
| A seed | `kind 3351`, an item inside a bag or a chest, signed and protected like a shard. Carries NIP-13 work priced by its DNA's caps, once per planting (§7, §8.2) |
| A tend | `kind 3352`, regular, rooted on the bag that holds the seed, the seed named inside its seal (§8.3) |
| The clock | the block 6 below the tip. One generation per 144 blocks (§4.1) |
| Weather | the hash of the block that drives each generation, never the planted block's own (§4.3) |
| Terroir | terrain `K` and its four nibbles at the seed's scale (§4.4) |
| The bloom | a SNO payload computed by every reader, unit = the seed's scale (§5) |
| Reference implementation | `decks/seeds-reference.mjs`, the prototype's core with this DECK's changes |
| Vectors | `decks/seeds-vectors.json`, produced by `decks/seeds-vectors.mjs` (§11) |

---

## Terms

- **SEEDO:** the language a DNA is written in (§3).
- **DNA:** a definition: a genome, growth rules and declared caps, carried by a `kind 3350` event (§8.1). Publishing a DNA costs no work. A **written DNA** carries its SEEDO text in `content`. A **mixed DNA** has empty `content` and names two parent DNAs and a block; its text is computed (§6), and it carries work at the mix floor (§7).
- **Gene:** a named integer with two **alleles**, each a value and a mark of whether it is **dominant**, and a range (§3.3). What a gene contributes to growth is its **expressed** value.
- **Standard genes:** `size`, `hue`, `tone` and `opacity`. Every DNA has them, declared or not. The turtle applies the first three, and the bloom's payload carries the fourth (§3.3, §5.4, §5.5).
- **Seed:** one planting of a DNA: a `kind 3351` item that names a DNA, a coordinate, a planted height and a scale, and carries the work its DNA's caps price (§8.2).
- **Price:** the NIP-13 difficulty, in bits, that a DNA's caps call for (§7). A seed pays its DNA's price; a mixed DNA pays the mix floor.
- **Planted height:** the block height a seed states as its day 0. The **effective planted height** is that height after the clamp of §4.2.
- **Scale:** the seed's `u`, from `0` to `84`. One model unit of its bloom is `2^u` gibsons. The default is `0`, one gibson.
- **Bloom:** what grows from a seed, computed by every reader and never published. It may be a fern, a coral or a crystal; nothing in this DECK assumes a plant.
- **Clock height:** the height of the reader's best chain tip, minus 6 (§4.1).
- **Age:** the clock height minus the effective planted height, in blocks.
- **Generation:** one rewrite of the bloom's symbol string. Generation `k`, from 1, is driven by the block at the effective planted height plus `k × 144`.
- **Weather word:** a 32-bit word folded from a block hash (§4.3). **`W`** is one roll per generation for the whole bloom; **`w`** is one roll per symbol.
- **Terroir:** the terrain of the seed's coordinate at the seed's scale: `K` and the nibbles `n0` to `n3`, plus the plane `pl` (§4.4).
- **Symbol:** one letter or turtle character of a bloom's string, with up to four integer parameters and a **birth**, the generation that made it (§4.6).
- **Caps:** the three limits a DNA declares: vertices, symbols and generations (§7). Readers enforce them, and each planting pays for them.
- **Mix:** combining two DNAs into a child DNA. A mix is committed by publishing a mixed DNA; its **outcome block** is fixed by the commit and mined after it (§6).
- **Mother, father:** the two parents of a mix. The child takes the mother's rules and one allele of each gene from each parent.
- **Species:** two DNAs are of one species when they have the same rule alphabet and the same gene names (§3.9).
- **Sterile:** a DNA that cannot be a parent. A **sterile hybrid** is the child of two species, made only on request (§6.5).
- **Tend:** a `kind 3352` event that gives work to a seed. **Sunlight** is the amount of that work, counted in attempts (§9).
- **Attempt:** one unit of residue work: an aligned height-12 Cantor tree modulo a 61-bit prime, the unit of the hop's re-roll price (`CYBERSPACE_V2.md` §5.10).

---

## 1. Overview (non-normative)

| What | Kind | Where it lives | Who can read it |
|---|---|---|---|
| a DNA | `3350` | published on its own, or as an item in the bag (or chest) that holds the seeds planted from it | everyone, or whoever opens that bag |
| a seed | `3351` | inside a bag or a chest, inline or in a sealed entry | whoever opens the bag |
| a bloom | none | computed by every reader | whoever can read the seed and its DNA |
| a mix | `3350`, a mixed DNA | published on its own, or as an item in a bag | as for any DNA |
| a tend | `3352` | published on its own, rooted on the bag, the seed named inside its seal | everyone sees that the bag was tended; whoever opens the bag reads which seed |

A gardener writes a DNA in a workshop, previews it at any place and any block, and publishes it, which costs nothing. Anyone can then plant it: their client writes a seed naming the DNA, the place and the current clock block, mines the work the DNA's caps call for, and hides the seed in a bag at that place. Every client that opens the bag fetches the DNA and grows the bloom from the planted block to the clock height. Nothing more is published as the bloom grows. Each day of blocks rewrites it once, and between rewrites each new part stretches out over the day, so the bloom changes with every block.

Two gardeners whose DNAs are of one species can mix them. A mix is a mixed DNA event that names both parents and the committer's clock block. The outcome block is mined 36 blocks after that, and from then on every client computes the same child, which can be planted like any other DNA.

**Why seeds travel as code (non-normative).** The prototype's blooms reach 40 to 170 KB of SNO by day 30 (§14). A bloom published as geometry would be over a stock relay's event limit, and would have to be published again every block. The DNA that grows it is under 2 KB, is published once, and every client grows it locally.

---

## 2. Kinds (normative)

| Kind | Name | Class | Defined in |
|---|---|---|---|
| `3350` | DNA, written or mixed | regular (`1000..9999`): stored, never replaced | §8.1 |
| `3351` | seed | regular; an item inside a bag or a chest, never published on its own | §8.2 |
| `3352` | tend | regular | §8.3 |

**Why three kinds, and why a mix is a DNA (non-normative).** A mix needs a public commitment made before its outcome block, a price for each attempt, and an identity for the child it makes. A mixed DNA event is all three: it is published before the outcome block, it carries NIP-13 work at the mix floor, and its id is the child's identity. A separate commitment kind would need a second event for the child, with a second id, a second price and a rule tying the two together. With one kind, a seed names any DNA by id, written or mixed, and a reader dispatches on whether `content` is empty.

**Why regular kinds (non-normative).** A DNA's id is its identity: seeds, children and copies name it by id, and a mixed DNA's proof of work is in its id. An addressable DNA could be replaced under every seed that names it, which is what a DNA must never allow. A seed is an item in a bag, like a shard (`3330`) or a key item (`3340`), and items are regular. A tend is a record of work done, which nobody replaces.

**Why these numbers (non-normative).** They sit near the other Cyberspace item kinds (`3330`, `3333`, `3340`, `3341`). They were checked on 2026-11-10 against every kind this specification, its DECKs, ONOSENDAI, cyberspace-mcp and sno-core use; against the NIPs and the nostr registry of kinds (which lists `3302` to `3313` for another application, but nothing from `3314` to `3399`); and against what `relay.damus.io`, `nos.lol` and `relay.primal.net` hold. None of them uses `3350`, `3351` or `3352`. The nearer free-looking numbers are taken in practice: public relays hold `kind 3334` events from another application (as they hold `kind 33334`), and `kind 3338` events carrying image prompts.

---

## 3. SEEDO, the language (normative)

A DNA's text is SEEDO. This section says how a reader parses it. A text that breaks any rule of this section is **invalid**: a reader MUST NOT grow it, and a seed that names it is a seed that cannot grow (§8.2). A writer writes only what this section allows. The prototype accepts more than this section does in several places (§14), and those texts are invalid here.

An example, the prototype's fiddlehead (§11 has all six of its DNAs):

```
dna     fiddlehead
species fern
mutate  4
gene size    180  170  in 50..200  # standard gene: giant, recessive
gene hue     0!   0!   in 0..23    # standard gene: no rotation
gene curl    22   20   in 2..30    # species gene; ! marks dominant
gene span    7!   5    in 3..12
gene leaf    3    3    in 1..6
gene gap     4    3!   in 2..7

angle 8
let lean  = curl + n0 % 7          # terroir: fine texture adds coil
let reach = span + K / 4 - 2       # terroir: richer terrain, longer pinnae
let fan   = 55 + n1 * 2
axiom '(203) O(2) !(2) A(0)

A(k) if k < 27 -> '(171) F(gap) [ +(fan) P(reach - k/3) ] [ -(fan) P(reach - k/3) ] ^(lean) A(k+1)
^(a) if a > 0 -> ^(a - 2)          # coils relax daily: the frond unfurls
P(n) if n > 0 chance 92 -> '(173) F(2) [ +(55) '(174) L(leaf) ] [ -(55) '(174) L(leaf) ] &(3) P(n-1)
P(n) -> '(175) L(leaf+1)
```

### 3.1 Text, lines and comments

- **Size:** a written DNA's text is at most 8,192 bytes of UTF-8. A longer text is invalid. (A mixed DNA's computed text is not bounded by this rule, §6.6; a copy of it republished as a written DNA is.)
- The text MUST be well-formed Unicode: a text that carries an unpaired surrogate, which a JSON string can encode as an escape, is invalid. It is split into lines at every line feed (U+000A).
- **Comments:** on each line, everything from the first `#` to the end of the line is a comment and is removed, whatever it contains. This holds inside names too: `dna my#1` names the DNA `my`.
- **Whitespace** at the ends of a line means U+0009, U+000B, U+000C, U+000D and U+0020. Each line is trimmed of it at both ends after its comment is removed, so a CR before a line feed is dropped. An empty line is skipped. Inside a line, after trimming, the only whitespace is the space (U+0020) and the tab (U+0009).
- **Characters:** after its comment is removed and it is trimmed, a line MUST NOT contain a control character: U+0000 to U+0008, U+000A to U+001F, or U+007F to U+009F. A rule line, and a line of a known keyword other than `dna`, `seed` and `species`, MUST contain only printable ASCII (U+0020 to U+007E) and tabs. A name on a `dna` or `species` line, and an unknown line (§3.2), may hold any character except the control characters above and `#`: U+200B, U+202E and U+2028, for example, are allowed there.
- **No normalization:** a reader MUST NOT normalize the text, whether by Unicode normalization, by folding case or by replacing characters. The bytes as written decide the 8,192-byte count, the 64-code-point cut of a name and the payload hash (§5.5).
- **Rule lines:** a line that contains `->` is a rule (§3.7), whatever it begins with. It MUST contain `->` exactly once.
- **Keyword lines:** any other line begins with a keyword: its first run of characters up to whitespace. The **rest** of the line is what follows the keyword, trimmed. The known keywords are `seedo`, `dna` (or `seed`), `species`, `sterile`, `mutate`, `angle`, `width`, `color`, `planted`, `scale`, `gene`, `let` and `axiom`. A line whose first word is not a known keyword is an **unknown line**, and a reader ignores it (§3.2).
- Every known keyword except `gene`, `let` and `sterile` MAY appear at most once. `dna` and `seed` count as one keyword.
- A **whole number** in this section is an optional `-` followed by one or more decimal digits, with an absolute value of at most 1,000,000. Leading zeros are allowed.

### 3.2 Header lines

| Line | Meaning | Default |
|---|---|---|
| `seedo <n>` | The SEEDO revision the DNA is written in, a decimal from 1 with no sign and no leading zeros. A reader MUST reject a DNA whose revision is higher than the one it knows; this DECK defines revision 1 (below). | `1` |
| `dna <name>` | The DNA's name: the rest of the line, cut to its first 64 Unicode code points. `seed <name>` is read the same way (the prototype's first spelling). | `dna` |
| `species <label>` | A label for people, cut to 64 code points. It does not decide the species; §3.9 does. | empty |
| `sterile` | This DNA cannot be a parent (§6.5). The rest of the line is ignored. | not sterile |
| `mutate <n>` | The mutation rate in percent, a whole number, clamped to `0..100` (§6.4). | `0` |
| `angle <n>` | The turn, in whole degrees, of a turtle symbol written without a parameter (§5.2). A whole number. | `30` |
| `width <n>` | The width the turtle starts with and returns to on a bare `!` (§5.2). A whole number. | `2` |
| `color <n>` | The color the turtle starts with and returns to on a bare `'` (§5.2), a palette index. A whole number. | `7` |

**Unknown lines (normative).** A line that is not a rule line (it holds no `->`) and whose first word is not a known keyword is ignored: a reader does not read it, it never affects the bloom, its payload or its hash, and it does not count toward species (§3.9). It is still part of the text, so it counts toward the 8,192-byte limit, follows the rules of §3.1 for control characters, and is copied into a child's text like any other line (§6.6). Only whole unknown keyword lines are ignored. Rule lines, expressions, turtle symbols, gene lines and every known keyword stay strict, and a known keyword written in a form this section does not allow still makes the text invalid. An editor SHOULD warn its user about every unknown line, because a mistake that makes one is ignored rather than refused. Three such mistakes: a misspelled keyword (`mutat 4`); a keyword followed by a space that is not ASCII whitespace, such as a no-break space (U+00A0) or an ideographic space (U+3000), which joins `mutate`, the space and `4` into one unknown first word; and a rule typed without its arrow (`A if g < 3 A A`). In each case the DNA grows as if the line were not there: it mutates at rate 0, or has no such rule.

**The language revision (normative).** A later revision of SEEDO may add keywords. One that does not change any bloom's geometry or hash, such as `anim`, the motion of a whole bloom that the block-paced animation design expects to add, or notes and metadata for people, MAY be added without a new revision number, because a reader that ignores it still grows the identical bloom. A keyword that changes the geometry or the hash of any bloom that uses it MUST come with a new revision number, and a DNA that uses it MUST declare that revision with `seedo`. A reader rejects a revision it does not know, so a reader that accepts a DNA always grows exactly the bloom every other accepting reader grows. Three rules keep that true as keywords are added:

- **A DNA is read under the revision it declares.** A keyword that a later revision defines is an unknown line in a DNA that declares an earlier revision, or none. A reader that knows revision 2 therefore reads a revision-1 DNA exactly as a revision-1 reader does.
- **A keyword added without a new revision is read leniently.** A reader that knows such a keyword ignores, as an unknown line, a line of it that is malformed, repeated beyond what its definition allows, or holds characters its definition does not. Otherwise a reader that learned `note` or `anim` would reject a DNA that older readers accept, such as the vectors' DNA with a `note` line holding `é` (§11).
- **No keyword that may be ignored can hold `->`.** A line with `->` is always a rule line, so a future keyword that older readers must ignore can never contain it.

**Planting lines:** `planted <height>` (decimal digits only) and `scale <u>` (decimal digits only, `0` to `84`) name a planting, so that a SEEDO file can be grown on its own in a workshop or a test. A reader MUST check their form, and MUST ignore their values when it grows a seed: the seed's tags decide its planted height and scale (§8.2). A writer SHOULD NOT write them in a DNA event.

### 3.3 The genome

A gene line is:

```
gene <name> <allele> <allele> in <lo>..<hi>
```

- `<name>` is a name (§3.4) that is not taken, with one exception: each of the standard gene names `size`, `hue`, `tone` and `opacity` MAY be declared once.
- Each `<allele>` is a whole number, optionally followed directly by `!`, which marks it dominant.
- `<lo>` and `<hi>` are whole numbers with `lo ≤ hi`, written with `..` between them and no whitespace around it. The parts are separated by spaces or tabs, and `in` is lowercase.
- A declared standard gene's range is first narrowed to its standard bounds (the table below); if nothing is left, the text is invalid.
- Then, for every gene, standard or not, each allele's value is clamped to the gene's range: `gene leaf 0 9! in 1..6` holds the alleles `1` and `6!`.

**Standard genes.** Every DNA has the four standard genes. A standard gene that a DNA does not declare is **implicit**: both alleles hold its default value, neither is dominant, and its range is its default range.

| Gene | What the turtle does with it (§5.4) | Default value | Default range | Standard bounds |
|---|---|---|---|---|
| `size` | scales every length, width and size, in percent | `100` | `50..200` | `10..400` |
| `hue` | rotates the hue family of every palette color | `0` | `0..23` | `0..23` |
| `tone` | shifts every shade lighter (positive) or darker | `0` | `-4..4` | `-7..7` |
| `opacity` | sets how solid the whole bloom is drawn, in percent: the payload's `opacity` (§5.4, §5.5) | `100` | `100..100` | `10..100` |

So size and color are breedable on every DNA, and a DNA that never mentions them is neutral. Opacity is breedable from the first DNA in a lineage that declares it, and a DNA that never mentions it is fully solid: its payload carries no `opacity`, and its hash is the hash it would have if `opacity` did not exist (§5.5).

**The genome's order** is `size`, `hue` and `tone`, in that order, then the DNA's own genes in the order their lines appear, then `opacity`. Mixing (§6.4) walks genes in this order. A declared standard gene takes its place in this order wherever its line stands in the text.

**Why `opacity` is last (non-normative).** `opacity` was added on 2026-11-11, after the first three standard genes and after mixing had test vectors (§11). Mixing draws each gene's word from the mix word and the gene's index alone (§6.4), so no gene's draw takes anything from another gene's. Placing `opacity` after every one of the DNA's own genes leaves every other gene at the index it had before, with the same word, the same alleles and the same mutation, so every existing mix makes exactly the child it made before. Placed fourth, it would have moved every species gene one index along and changed every mix.

**Why its default range is `100..100` (non-normative).** The default range is what an undeclared `opacity` brings to a mix: the child's range is the wider of the parents' two (§6.4), and mutation moves an allele only inside that range. With `100..100`, two parents that never mention opacity can only have a fully solid child, so transparency never appears in a lineage that nobody bred it into, and no existing mix or bloom changes. A wider default, such as `10..100`, would let mutation make a translucent child of two solid parents in any mix whose rate is not 0, which would change existing children and their payloads. With `100..100`, the range of a child of a solid parent and a parent that declares `opacity` runs from the declaring parent's low end to 100, so that parent alone decides how far its descendants can fade, and each child can carry the solid allele back.

**Why its bounds are `10..100` (non-normative).** 100 is fully solid, the way every bloom was drawn before. DECK-0003 §1.11 draws any opacity from 1 to 9 at 10, so 10 is the faintest opacity that every reader draws as written, and a bound at 10 means that a bloom never carries a value that a reader repairs.

**Opacity and revision 1 (non-normative).** `opacity` is part of SEEDO revision 1, added while this DECK is a Draft. Before it was added, `opacity` was an ordinary name: a text could declare a species gene of that name, which changed nothing in its bloom, or use it for a `let` or a rule parameter. Under this text, such a gene line declares the standard gene, so the bloom carries the payload's `opacity` and its hash changes, and such a `let` or rule parameter makes the text invalid, because the name is taken (§3.4).

**Expression.** A gene's expressed value is the value of its dominant allele when exactly one allele is dominant. Otherwise, when both or neither are dominant, it is `floor((a + b) / 2)`, rounding toward minus infinity, so the two blend.

### 3.4 Names and expressions

**Names.** A name is a letter or `_` followed by letters, digits or `_` (ASCII), and is case-sensitive. The names in use are:

| Name | Value |
|---|---|
| `w` | the weather roll of the symbol being rewritten, `0..99` (§4.3) |
| `W` | the weather roll of the generation, `0..99`, the same for every symbol of the bloom (§4.3) |
| `g` | the generation being made, from 1 |
| `K` | terrain `K` at the seed's scale, `0..16` (§4.4) |
| `n0`, `n1`, `n2`, `n3` | the terroir's four nibbles, finest to coarsest, each `0..15` (§4.4) |
| `pl` | the seed's plane, `0` or `1` |
| a gene's name | its expressed value (§3.3) |
| a `let`'s name | its value (§3.5) |
| a rule parameter | the matched symbol's parameter (§3.7) |

**Which names are in use where.** Every built-in name and the four standard genes are in use in every expression. A `let` expression also sees every gene and every `let` declared on an earlier line (§3.5). The axiom and every rule see every gene and every `let` of the text, on whatever line it is declared. A rule's own parameters are in use in its condition, its chance and its successor, and nowhere else.

A name is **taken** when it is one of the nine built-in names above, one of the keywords `and`, `or`, `not`, `if`, `chance` and `in`, a standard gene's name, or the name of a gene or a `let` already declared. A rule parameter MUST NOT be a taken name, nor the name of a gene or a `let` declared on any line, before or after the rule. The parameters of one rule MUST be distinct.

**Grammar.** An expression is read as tokens: a run of decimal digits, a name, or one of `==`, `!=`, `<=`, `>=`, `<`, `>`, `+`, `-`, `*`, `/`, `%`, `(`, `)`. Whitespace may stand between tokens. Any other character makes the text invalid. The grammar, loosest first:

```
expr  := and ( "or" and )*
and   := not ( "and" not )*
not   := "not" not | cmp
cmp   := sum [ ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) sum ]
sum   := term ( ( "+" | "-" ) term )*
term  := unary ( ( "*" | "/" | "%" ) unary )*
unary := "-" unary | atom
atom  := "(" expr ")" | digits | name
```

At most one comparison stands at one level: `1 < 2 < 3` is invalid, and `(1 < 2) < 3` is valid. A name that is not in use where the expression stands makes the text invalid. Every expression MUST be read to its last token.

**Size and depth (normative).** Read as a tree, an expression has one **node** for each literal, each name and each operator: every binary operator, every comparison, `and`, `or`, `not` and unary `-`. Parentheses are not nodes. A literal or a name has **depth** 1, an operator has depth one more than its deepest operand, and a pair of parentheses adds one to the depth of what it holds. An expression MUST have at most 64 nodes and a depth of at most 16; otherwise the text is invalid. A sum of 16 terms (`1 + 1 + ... + 1`, depth 16, 31 nodes) is valid and a sum of 17 is not, because the operators are left-associative. `1` inside 15 pairs of parentheses (one node, depth 16) is valid, and inside 16 pairs it is not. The rule applies to every expression, in `let` lines, conditions, chances and argument lists alike.

A parser of this grammar recurses only through `(`, unary `-` and `not`, and each of those adds at least one to the depth. A reader therefore refuses a text as soon as it nests past 16 of them, before its stack grows, so a text of a few kilobytes of parentheses costs it nothing, and every reader agrees on which texts are valid whatever its own stack allows.

**Integer semantics.** Every value is an integer. Let `clamp(v)` be `v` limited to `-1,000,000..1,000,000`.

| Operation | Result |
|---|---|
| a literal | `clamp` of its decimal value |
| `a + b`, `a - b`, `a * b` | `clamp` of the exact result |
| `a / b` | `0` when `b = 0`; otherwise the exact quotient truncated toward zero: `-7 / 2 = -3` |
| `a % b` | `0` when `b = 0`; otherwise the remainder that is at least `0` and less than the absolute value of `b`: `-7 % 3 = 2`, `7 % -3 = 1` |
| `-a` | the negation of `a` |
| a comparison | `1` when it holds, else `0` |
| `a and b`, `a or b`, `not a` | `1` or `0`, reading any nonzero value as true |

Every value an expression can produce lies within `-1,000,000..1,000,000`, so 64-bit integers hold every intermediate result of this section. An expression has no side effects, so the order in which `and` and `or` evaluate their operands does not matter.

### 3.5 `let` lines

```
let <name> = <expression>
```

`<name>` is a name that is not taken. The expression MAY read `K`, `n0` to `n3`, `pl`, the four standard genes (declared anywhere, or implicit), every other gene declared on an earlier line, and every `let` declared on an earlier line. It MUST NOT read `w`, `W` or `g`. A reader evaluates every `let` once per seed, in the order of their lines, after the genes are expressed (§4.5).

### 3.6 Symbol strings and the axiom

A **symbol string** is a sequence of symbols, with spaces or tabs allowed between them. A symbol is one ASCII letter (`A` to `Z`, `a` to `z`) or one of the turtle characters `+ - & ^ \ / | [ ] ! '`. Any other character makes the text invalid.

A symbol MAY be followed directly, with no whitespace, by an argument list: `(`, up to four expressions separated by commas, `)`. Commas inside nested parentheses do not separate. `()` with only whitespace inside is no arguments. An empty argument (`F(1,,2)`, `F(1,)`) or a fifth argument makes the text invalid.

```
axiom <symbol string>
```

The axiom is the bloom's string at generation 0. There MUST be exactly one `axiom` line. Its arguments are evaluated once per seed with `w`, `W` and `g` all `0`, and may read every name in use (§4.5). The axiom MUST hold at most as many symbols as the DNA's symbol cap (§7); a DNA whose axiom is longer is invalid. Together with the symbol cap of §4.6, this keeps every string of every generation within the cap.

### 3.7 Rules

A rule line has the form:

```
<symbol>[(<parameters>)] [if <condition>] [chance <expression>] -> <successor>
```

- The **head** is the first character of the line after leading whitespace, and MUST be a symbol (§3.6): a rule can rewrite a letter or a turtle character.
- The parameters, if present, are directly after the head, inside parentheses with no parenthesis within: names separated by commas, with spaces or tabs allowed around each name. Every part between commas MUST be one name: `A(k,)` and `A(k,,m)` are invalid. Their count is the rule's **arity**, at most 4. `X()`, with nothing or only spaces and tabs inside, has arity 0.
- What follows, up to `->`, is split at the first whole word `chance`: the five letters `chance` with no letter, digit or `_` immediately before or after them. The part after it is the chance expression. The part before MUST be empty, or `if` followed by a space or tab and the condition expression. `chance50` and `chancey` are names, not the keyword.
- The **successor** is the symbol string after `->`. It MAY be empty, which deletes the symbol, and it MUST hold at most 64 symbols.
- **Node budgets:** the conditions and chances of all the rules that share one head and one arity MUST hold at most 256 nodes in all (§3.4), and the conditions and chances of every rule of the DNA at most 1,024.
- A DNA has at most 40 rules.

Conditions, chances and the successor's arguments may read the rule's parameters and every name in use (§3.4).

**Matching (normative).** When a generation rewrites a symbol with character `c` and `p` parameters, the reader considers, in the order of their lines, the rules whose head is `c` and whose arity is `p`. It binds the rule's parameters to the symbol's parameters, in order. The first rule whose condition is absent or nonzero, and whose chance is absent or greater than the symbol's `w`, applies. A symbol for which no rule applies is copied unchanged.

### 3.8 Fixed limits

These limits belong to the language and are not priced.

| Limit | Value | Breaking it |
|---|---|---|
| a written DNA's text | 8,192 bytes of UTF-8 (§3.1) | invalid |
| rules | 40 (§3.7) | invalid |
| parameters per symbol | 4 (§3.6, §3.7) | invalid |
| symbols in one successor | 64 (§3.7) | invalid |
| an expression | 64 nodes and a depth of 16 (§3.4) | invalid |
| the conditions and chances of the rules of one head and arity | 256 nodes in all (§3.7) | invalid |
| the conditions and chances of every rule of the DNA | 1,024 nodes in all (§3.7) | invalid |
| the axiom | at most the symbol cap (§3.6, §7) | invalid |
| values | `-1,000,000..1,000,000` (§3.4) | clamped |
| the turtle stack | 64 states (§5.2) | a push beyond it is dropped |
| positions | 64 model units from the origin on each axis (§5.2), the bound DECK-0003 §1.8 sets for publishers | clamped |

The validity limits bound the work of one symbol step: matching evaluates at most the 256 condition and chance nodes of the symbol's head and arity, and each symbol written evaluates at most four arguments of 64 nodes. The priced caps (§7) bound how many steps there are. The two node budgets are provisional (2026-11-10); the six example DNAs use at most 81 condition and chance nodes in all.

### 3.9 Species

A DNA's **alphabet** is the set of pairs (character, count) made of: the head and arity of every rule, letter or turtle character; and every letter (not turtle character) in the axiom and in every successor, with its number of arguments. Its **gene names** are the names of its genome, standard genes included.

Two DNAs are **of one species** when their alphabets are equal and their sets of gene names are equal. The `species` line does not count. Two DNAs of one species can differ in their rules, their genes' values and ranges, their lets and their header lines.

---

## 4. Growth (normative)

### 4.1 The clock, the age and the generation

- A reader's **clock height** `c` is the height of its best chain's tip minus 6. Reading 6 blocks back keeps a bloom from changing when the last blocks are replaced: the relays and clients of Cyberspace treat a reorganization deeper than 6 blocks as out of scope.
- A seed's **age** is `c - P`, where `P` is the effective planted height (§4.2).
- One generation takes `N = 144` blocks, about one day.
- The bloom's **generation** is `g = min(floor(age / N), G)` when `age ≥ 0`, and `0` otherwise, where `G` is the DNA's generation cap (§7).
- Generation `k`, for `k` from 1 to `g`, is driven by the block at height `P + k × N`. The planted block's own hash is never read: day 0 is the planted block, and the weather starts after it. Because `k × N ≤ age`, every driving block is at most the clock height, so it is at least 6 blocks deep.

A reader needs the hash of every driving block. A reader that lacks one draws the latest generation it can compute and SHOULD say that it is behind. A seed whose planted height the clock has not reached, or whose planted height is not yet settled (§4.2), is drawn at generation 0, as its axiom.

### 4.2 The planted height and the clamp

A seed states its planted height in its `planted` tag (§8.2). A writer MUST state the clock height at the moment it plants. A reader computes the **effective planted height** from the seed event's own `created_at`, with `MARGIN = 7200` seconds:

- The **header time** of a block is its header's `time` field. Its **median time past**, `MTP(h)`, is the median of the header times of blocks `h - 10` to `h`, as BIP-113 defines it. `MTP` never decreases with height, and every block's header time is greater than the `MTP` of the block before it.
- The planted height is **settled** once `MTP(c) > created_at + MARGIN`, where `c` is the reader's clock height. From then on no block above `c` can have a header time at or below `created_at + MARGIN`, so the two heights below are the same for every reader, however far its chain reaches.
- `E` is the highest height whose header time is at most `created_at - MARGIN`, and `F` is the highest height whose header time is at most `created_at + MARGIN`. Header times are not monotonic: blocks 970,444 and 970,445 run backwards, for one, so a reader MUST NOT stop at the first block whose header time is too late. **Finding them (non-normative):** every block whose header time is at most `t` has `MTP(h - 1) < t`, so a reader can binary-search for the highest height `h*` with `MTP(h*) < t`, since `MTP` never decreases, and then look down from `h* + 1` to `h* - 10`: `MTP(h*) < t` means at least six of blocks `h* - 10` to `h*` have header times at or below `t`, so the answer is among them.
- A reader that lacks a header it needs MUST NOT step over it: the height is not settled for that reader until it has the header.
- The effective planted height is `P = min(max(planted, E), F)`. If no block qualifies for `E`, `E` does not raise `P`. If no block qualifies for `F` (a `created_at` more than two hours before the first block), the seed cannot grow, and a mixed DNA with such a `created_at` is invalid.
- Until the planted height is settled, the reader draws the seed at generation 0. Settling takes about four hours of blocks (the margin, then the hour by which `MTP` lags the tip, then the 6 blocks of the clock), and the first generation comes 144 blocks after the planted block, so an honest seed looks the same either way.

- **Why a floor (non-normative).** A planter who could state an old planted height would know the weather of every generation up to the present, and could shop for the height that grows the bloom it wants. `E` lets a seed's planted height be no older than about two hours before the time the seed itself states. The margin is two hours because a block's header time may run up to two hours ahead of the time it was mined, so a block whose header time is two hours before `created_at` certainly existed when the seed was signed, if `created_at` is true. An honest planter writes the clock block, about 6 blocks below the tip, while `E` lies about 12 blocks below it, so an honest seed is almost never raised. When it is, in an hour of slow blocks, every reader raises it the same way.
- **Why a ceiling (non-normative).** `F` keeps a seed from stating a planted height far after its own time. Without it, a planter could sign seeds today for many heights to come and keep whichever one grows best (§12).
- **What the clamp cannot do.** `created_at` is whatever the signer writes. A planter who also backdates `created_at` is not clamped. §12 says what that buys.
- **Moving a seed replants it, for an honest `created_at`.** A client that moves a seed writes a new event at the new `C`, with a new `created_at` (DECK-0006 §2.2). It is a new planting and needs new work: the move keeps the seed's other tags but mines its `nonce` again (§7). The clamp then raises the effective planted height to about the time of the move, so the moved seed starts again from day 0, and a seed cannot be grown in one place and moved, with its age, to the soil that suits the weather that came. A mover who backdates the new event's `created_at` escapes this as a backdating planter does.

### 4.3 Weather

**The mixer.** `lowbias32(x)`, on an unsigned 32-bit `x`, with every product taken modulo `2^32` (in JavaScript, with `Math.imul`, since a plain `*` loses the low bits once a product passes `2^53`):

```
x = x XOR (x >> 16);  x = x × 0x7feb352d
x = x XOR (x >> 15);  x = x × 0x846ca68b
x = x XOR (x >> 16)
```

**The weather word of a block.** The block's hash is written as 64 lowercase hex characters in the order block explorers and Bitcoin Core's RPC display it (the byte-reversed double SHA-256 of the header, so that it begins with zeros). With `word_i` the unsigned 32-bit integer of hex characters `8i` to `8i + 7`:

```
s = 0x811c9dc5
for i in 0..7:  s = lowbias32(s XOR word_i)
word = s
```

**The rolls.** For generation `k`, with `word` the weather word of its driving block:

- `W = lowbias32(word XOR 0x5bd1e995) mod 100`, one roll for the whole bloom.
- `w` for the symbol at index `i` of the string being rewritten (from 0) is `lowbias32(word XOR ((i + 1) × 0x9E3779B1 mod 2^32)) mod 100`.

Weather belongs to the block, not to the place: two seeds planted at the same height see the same weather, and differ by their DNA and their terroir.

### 4.4 Terroir

Terroir is terrain `K` (`CYBERSPACE_V2.md` §5.2) measured at the seed's scale `u`. For each `b` in `[3, 7, 9, 11]`, in order, with `bits = b + u`:

1. Align the seed's coordinate `(x, y, z, plane)` to the cell of width `2^bits` on each axis: `bx = (x >> bits) << bits`, and the same for `y` and `z`.
2. `cell = xyz_to_coord(bx, by, bz, plane)`, encoded as exactly 32 big-endian bytes.
3. When `u = 0`: `nibble = SHA256("CYBERSPACE_TERRAIN_K_V2" || byte(bits) || cell)[0] & 0x0F`. When `u > 0`: `nibble = SHA256("CYBERSPACE_SEED_TERROIR_V1" || byte(u) || byte(bits) || cell)[0] & 0x0F`. The domain strings are ASCII, and `byte(n)` is one unsigned byte.

`n0` to `n3` are the four nibbles in order, finest to coarsest. `K` is the number of 1 bits in `(n0 << 12) | (n1 << 8) | (n2 << 4) | n3`. `pl` is the plane bit.

At `u = 0` this is exactly `CYBERSPACE_V2.md` §5.2, so a bloom's `K` is the `K` a hop to its coordinate pays: for the destination `(4104, 0, 0)` on plane 0 of `CYBERSPACE_V2.md` §5.7, the nibbles are `0, 15, 15, 13` and `K = 11`. Above `u = 0` the cells are `2^u` times wider. The domain differs from terrain `K`'s, and the preimage carries `byte(u)`, because the cells repeat across scales: the cell that `n2` reads at scale 1 (`bits = 10`) is the cell that `n1` reads at scale 3. Without `byte(u)` the two nibbles would be equal, and so would those of terrain `K` and of a seed at another scale.

At very large scales the cells cover the whole axis. A cell of `bits ≥ 85` aligns every coordinate to 0, so from `u = 74` the coarsest nibble `n3` is the same everywhere on a plane, and from `u = 82` all four are, and `K` then depends only on the plane and the scale.

**Why terrain (non-normative).** At scale `2^0` a bloom spans tens of gibsons, so it covers several of the finest cells (8 gibsons) inside one coarse cell (2,048 gibsons): seeds planted near each other share their coarse soil and differ in fine texture. Terroir ties the bloom to the same landscape that sets the cost of a hop. A reader computes it once per seed, with four SHA-256 calls.

### 4.5 The environment

Once per seed, a reader builds the environment: `K`, `n0` to `n3` and `pl` from §4.4; every gene's expressed value (§3.3); then every `let`, in order (§3.5). The axiom's arguments are then evaluated in it, with `w`, `W` and `g` all `0`, and every axiom symbol has birth `0`.

### 4.6 One generation

Generation `k` rewrites the string of generation `k - 1` from first symbol to last, with `g = k`, `W` and each symbol's `w` from §4.3:

1. For the symbol at index `i`, find the rule that applies (§3.7). If none does, copy the symbol unchanged, with its birth.
2. Otherwise, **the symbol cap:** let `out` be the number of symbols written so far in this generation, `s` the length of the rule's successor and `r` the number of symbols after index `i` in the string being read. If `out + s + r` is greater than the DNA's symbol cap (§7), copy this symbol unchanged and copy every later symbol of this generation unchanged without matching any rule. The next generation tries again from its first symbol.
3. Otherwise write the successor's symbols in order. Each argument is evaluated in the environment, with the rule's parameters bound and with `w`, `W` and `g` as above, and becomes that symbol's parameter.
4. **Birth:** every written symbol has birth `k`, except the first symbol of the successor whose character equals the character of the symbol being rewritten, which keeps that symbol's birth.

### 4.7 Growing between generations

A bloom does not jump once a day. Every symbol remembers its birth, and in drawing (§5) a symbol of birth `b` is grown by the fraction `f(b) / N`, where, with `a = max(0, age)`:

```
f(b) = N                              when b = 0
f(b) = min(N, max(0, a - b × N))      otherwise
```

A symbol made by generation `b` appears at length 0 at the block that drives generation `b`, and reaches its full length `N` blocks later. Because the first successor of a symbol's own character inherits its birth (§4.6, step 4), a rewrite never shrinks what has already grown. Lengths and sizes grow (§5.3); widths, angles and colors do not.

**Why this is normative (non-normative).** The prototype showed that one rewrite a day reads as a jump: the largest single-block change in a bloom's height was 3.6 to 7.0 percent of its height at day 30. With this rule it fell to 0.3 to 0.7 percent for most DNAs, and the bloom changes at every block while staying a pure function of public data. That is what makes block time read as growth, so every reader does it.

---

## 5. Drawing the bloom (normative)

A reader draws the string of generation `g` with a turtle, at the age of §4.1, and emits a SNO payload (DECK-0003). All arithmetic is on integers.

### 5.1 Fixed-point arithmetic

| Name | Definition |
|---|---|
| `ONE` | `16384`, fixed-point 1.0 for directions |
| `TICK` | `120` SNO ticks per model unit (DECK-0003 §1.2). Positions are in ticks |
| `STEP` | `12` ticks, a tenth of a unit: one SEEDO length step |
| `R` | `64 × TICK = 7680` ticks, the position bound |
| `fdiv(a, b)` | `a / b` rounded toward minus infinity. Note: this differs from expression division (§3.4), which truncates toward zero |
| `fx(a)` | `fdiv(a + 8192, ONE)`: a fixed-point product brought back to ticks, rounding half up |
| `isin(d)` | for whole degrees: `d = ((d mod 360) + 360) mod 360`; then `SIN[d]` for `d ≤ 90`, `SIN[180 - d]` for `d ≤ 180`, `-SIN[d - 180]` for `d ≤ 270`, and `-SIN[360 - d]` otherwise |
| `icos(d)` | `isin(d + 90)` |
| `isqrt(n)` | the largest integer whose square is at most `n`; `0` for `n ≤ 0` |
| `norm(v)` | with `l = isqrt(v·v)`, or `1` if that is 0: `[fdiv(v0 × ONE, l), fdiv(v1 × ONE, l), fdiv(v2 × ONE, l)]` |
| `cross(a, b)` | `[fdiv(a1 b2 - a2 b1, ONE), fdiv(a2 b0 - a0 b2, ONE), fdiv(a0 b1 - a1 b0, ONE)]` |
| `rot(a, b, d)` | with `c = icos(d)` and `s = isin(d)`, returns the pair `fx(a × c + b × s)` and `fx(b × c - a × s)`, component by component |
| `ortho()` | `H = norm(H)`; `t = H·L`; `L = norm(L - fdiv(t × H, ONE²))` component by component; `U = cross(H, L)` |
| `clampR(v)` | `v` limited to `-R..R` |

`SIN` is a fixed table, part of the language and never computed: `SIN[d]` is `sin(d°) × 16384`, rounded, for `d` from 0 to 90:

```
0,286,572,857,1143,1428,1713,1997,2280,2563,2845,3126,3406,3686,3964,4240,4516,4790,5063,5334,
5604,5872,6138,6402,6664,6924,7182,7438,7692,7943,8192,8438,8682,8923,9162,9397,9630,9860,10087,
10311,10531,10749,10963,11174,11381,11585,11786,11982,12176,12365,12551,12733,12911,13085,13255,
13421,13583,13741,13894,14044,14189,14330,14466,14598,14726,14849,14968,15082,15191,15296,15396,
15491,15582,15668,15749,15826,15897,15964,16026,16083,16135,16182,16225,16262,16294,16322,16344,
16362,16374,16382,16384
```

Every intermediate value of this section fits in a signed 64-bit integer: the largest are the projections in `ortho()` and in tropism (§5.2), products of a dot product and a direction, below `2^43`. A port MUST NOT use 32-bit integers.

### 5.2 The turtle

The turtle starts at position `(0, 0, 0)` in ticks, with heading `H = [0, ONE, 0]` (up, `+Y`), left `L = [-ONE, 0, 0]` and up-vector `U = [0, 0, ONE]`, width = the DNA's `width` and color = the DNA's `color`. `SIZE = min(400, max(10, size))`, with `size` the expressed standard gene. `a` is a symbol's first parameter; the others are ignored. "Default" means the symbol has no parameters.

| Symbol | Action |
|---|---|
| `F` | Move forward and draw a segment (§5.3). Length step `a`, default `10` |
| `f` | Move forward without drawing. Length as for `F` |
| `+`, `-` | Turn: `(H, L) = rot(H, L, d)`, then `ortho()`. `d = a` (default `angle`) for `+`, `-d` for `-` |
| `&`, `^` | Pitch: `(H, U) = rot(H, U, -d)`, then `ortho()`. `d = a` (default `angle`) for `&`, `-d` for `^` |
| `/`, `\` | Roll: `(L, U) = rot(L, U, d)`, then `ortho()`. `d = a` (default `angle`) for `/`, `-d` for `\` |
| `\|` | Turn around: `(H, L) = rot(H, L, 180)`, then `ortho()` |
| `T` | Tropism (below). Degrees `a`, default `5` |
| `[` | Push position, `H`, `L`, `U`, width and color, if the stack holds fewer than 64 states; otherwise do nothing |
| `]` | Pop them, if the stack is not empty; otherwise do nothing |
| `!` | Set width to `a`, default the DNA's `width` |
| `'` | Set color to `a`, default the DNA's `color` |
| `L` | Draw a leaf (§5.3). Size step `a`, default `3` |
| `O` | Draw a bead (§5.3). Radius step `a`, default `2` |
| any other letter | Nothing. Letters are free for rules to use as state |

**Tropism.** With `deg = a` (default 5): the target is `D = [0, -ONE, 0]` (down) when `deg ≥ 0` and `[0, ONE, 0]` (up) otherwise, and `dd = |deg| mod 360`. Let `t = D·H` and `P = D - fdiv(t × H, ONE²)` component by component. If `P·P < 400²`, do nothing. Otherwise `Pn = norm(P)`, `H = fx(H × icos(dd) + Pn × isin(dd))` component by component, then `ortho()`.

Note: an unmatched `[` beyond the 64th is dropped while its `]` still pops, so a DNA that nests deeper than 64 draws with the wrong states. That is deterministic, and a writer avoids it.

### 5.3 Geometry

A **vertex** at `(x, y, z)` stores `(clampR(x), clampR(y), clampR(z))` and the painted current color (§5.4). The **vertex cap** is the DNA's (§7): a primitive that would bring the vertex count above it is skipped, whole, and the turtle still moves.

- **`F` and `f`.** `len = fdiv(min(100, max(0, a)) × STEP × f(b) × SIZE, N × 100)`, with `f(b)` from §4.7. If `len = 0`, do nothing at all. Otherwise the new position is `p + fx(H × len)`, component by component. For `F`, with `wd = fdiv(min(50, max(0, width)) × STEP × SIZE, 200)`: if `wd > 0` and 6 more vertices fit under the cap, write a **ring** at the old position, then a ring at the new one (unclamped), and the 6 faces `[r0_j, r0_k, r1_k]` and `[r0_j, r1_k, r1_j]` for `j` = 0, 1, 2 and `k = (j + 1) mod 3`. Then the position becomes the new position, clamped with `clampR`.
- **A ring** of width `wd` at `(x, y, z)` is 3 vertices, one for each `(cx, cy)` in `[(0, 16384), (-14189, -8192), (14189, -8192)]` (the directions 90, 210 and 330 degrees): `x + fdiv((L0 × cx + U0 × cy) × wd, ONE²)`, and the same for `y` with `L1`, `U1` and for `z` with `L2`, `U2`.
- **`L`, a leaf.** `sz = fdiv(min(50, max(0, a)) × STEP × f(b) × SIZE, N × 100)`. If `sz = 0`, or 4 more vertices do not fit, do nothing. Otherwise, with `h2 = fdiv(sz, 2)` and `q = fdiv(sz, 3)`, write the vertices `A = p`, `B = p + fx(H × h2 + L × q)`, `C = p + fx(H × sz)`, `D = p + fx(H × h2 - L × q)` and the faces `[A, B, C]` and `[A, C, D]`. The turtle does not move.
- **`O`, a bead.** `r = fdiv(min(50, max(0, a)) × STEP × f(b) × SIZE, N × 100)`. If `r = 0`, or 6 more vertices do not fit, do nothing. Otherwise write, in this order, `xp = p + (r, 0, 0)`, `xn = p - (r, 0, 0)`, `yp = p + (0, r, 0)`, `yn = p - (0, r, 0)`, `zp = p + (0, 0, r)`, `zn = p - (0, 0, r)`, and the 8 faces `[xp, yp, zp]`, `[yp, xn, zp]`, `[xn, yn, zp]`, `[yn, xp, zp]`, `[yp, xp, zn]`, `[xn, yp, zn]`, `[yn, xn, zn]`, `[xp, yn, zn]`. The turtle does not move.

### 5.4 Colors and the standard genes

Colors are indices into DECK-0003's built-in palette, `cyberspace-neon-256`, whose first 192 entries are 24 hue families of 8 shades (`family × 8 + shade`). With `hue' = ((hue mod 24) + 24) mod 24` and `tone` the expressed standard genes, a vertex's color is the **painted** current color:

```
c = min(255, max(0, color))
if c ≥ 192:  index = c                      # steels and signature colors are not rotated
else:        shade = min(7, max(0, (c mod 8) + tone))
             index = ((floor(c / 8) + hue') mod 24) × 8 + shade
```

`size` scales lengths, leaf sizes, bead radii and widths through `SIZE` (§5.2, §5.3).

`opacity` changes no vertex, color or face. Its expressed value is how solid the whole bloom is drawn, in percent, and the payload carries it as DECK-0003's `opacity` (§1.11) when it is below 100 (§5.5). A reader draws the bloom as it draws any SNO object with that opacity. The standard bounds keep the expressed value within `10..100`: both alleles lie inside the gene's range, the range lies inside the bounds, and the expressed value is one allele or the floor of their mean.

**Why one opacity for the whole bloom (non-normative).** A bloom is one SNO object, and SNO has one opacity per object, never per face or per vertex: DECK-0003 §1.11 explains why translucency per face would ask every reader to sort an object's triangles every frame. arkinox ruled on 2026-11-11 that blooms get opacity for the whole bloom as a breedable trait, aimed first at crystals, and no transparency per part.

### 5.5 Emission to SNO

The bloom is a SNO payload (DECK-0003 §1.1) written exactly as follows, in this key order: `v`, `name`, `unit`, `extent` (only when it is not 8), `mode`, `vertices`, `ticks` (only when present), `colors`, `faces`, `opacity` (only when it is below 100). This is the order of DECK-0003 §1.1's table, which places `opacity` after `faces` and `facecolors`. A bloom has no `facecolors`.

- `v` is `2`. `name` is the DNA's name, cut to 64 code points. `unit` is the seed's scale `u`. `mode` is `"solid"`.
- For each vertex, in the order written, with position `t` in ticks on each axis: its whole part `floor(t / 120)` goes into `vertices`, and its remainder `t - 120 × floor(t / 120)` into `ticks`.
- `ticks` is run-length encoded as DECK-0003 §1.2 requires: a run of two or more zero remainders is one negative integer, a single zero remainder is `[0, 0, 0]`, and `ticks` is omitted when every remainder is zero.
- `extent` is the larger of 1 and, over every vertex and axis, `|whole|` and `whole + 1` when its remainder is nonzero; then at most 64; omitted when it is 8.
- `colors` holds each vertex's painted color, and `faces` the faces in the order written.
- `opacity` is the expressed standard gene `opacity` (§3.3, §5.4), a JSON integer. It is omitted when it is 100, as DECK-0003 §1.2 requires, so the payload of a bloom whose `opacity` is 100, declared or implicit, is exactly the payload it would be if the gene did not exist.

The payload is valid under DECK-0003 §1.9 by construction. A reader never publishes it. Where a hash of the payload is wanted, as in the vectors (§11), it is SHA-256 of the UTF-8 bytes of the payload's compact JSON in this key order: no whitespace, integers in decimal (`opacity` among them), and the one string, `name`, escaped as JSON requires, with `"` as `\"` and `\` as `\\` and every other character written as itself. A name holds no control character (§3.1, §6.6), so no other escape arises.

### 5.6 Where a bloom stands

A reader draws the bloom as it draws a shard whose payload is the bloom, standing at the seed's `C` (DECK-0003 §3.2): the model's origin on that coordinate, one model unit `2^u` gibsons.

---

## 6. Mixing (normative)

### 6.1 What a mix is

A **mix** combines a mother DNA and a father DNA into a child DNA. It is committed by a **mixed DNA**: a `kind 3350` event with empty `content` that names the mother, the father and a block (§8.1). The child's genes are drawn by the outcome block, which is mined after the commit, and by the commit's own id. Anyone who can read two DNAs MAY mix them; the child names both, so their authors are credited wherever the child grows. The mother and the father MAY be the same DNA.

### 6.2 The outcome block

- The mixed DNA's `block` tag names a height and that block's hash: the **anchor**. A writer MUST name its clock block (§4.1), the block 6 below its tip, so that a reorganization of the last blocks cannot remove it.
- An anchor above the reader's clock height leaves the mixed DNA **pending**, not invalid. Once the anchor is at most the reader's clock height, the hash in the `block` tag MUST equal the hash of the block at that height on the reader's best chain; otherwise the mixed DNA is invalid.
- The **commit height** is the anchor's effective height under §4.2, computed from the mixed DNA's `created_at` exactly as a seed's planted height is: `min(max(anchor, E), F)`, once settled. Until it is settled the mixed DNA is pending.
- The **outcome height** is the commit height plus `MIX_DELAY = 36`.
- The child exists once the commit height is settled and the outcome height is at most the reader's clock height. Before that the mixed DNA is pending: a reader MUST NOT grow it, plant it or mix it.

**Why 36 (non-normative).** Six blocks would be enough to read the outcome safely, because the reader reads it at the clock height, 6 blocks deep. It would not be enough to keep the committer from knowing it. An honest anchor is the clock block, 6 below the tip, so its outcome lies about 30 blocks above the tip at the moment of the commit. The clamp of §4.2 lets a commit name an anchor down to `E`, about 12 blocks below the tip when the commit is made, and more in an hour of fast blocks. Even then the outcome lies about 24 blocks above the tip. A mix resolves about 7 hours after it is committed (36 blocks to the outcome block from a clock block already 6 deep, then 6 more to read it), which is the time scale of a bloom that grows one generation a day. All of this holds for an honest `created_at`; §12 says what a backdated one buys.

### 6.3 The mix word

```
mix_hash = SHA256("CYBERSPACE_SEED_MIX_V1" || outcome_block_hash || commit_id)
s0       = the weather word (§4.3) of mix_hash, written as 64 lowercase hex characters
```

`outcome_block_hash` is the 32 bytes of the outcome block's hash in its displayed order (§4.3), and `commit_id` the 32 bytes of the mixed DNA's event id. The domain string is ASCII.

**Why the commit's id is in the word (non-normative).** Without it, every mix of the same two parents at the same outcome block would make the same child, with the same genes, under two ids. With it, each commit is its own draw. It also means that a committer who somehow knows the outcome block still has to pay the mix floor for every draw it tries (§12).

### 6.4 Alleles, dominance and mutation

The mother is `A` and the father `B`. The rate is `floor((A.mutate + B.mutate) / 2)`. For each gene of `A`'s genome, in genome order (§3.3), with index `i` from 0, except as the next paragraph says for `opacity`:

1. `s = lowbias32(s0 XOR ((i + 1) × 0x9E3779B1 mod 2^32))`.
2. `ia = s & 1` and `ib = (s >> 1) & 1`.
3. The child's first allele is a copy of `A`'s second allele if `ia = 1`, else of its first. Each allele keeps its value and its dominance mark.
4. If `B` has a gene of the same name, the child's second allele is a copy of `B`'s second allele if `ib = 1`, else of its first, and the child's range is `min(A.lo, B.lo)..max(A.hi, B.hi)`. If `B` has no gene of that name (only possible in a sterile hybrid, §6.5), the second allele is a copy of `A`'s other allele (the first if `ia = 1`, else the second), and the range is `A`'s.
5. **Mutation:** if `(s >> 8) mod 100` is less than the rate, then with `span = hi - lo`, `step = 1 + ((s >> 16) mod max(1, ceil(span / 6)))` and `sign = +1` if `(s >> 4) & 1` else `-1`, the allele chosen by `(s >> 2) & 1` (the first for 0, the second for 1) takes the value `min(hi, max(lo, value + sign × step))`. Its dominance mark does not change.

Genes that `B` has and `A` does not are not passed on. All shifts are on the unsigned 32-bit `s`.

**When neither parent declares `opacity`,** it is skipped: no word is computed for it, and the child's `opacity` is implicit. Both parents then hold `100` in the range `100..100`, so a draw could only give the child that same gene. When either parent declares it, it is drawn by steps 1 to 5 like any other gene, with `i` its index in `A`'s genome, which is the number of `A`'s other genes. Every DNA has an `opacity` gene, so `B` always has a gene of that name, declared or implicit.

**Why no existing mix changes (non-normative).** A gene's word `s` depends only on `s0` and its index `i`, never on how many genes were drawn before it. `opacity` stands after every other gene of `A`'s genome (§3.3), so `size`, `hue`, `tone` and every species gene keep the index, and therefore the word, they had before `opacity` existed. A mix of two parents that never mention `opacity` makes the same alleles, the same mutations and the same child text as before, and the mix vectors of §11 are unchanged.

**What this does (non-normative).** A trait carried by a recessive allele in both parents hides in their children and returns in about one grandchild in four. The prototype's sword fern carries a recessive blue `hue`, and the fiddlehead a recessive giant `size`; both vanish in every child of the two and return in 25 and 26 of 100 grandchildren. The coral carries a hidden green that a mix of coral with coral reveals in about 1 in 4.

### 6.5 Species and sterile hybrids

- A mix of a sterile parent is refused: the mixed DNA is invalid.
- A mix of two DNAs that are not of one species (§3.9) is refused, unless the mixed DNA carries the `hybrid` tag (§8.1). With it, the child is a **sterile hybrid**: it grows and can be planted, and it can never be a parent.
- A `hybrid` tag on a mix of one species is ignored: the child is fertile.
- A mix of two DNAs that declare different SEEDO revisions (§3.2, absent counting as 1) is refused, until a later revision says how to mix them. The child copies the mother's `seedo` line unchanged (§6.6, step 2), so its revision is its parents'. **Why refuse rather than take the higher (non-normative):** the child is written from the mother's lines and the father's genes, and only a later revision can know whether its own keywords or gene forms survive a mix with an earlier one. Under revision 1 every DNA has the same revision, so the rule costs nothing now and leaves the choice to the revision that needs it.
- A mix of one species never makes a sterile child unless a parent's text says `sterile`, which already refuses the mix.

### 6.6 The child's text

The child's text is computed from the mother's text, line by line, so that every reader computes the same text and a republished copy (§8.1) can be compared with it:

1. The **head** is the line `dna <name>`, where `<name>` is the mixed DNA's `name` tag if it has one with a value that is not empty, and otherwise the mother's name, a space, `x`, a space and the father's name, cut to 64 code points. In a sterile hybrid the head continues with the line `sterile`. It then continues with a gene line (step 4) for each of `size`, `hue` and `tone` that the mother does not declare, in that order. When the father declares `opacity` and the mother does not, it continues with the child's `opacity` gene line. When neither declares it, the child's text has no `opacity` line, and its `opacity` is implicit, as §6.4 drew it.
2. Walk the mother's lines in order, judging each by its keyword after comments are removed (§3.1). A rule line is copied unchanged. A `dna` or `seed` line is replaced by the head. A `sterile`, `planted` or `scale` line is dropped. A `gene` line is replaced by the child's gene line for the gene of that name. Every other line, comments and blank lines included, is copied unchanged.
3. If the mother has no `dna` or `seed` line, the head is placed before her first line.
4. A child's gene line is `gene <name> <first allele> <second allele> in <lo>..<hi>`, single spaces, where an allele is its value in decimal followed by `!` when it is dominant.

Lines are joined with a line feed. The child's `mutate`, `angle`, `width`, `color`, lets, axiom and rules are therefore the mother's, its genome is the one §6.4 drew, and its species is the mother's species.

**The name tag.** A `name` tag with an empty value means the same as no `name` tag. A value that is not empty MUST be at most 64 code points of well-formed Unicode, with no control character (U+0000 to U+001F, U+007F to U+009F; the line feed and the tab among them), no `#`, no `->`, and no space at either end. A mixed DNA whose `name` tag breaks this rule is invalid. The reason is that the name is written into the child's text: `kid` followed by a line feed and `F -> F F F F` would add a rule to the child, a `#` would cut its name short as a comment, and `->` would turn its `dna` line into a rule. The default name cannot break the rule, because a parent's name comes from its own `dna` line, which holds none of these.

**The child's axiom** is the mother's, so a child whose symbol cap is smaller than the mother's axiom is invalid (§3.6).

**The child's caps** are the mixed DNA's own `caps` tag (§8.1), not the mother's: the child grows under the caps its commit declares, and every seed of the child pays for them. A mixer who declares smaller caps than the mother's bloom needs gets a bloom that stops at them (§7).

### 6.7 Lineage and depth

A mixed DNA's parents may themselves be mixed. A written DNA has **depth** 0, and a mixed DNA has depth one more than the deeper of its parents. A mixed DNA of depth greater than `MIX_DEPTH_MAX = 8` is invalid. To breed further, a gardener republishes a deep child as a written DNA (§8.1), which is free and starts again at depth 0.

**A parent must exist before it is mixed.** A mixed child stays pending until the commit height of each of its mixed parents has settled (§6.2). A mixed DNA whose commit height is lower than the outcome height of either of its mixed parents is invalid. A gardener can therefore commit a mix only with a parent whose genes are already fixed and known. The rule needs only the events' heights, so every reader reaches the same verdict, and it keeps a chain of commits from fixing many generations of outcomes at once before any of them can be seen. The other choice, holding such a mix pending until its parents resolve, would let a gardener commit blind to what it mixes, and nothing would be gained by allowing it.

To compute a mixed DNA, a reader resolves its parents (§8.2, Resolving a DNA), checks each one as a DNA (§8.1), computes each mixed parent's text first, and checks the parents' sterility, their species and their outcome heights. A depth of 8 bounds this at 510 ancestor events, every mixed one of which paid the mix floor.

### 6.8 Previews

A client MAY compute what a mix would make with any 32-bit word in place of `s0`, for example from past blocks and a made-up commit id, so that a gardener can see the range of children before committing. A preview is not a mix: only a mixed DNA event makes a child.

---

## 7. Caps and their price (normative; the numbers are provisional)

A DNA declares three **caps** in its `caps` tag (§8.1). Publishing a DNA costs no work. The caps are paid for at planting: every seed of the DNA carries NIP-13 proof of work on its own event id, at the DNA's **price** (§8.2). A reader enforces the caps whatever any seed paid.

| Cap | What it bounds | Free at the base price | Each extra bit doubles it, up to |
|---|---|---|---|
| vertices | vertices in the bloom (§5.3) | 2,048 | 65,536 (5 bits) |
| symbols | symbols in the bloom's string (§4.6) | 2,048 | 16,384 (3 bits) |
| generations | generations the bloom grows (§4.1) | 32 | 256 (3 bits) |
| **base price** | | **16 bits** | |

The largest symbol and generation caps are provisional: they were lowered on 2026-11-10 from 65,536 and 1,024 until the cost of growing is measured on phones.

**The price.** For each cap, its bits are the smallest `k ≥ 0` with `cap ≤ free × 2^k`. Each value of the `caps` tag MUST be a decimal under `CYBERSPACE_V2.md` §10 (no sign, no leading zeros) from 1 to the cap's maximum, and a DNA whose `caps` tag gives anything else is invalid. A DNA without a `caps` tag has the free caps, 2,048, 2,048 and 32. The price of a DNA is:

```
price = 16 + bits(vertices) + bits(symbols) + bits(generations)
```

| Caps (vertices, symbols, generations) | Price of each seed |
|---|---|
| 2,048, 2,048, 32 (the default) | 16 bits |
| 8,000, 6,000, 40 (the prototype's caps) | 21 bits |
| 4,096, 4,096, 64 | 19 bits |
| 65,536, 16,384, 256 (the largest) | 27 bits |

**The check on a seed.** A seed MUST carry a NIP-13 `nonce` tag whose committed target, its third element, is a decimal under `CYBERSPACE_V2.md` §10 and at least its DNA's price, and its event id MUST have at least that many leading zero bits. A reader resolves the DNA (§8.2), computes its price from its caps, and MUST skip a seed that fails either check: it does not grow it. The committed target keeps a seed mined for a cheap DNA, whose id happened to come out lucky, from passing as a planting of a dearer one.

**The mix floor.** A mixed DNA MUST carry a NIP-13 `nonce` tag whose committed target is a decimal under `CYBERSPACE_V2.md` §10 and at least `MIX_FLOOR = 20` bits, and its id MUST have at least that many leading zero bits; otherwise it is invalid. The floor does not depend on the child's caps, because the child's seeds pay for those. A written DNA needs no work, and a reader ignores a `nonce` tag on one.

**Paid once per planting.** The work is on the seed's id, so it belongs to that one event. A seed carried unchanged, from one version of a bag to the next or into a sealed entry, is the same event and keeps its work. A seed that another author's bag places unchanged (`CYBERSPACE_V2.md` §7.6, Items) keeps its work too, as a shard placed that way keeps its signature: it is one planting shown in several places, credited to its planter. A reader SHOULD grow each seed id only once and draw the same bloom wherever it is placed. Any change to a seed, including a move to a new `C` (§4.2), is a new event, a new planting, and needs new work. A move keeps every other tag of the seed, as DECK-0006 §2.2 says, except `nonce`, which the mover mines again for the new event.

**The work and the clamp.** The work commits to `planted` and `created_at`, since both are in the event the id hashes. A planter that fixes both before it mines can mine for as long as it needs: the clamp reads `created_at`, not the time the seed was published, and the planted block's successors are still unmined. Stock NIP-13 miners refresh `created_at` while they mine. A mine longer than about an hour then leaves `created_at` well after the planted block, and the clamp's floor `E` may raise the effective planted height by a few blocks, which is harmless: day 0 moves a little later, and every reader moves it the same way. The work does not make backdating harder (§12): a planter who backdates evaluates past planted heights for free and mines once.

**At a cap.** A cap never makes a bloom invalid. At the symbol cap the string stops growing for the rest of the generation (§4.6). At the generation cap the bloom stops rewriting and finishes growing between generations (§4.7). At the vertex cap the turtle stops drawing and keeps moving (§5.3). Every reader stops at the same place.

**Why each bit doubles a cap (non-normative).** Proof of work is priced in bits: each bit doubles the expected number of hashes. The caps, with the validity limits of §3.8, bound what a DNA costs every client that grows it. Rewriting costs up to `generations × symbols` symbol steps, once, and each step is bounded by §3.8. Drawing costs up to `symbols` turtle steps and `vertices` vertices per block, because no string ever holds more symbols than the cap (§3.6, §4.6). Doubling any cap at most doubles that cost, so one bit per doubling keeps price and worst-case cost in proportion. The bits add, so the price follows the product of the caps, which is conservative for the vertex cap, since a symbol emits at most six vertices.

**What it costs to plant (non-normative).** Mining a seed's work takes about 65,000 hashes at the base price (16 bits), well under a second on a phone. At the prototype's caps (21 bits) it takes about a second on a desktop core and under ten seconds in a phone's JavaScript (measured at 269,000 SHA-256 per second in the tending research of 2026-11-10). At the largest caps (27 bits) it takes about a minute on a desktop core and several minutes on a phone.

**What it costs to grow (non-normative), measured with the reference implementation on one desktop core.** The six example DNAs grow from planting to day 30 in 2 to 34 milliseconds. A DNA built to be slow within the limits of §3.8 (two rules that spend all 256 condition and chance nodes of their head and always fail, then a rewrite of every symbol with four 63-node arguments, on a string kept at the cap) takes about 0.19 seconds to grow once at the free caps: about 4 microseconds per symbol step. That cost grows with `generations × symbols`: about 0.7 seconds at the prototype's caps, and about 12 seconds at the largest caps. Drawing is cheap at every cap: a string of 65,536 `F` symbols with 65,536 vertices draws in about 0.1 second, and the symbol cap is now at most 16,384. Before the node budgets and the lower caps, the same kind of DNA took 2.6 seconds at the free caps and about an hour at the old largest caps.

**Why the mix floor is fixed (non-normative).** A mix's work is not a payment for growing: every seed of the child pays for that, at the child's caps. What the floor prices is the draw, so that breeding attempts are not free and a rare child costs in proportion to its rarity. Tying the floor to the caps would charge twice for the same bloom and make breeding a small DNA cheaper than breeding a large one, though each draw is worth the same. 20 bits is about a million hashes: under a second on a desktop core, a few seconds on a phone, and a thousand draws cost about ten minutes of a desktop core. The number is provisional (§13, question 5).

---

## 8. Events (normative)

### 8.1 The DNA: `kind 3350`

| Field | Value |
|---|---|
| `kind` | `3350` |
| `content` | a written DNA: its SEEDO text, which MUST be valid (§3). A mixed DNA: empty |
| `["nonce", "<n>", "<target>"]` | a mixed DNA only: exactly one. NIP-13. `<target>` is at least the mix floor, 20 bits (§7). A written DNA needs none, and a reader ignores one |
| `["caps", "<vertices>", "<symbols>", "<generations>"]` | OPTIONAL, at most one. Absent means the free caps (§7). Seeds pay for them, and readers enforce them |
| `["e", "<mother id>", "<relay hint>", "mother"]` | a mixed DNA only: exactly one |
| `["e", "<father id>", "<relay hint>", "father"]` | a mixed DNA only: exactly one |
| `["block", "<height>", "<hash>"]` | a mixed DNA only: exactly one. The anchor, the writer's clock block (§6.2). `<height>` in decimal, `<hash>` 64 lowercase hex in displayed order |
| `["hybrid"]` | a mixed DNA only, OPTIONAL: ask for a sterile hybrid (§6.5) |
| `["name", "<name>"]` | a mixed DNA only, OPTIONAL: the child's name, under the rule of §6.6 |
| `["q", "<original id>", "<relay hint>"]` | OPTIONAL. Credit for a copy (below) |
| `["p", "<original author>"]` | OPTIONAL. On a public copy only (below) |
| `["alt", "<text>"]` | OPTIONAL. NIP-31, for clients that do not know the kind |
| `["-"]` | on a DNA hidden in a bag: the NIP-70 protected marker (below) |

Every decimal value in these tags (a mixed DNA's `nonce` target, each `caps` value, the `block` height) follows `CYBERSPACE_V2.md` §10: decimal digits, no sign, and no leading zero unless the value is `0`. A DNA with a decimal value in any other form is invalid. The `nonce` tag's second element is NIP-13's and may be any string.

A reader MUST verify a DNA's signature, as for any event, and a mixed DNA's work at the mix floor (§7). A DNA whose `content` is empty is mixed, and its other required tags MUST be present and well formed; a DNA whose `content` is not empty is written, and a reader ignores any `mother`, `father`, `block`, `hybrid` or `name` tag on it. A writer MUST NOT write those tags on a written DNA. A DNA that fails any check is invalid, and so is every child whose ancestry includes it.

**Public or hidden.** A DNA MAY be published on its own, for anyone to plant, or carried as an item in the bag or the chest that holds the seeds planted from it, for only the people who reach the place. A DNA hidden that way is an item like any other (`CYBERSPACE_V2.md` §7.6): inline, or in a sealed entry. Its author MUST add `-` to it, as to every item written into a bag, and for a mixed DNA does so before mining its work, because a tag added afterwards would change its id. A DNA of another author is placed unchanged. A writer SHOULD NOT add `-` to a DNA it publishes on its own, because relays that honour NIP-70 refuse a protected event from anyone but its authenticated author.

**Copying.** Anyone can copy a DNA's text, and republishing it is free. Nobody can copy its authorship (its signature) or its lineage (its parents): those are what say who made a DNA. A gardener who republishes another DNA's text, or the computed text of a mixed DNA, publishes a new written DNA, with a new id, signed by the gardener. Such a copy SHOULD credit the DNA it was copied from with `["q", "<original id>", "<relay hint>"]`, the NIP-18 quote tag that DECK-0003 §3.5 uses for copied objects, naming the event it was copied from. A copy published on its own SHOULD also carry `["p", "<original author>"]`, so the author is told. A copy hidden in a bag MUST NOT carry it, because the notification would point at a hidden place. A planter pays the same work to plant the original by reference (§8.2) as to plant a copy, and the original's seeds credit its author wherever they are found, so a copy gains its republisher nothing but its own name on the text. A reader MAY compare a copy of a mixed DNA with the child text it computes (§6.6) and say whether the copy is faithful.

### 8.2 The seed: `kind 3351`

A seed is an item carried in a bag's list of entries (`CYBERSPACE_V2.md` §7.6) or a chest's (DECK-0004 §3). A bag MAY carry it in a sealed entry. It MUST NOT be published on its own: its `C` tag is the place the bag protects.

| Field | Value |
|---|---|
| `kind` | `3351` |
| `content` | the planter's caption, at most 280 characters, or empty |
| `["dna", "<dna id>", "<relay hint>"]` | exactly one. The DNA, by id, written or mixed. The relay hint MAY be empty |
| `["planted", "<height>"]` | exactly one. The clock height when the seed was planted (§4.2), in decimal |
| `["scale", "<u>"]` | OPTIONAL. The scale, `0` to `84`, in decimal. Absent means `0` |
| `["C", "<coord_hex>"]` | exactly one. Where the seed is planted, under the rules of `CYBERSPACE_V2.md` §7.6. A seed needs an exact coordinate, because its terroir depends on it |
| `["title", "<name>"]` | OPTIONAL. The planter's name for this planting, at most 64 characters |
| `["nonce", "<n>", "<target>"]` | exactly one. NIP-13: the planting's work. `<target>` is at least the DNA's price (§7) |
| `["-"]` | the NIP-70 protected marker. MUST be present (`CYBERSPACE_V2.md` §7.6, Protected items) |
| `["d", "<64 lowercase hex>"]` | present only on a seed that has been moved: its lineage (DECK-0006 §2.2) |

The `planted` and `scale` values and the `nonce` target follow `CYBERSPACE_V2.md` §10: decimal digits, no sign, and no leading zero unless the value is `0`. The seed is signed by its planter, as `CYBERSPACE_V2.md` §7.6 says every item that is not a message or hidden audio SHOULD be: a seed's signature is the only proof of who planted it once it is seen elsewhere, and it binds the `created_at` that the clamp reads (§4.2).

**Reading a seed.** A reader MUST skip, as an item it cannot read, a `kind 3351` whose `dna` is not 64 hex characters, whose `planted` is not a decimal under `CYBERSPACE_V2.md` §10, whose `scale` is present and is not such a decimal from 0 to 84, or that has no `C`. **Before it resolves the DNA**, a reader MUST also skip a seed that has no `nonce` tag, whose committed target is not such a decimal or is below 16 (the base price, the least any DNA can ask), or whose id has fewer leading zero bits than its committed target. Free DNAs then cannot be used to make a reader fetch on behalf of seeds that paid nothing. Where the table says "exactly one" and a seed carries more, a reader uses the first.

**Resolving a DNA.** A reader looks for a DNA, by id, first among the items of the list of entries that holds the seed (the bag's, a sealed entry's payload counting as part of its bag, or the chest's), and then on relays: the relays where it found the bag, then the hinted relay under the consent rule of `CYBERSPACE_V2.md` §7.6, References. A mixed DNA's parents are resolved the same way, from the same list of entries. Once it has the DNA, the reader checks the seed's committed target against the DNA's price (§7), and skips a seed whose target falls short. A DNA that cannot be found, or that is invalid (§8.1), leaves the seed a seed that cannot grow: a reader SHOULD say that a seed was found and its DNA could not be fetched, or was refused, rather than show nothing.

**Contents.** A bag that publishes its contents (`CYBERSPACE_V2.md` §7.7) counts seeds under the kind `seed` and hidden DNAs under the kind `dna`: `["contents", "seed", "<count>"]`, `["contents", "dna", "<count>"]`. `CYBERSPACE_V2.md` §7.7 and §8.6 list both kinds, after `door`. A reader that does not know a kind ignores it.

### 8.3 The tend: `kind 3352`

A tend gives work to one seed. It is rooted on the bag that holds the seed, as a sealed comment is (DECK-0006), and it names the seed only inside its seal.

| Field | Value |
|---|---|
| `kind` | `3352` |
| `content` | a public placeholder, for example `This garden is hidden at a place in cyberspace. Find it with ONOSENDAI: https://onosendai.tech`. It MUST NOT reveal the seed or the place |
| `["A", "33330:<bag author>:<lookup_id>"]` | exactly one. The bag that holds the seed, by address, so one query (`kinds: [3352], #A: [<bag address>]`) finds every tend in it |
| `["block", "<height>", "<hash>"]` | exactly one. The anchor: the clock block when the tend was made (§4.1) |
| `["encrypted", "aes-256-gcm", "<payload>", "cyberspace:region"]` | exactly one. The payload, encrypted with the bag's key under the cipher of `CYBERSPACE_V2.md` §7.6 (for a room bag, its room key, DECK-0004 §3.7.2). The fourth element means that the key is derived from a place: a reader MUST NOT make a network request for it |

The decrypted payload is a JSON object:

```json
{"seed": "<64 lowercase hex>", "target": "<20 decimal digits>", "nonces": ["<16 lowercase hex>", "... 8 in all"]}
```

`seed` is the seed's lineage id: its `d` when it has been moved, and otherwise its event id (DECK-0006 §2.2), so tends stay with a seed that is moved within its bag. `target` is the sunlight the tend claims, written as exactly 20 decimal digits with leading zeros, and `nonces` its proof, exactly 8 nonces of exactly 16 hex characters each (§9). The payload is written with no whitespace, so every tend's ciphertext has the same length and the target cannot be read from it. (The fixed width is inside the seal, so `CYBERSPACE_V2.md` §10, which governs tag values, does not apply to it.) A tend carries no `e`, `k` or `p` tag naming the seed or its planter.

**Counting.** A reader counts, for each seed, at most one tend per tender per anchor: among a tender's valid tends of one seed that name the same anchor block, the one with the highest target. Without this rule a tender could publish the same nonces in many tends of one anchor and count its work many times.

**Seeds in chests.** A tend of a seed that stands inside a chest (DECK-0004 §3) is sealed with the key of the bag that holds the chest, like any other tend. Every reader who opens the bag, including one who cannot open the chest, can then read that a seed in this bag was tended and its lineage id, though not its DNA or where it stands in the chest. A gardener who wants a chest's seed to stay unknown to those readers does not tend it.

**Why the seed is named inside the seal (non-normative).** A tend says in public only that someone gave work to a seed in this bag: its kind says that the bag holds at least one seed, and nothing more. DECK-0006 puts the commented item's id and kind in the clear, and its §6 asks whether to stop; a tend starts from the private form. The seed's id is also part of the tend's salt (§9), so only a reader who has opened the bag can check the work, and only such a reader sees the bloom it feeds.

---

## 9. Tending (provisional)

**Sunlight is counted in attempts (normative).** The amount of work a tend carries, its sunlight, is a number of **attempts**: the unit of the hop's re-roll price (`CYBERSPACE_V2.md` §5.10), one aligned height-12 Cantor tree modulo a 61-bit prime. Sunlight is never counted in leading zero bits, and a tend never uses NIP-13. A hop's honest cost is already defined in attempts (16 times `HOP_REROLL_BUDGET[h]`), so "a tend worth one h16 hop" is a defined quantity, 28,048 attempts.

**The attempt construction (provisional).** The construction below follows the tending research of 2026-11-10 and is not ratified. Its domain strings end in `_DRAFT` so that nothing built on it can be mistaken for the final form; ratifying it will give them `_V1` names and golden vectors.

1. `tend_salt = SHA256("CYBERSPACE_SEED_TEND_DRAFT" || seed_lineage_id || anchor_block_hash || tender_pubkey)`, with 32 bytes each for the id, the anchor's displayed hash and the tend's `pubkey`. It cannot be made before the anchor block exists, it is useless for any other seed, and it is useless in an event anyone else signs.
2. `p` is the prime of index 0 drawn from `tend_salt` by the procedure of `CYBERSPACE_V2.md` §5.9, with `tend_salt` in place of `previous_event_id`.
3. `r_place = region_n mod p`, where `region_n` is the region integer (`CYBERSPACE_V2.md` §4.7) of the **tend cube**: the aligned region of height `min(85, 6 + u)` that contains the seed, `u` being the seed's scale. It is computed modulo `p` as §5.9 allows, without the root itself, and names the place in every attempt. At scale 0 the cube is 64 gibsons a side, about the size of a bloom, and its residue costs microseconds. Its cost grows with the scale: at `u = 14` (height 20) one residue costs about 0.23 ms by the method of differences (`CYBERSPACE_V2.md` §5.12), and each further height costs about twice as much, so tends of seeds planted at very large scales are expensive to check: about 0.23 seconds per tend at `u = 24`, and hours by `u = 40`. A reader MUST NOT verify or count a tend whose tend cube is higher than 20, that is, a tend of a seed planted at a scale above 14 (§13, question 7.6). The bag's own region is not used, because its height is the hider's choice and may be far larger than the bloom.
4. One attempt, for an unsigned 64-bit `nonce`: `seed_n = SHA256("CYBERSPACE_SEED_TEND_GRIND_DRAFT" || tend_salt || be64(nonce))`; `base = ((int(seed_n) mod 2^85) >> 12) << 12`; `r = compute_subtree_cantor(base, 12) mod p`; `G = SHA256("CYBERSPACE_SEED_TEND_GRIND_DRAFT" || seed_n || be64(pi_p(r_place, r)))`.
5. **Shares:** a tend with target `T` publishes 8 distinct nonces, each of whose `G`, read as a 256-bit big-endian integer, satisfies `G × ceil(T / 8) < 2^256`. The expected cost is `T` attempts, and a verifier replays 8 attempts, about 54 microseconds on a desktop core.

**What sunlight does is open.** Whether sunlight keeps a bloom alive, makes it flower, lets it drop seeds, or is only shown, is §13, question 8. Until it is ruled, a reader MUST NOT let tends change a bloom's geometry, and MAY show the sunlight a seed has received.

**Why attempts, not NIP-13 (non-normative).** SHA-256 is native to GPUs and mining hardware; `CYBERSPACE_V2.md` §4.1 rejects searching a hash space as the protocol's work. An attempt is structured work in the protocol's own currency, priced in the unit hops already use, with the place's root folded in. At bloom scale the place itself cannot carry the work (three axis trees of a height-8 region cost about 0.1 ms), so the work comes from repeated salts, and a full residue proof (a "standing hop") buys nothing more until seeds are planted at scale `2^8` and above. The research measured both; §13 holds its seven decisions.

---

## 10. Seeds and games (non-normative)

SEEDO owns form, never behavior. A DNA reads its genes, its terroir, the clock and the block hashes, and nothing else: no game state, no movement chain, no events other than its own DNA and seed, no input, no network. A bloom is therefore the same for every reader and every game, and no game can make it depend on who is winning.

The Games DECK (DECK-0002, reserved) defines what entities do inside a virtual bracket. An entity MAY wear a bloom as its body, through a component that a future revision of the Games DECK would define: the component would name a DNA and a planting, and the game would draw the bloom where the entity stands. The game decides where the body goes and what it does; SEEDO decides only what it looks like and how it grows.

SEEDO's expression grammar and integer semantics (§3.4) and its fixed-point arithmetic (§5.1) are deterministic and self-contained. The Games DECK could share them, so that a game's rules and a bloom's rules read the same way and port with the same code. That is a suggestion, not a dependency: nothing in this DECK requires it.

---

## 11. Test vectors

`seeds-vectors.json`, beside this DECK, is produced by `seeds-vectors.mjs` (Node 18 or later, no dependencies) from `seeds-reference.mjs`. It uses real Bitcoin blocks, whose hashes and header times are embedded in the generator. Its DNA events are unsigned stand-ins whose ids carry their NIP-13 work. Like the other vectors in this repository it is not normative: where it disagrees with this text, the text is right and the file is a bug.

The file was generated before `opacity` existed, and adding it changed nothing in it: every section but `opacity` is byte for byte what it was. Outside the `opacity` section, the genomes listed in `accepted` leave out an implicit `opacity`, and the draws of `mixing` hold none, because no parent there declares it and §6.4 skips it.

| Section | What it holds |
|---|---|
| `blocks` | every block hash the file uses, by height, in displayed order |
| `primitives` | the sine table's hash (SHA-256 of the compact JSON array `[0,286,572,...,16384]`, no spaces), `isin`, `icos`, `isqrt` and `lowbias32` samples, and the weather word, `W` and the first eight `w` of block 970,544 |
| `terroir` | sixteen coordinates and scales: the §5.7 destination `(4104, 0, 0)` on plane 0, whose nibbles are `0, 15, 15, 13` and whose `K` is `11`; scales 1 and 3, whose shared cell gives different nibbles because of `byte(u)`; and scales 74 and 84, where the cells cover a whole plane |
| `expressions` | a DNA of `let` lines whose values exercise every rule of §3.4, for example `-7 / 2 = -3`, `-7 % 3 = 2`, `7 % -3 = 1`, `5 / 0 = 0` and `1000 * 1000 * 3 = 1000000` |
| `rejected`, `accepted` | 41 texts a reader MUST reject, each with its reason, and 28 it MUST accept (with each one's name, mutation rate and rule count), among them U+200B, U+202E and U+2028 in an unknown line and in a name, `mutate` followed by U+00A0 or U+3000 (an unknown line, rate 0), `mutat 4`, a rule typed without its arrow, among them `seedo 1` (accepted), `seedo 2` and `seedo 0` (rejected), unknown lines (ignored, ASCII or not) and an unknown first word on a rule line (still a rule, rejected), among them every limit of §3.8 at its bound and one past it (an expression of depth 16 and 17, by terms and by parentheses, in a `let` and in an argument list; 1,500 pairs of parentheses and 1,500 unary minuses, which a reader refuses without overflowing; 64 and 65 nodes; a successor of 64 and 65 symbols; node budgets of 256 and 257 for one head, 1,024 and 1,025 for a DNA; a text of 8,192 and 8,193 bytes), empty rule parameters, control characters, an unpaired surrogate, CRLF line ends, the scoping of names, and `chance` as a whole word |
| `axiom_cap` | an axiom of 40 symbols against symbol caps of 32, 39 and 40 |
| `unknown_lines` | the fiddlehead with two unknown lines added (`anim turn y curl 144 0` and a `note` holding non-ASCII text): it parses, and at day 30 and 6 blocks its payload hash equals the fiddlehead's without them |
| `name_tags`, `decimal_tag_values` | name tag values with their verdicts under §6.6, the injection attempt among them, and tag values under `CYBERSPACE_V2.md` §10 |
| `growth` | the prototype's six DNAs grown at coordinate `3a7f1c9e...a9c1`, planted at 970,400, at day 0, halfway through day 1, day 10 and day 30, plus another place, scale 4, the base caps, small caps, and a turtle test that draws every symbol (`f`, `\`, `/`, tropism up, down and by default, `|`, leaves and beads at and past their bounds, width 0, colors past 255 and below 0 under `hue` and `tone`, 65 pushes against a stack of 64, and the position clamp): for each, the generation, symbol, vertex and face counts, the bytes and SHA-256 of the SNO payload (§5.5), the weather blocks used, and the whole payload for the small ones |
| `clamp` | header times of every block from 970,400 to 970,619, with no gap, and five seeds clamped by §4.2, each with the clock height from which it is settled, `E`, `F` and its effective planted height: one falls where header times run backwards, and one, with `created_at` 0, has no block for `F` and cannot grow |
| `mixing` | four written parents (unmined: publishing a DNA is free) and ten mixes, each mined to the mix floor, each anchored at a clock block, with its event, settling, commit height, outcome block, `mix_hash`, mix word, every gene's draw and the child's text: two children of one pair, their grandchild with a `name` tag, the same grandchild committed before its parents resolved (refused), a name tag that tries to add a rule (refused), coral with itself, a refused pair of species, a sterile hybrid and its refused mix, and a `hybrid` tag on one species (ignored); and the growth of a seed of the first child |
| `seeds` | five seeds as events, with the written DNA published without a caps tag that one of them plants: a planting of the fiddlehead (21 bits), of the first mixed child (21 bits) and of a DNA at the free caps (16 bits), each mined to its DNA's price; and two plantings of the fiddlehead that a reader skips, one with a committed target of 16 and one whose target says 21 on an id with fewer than 21 leading zero bits |
| `price` | the price of ten sets of caps, four of them invalid |
| `opacity` | the fourth standard gene (§3.3): its bounds, default and default range; the **glass crystal**, the crystal with one more line, `gene opacity 40!  100  in 20..100`, grown at day 0 (whole payload) and at day 30 and 6 blocks, each with the SHA-256 of its payload and of the same payload with `opacity` taken out, which at day 30 is the crystal's own hash; the crystal declaring `opacity` 100 (no key, the crystal's hash) and 45 with 70 (57); three texts a reader MUST accept and five it MUST reject; and four mix previews (§6.8), each with every gene's index and draw, the child's text and the child's payload hash: crystal with glass crystal twice (a glassy child and a solid one, both with an `opacity` line in the head), glass crystal with crystal (the mother's line replaced where it stands), and crystal with crystal (no draw and no line). In each preview every other gene is drawn exactly as in crystal with crystal under the same word |

Some single values, for a quick check:

- The fiddlehead at day 30 and 6 blocks (clock 974,726), scale 0, caps 8,000, 6,000 and 40: generation 30, 2,106 vertices, SNO SHA-256 `438902f6f31616f6f8e00f0581d277ee2652d8ea9163564c0949d2e96ee8b463`.
- The fiddlehead at exactly day 1 (clock 970,544): generation 1, its new symbols at length 0, so the payload equals day 0's, SHA-256 `4764aa4d16b449ff7301fd5bb598daf05de1b6f19fb16bdffa7ac5667566a602`.
- The glass crystal at day 30 and 6 blocks, scale 0, caps 8,000, 6,000 and 40: opacity 40, SNO SHA-256 `4aa35eba084a894721fe897154cc43331f2cb766867ab422dcd29cf851e9d08b`. Without its `opacity` key the payload is the crystal's, SHA-256 `f0252ccc372cd51c436c9531b3b9958ebaece50b72019433bcc3e20bc39f5417`.
- The first mix, fiddlehead with sword fern: anchor 970,500 (the clock block of a writer whose tip was 970,506), settled from clock 970,520, commit height 970,500, outcome height 970,536, commit id `00000ae79f8e1b8127b78bc2316d8a880fb8af35d83b0430e6570a8e8e31e0e6`, `mix_hash` `7294ec3cf1222c963acd6668831dd69f1bbb5ffaf56a6343fe78b6702bd63d90`, mix word 136500531.

**Conformance with the prototype.** The prototype, unmodified, reproduces every growth vector at scale 0 with the prototype's caps (27 of them), every allele of the six mixes that make a child when it is given the same `mix_hash` as its block hash, and every terroir vector at scale 0 (6 of them). The vectors differ from the prototype only where this DECK changes it (§14).

---

## 12. Security considerations

- **Grinding the planting time.** A planter chooses the planted height, and so the weather. The planted height must be the clock block (§4.2), whose successors at `+144` and beyond are unmined, so the planter cannot know the weather of any generation. The clamp stops a seed from stating an old height, or a height far in the future, with an honest `created_at`.
- **Choosing among plantings afterwards.** A planter can plant many seeds, at many places or on many days, wait to see how each grows, and then rewrite its bag to keep only the best. Nothing can stop the choosing, but every planting pays its DNA's price (§7), so keeping the best of a hundred costs a hundred plantings. Selection therefore costs in proportion to how choosy the planter is, as a mix's draws do. It buys a good bloom by selection, never a bloom the weather did not grow, and the kept seed's age and place are exactly what they were. The ceiling `F` of §4.2 keeps a planter from signing seeds now for heights long to come and choosing among them later.
- **Backdating.** A planter who writes an old `created_at` as well escapes the clamp, and can choose among past blocks the planted height whose known weather grows the bloom it wants. It compares the candidates without mining anything, so the choice costs it a single planting. Nothing in nostr proves when an event was made: relays store whatever `created_at` the signer writes, and a relay accepts an old one. What remains is that the seed is found only when its bag is published or rewritten, so readers who knew the bag before can see that the seed was not in it; that is evidence, not proof. Bitcoin timestamps (OpenTimestamps, or the block anchors of DECK-0001) would close it at a cost (§13, question 4).
- **Grinding mixes.** Every committed attempt costs the mix floor (§7), 20 bits, and the commit's id salts the outcome (§6.3). With an honest `created_at`, the 36-block delay puts the outcome block in the future (§6.2), so a committer cannot see a child before paying for it, and every attempt is published before its result is known. The delay binds only an honest `created_at`. A committer who backdates `created_at` can name an outcome block already mined, and then tries commit ids in private, paying the mix floor for each draw and nothing more. A committer who publishes many commits honestly pays the same and leaves every attempt in public as a DNA of its own. Either way a rare trait costs in proportion to its rarity: a one-in-a-thousand child costs about a thousand draws, some ten minutes of a desktop core at the floor. NIP-13 is SHA-256, which GPUs and mining hardware compute thousands of times faster than a desktop core, so a committer with such hardware and a backdated `created_at` buys the same child in seconds. What the floor prices is the lineage claim, "bred from these two parents at this block", and not access to the form: written DNAs are free, so anyone can publish the child's text, or any other genome, as a written DNA without mixing at all. The floor makes honest breeding cost something and makes a false lineage claim impossible without the draw. It does not make a rare child scarce, and its level is §13, question 5. Growing the child costs again, at planting.
- **Soil shopping.** Terroir is public, so a planter can compute every coordinate's soil before planting and choose. That is choosing a garden, and it is allowed. It buys nothing about the weather, which is unmined when the seed is planted, and moving a grown seed to better soil replants it (§4.2).
- **Copying.** A DNA's text is public once published, and anyone can republish it for free. A copy is a new DNA with a new id. It cannot take the original's signature, its lineage or its id, and seeds of the original keep naming the original. Credit is by `q` and is a courtesy (§8.1). Since planting costs the same either way, copying buys nothing that planting by reference does not.
- **Free DNAs.** Publishing a DNA costs nothing, so anyone can publish many. A DNA costs a reader nothing until a seed plants it, and each seed pays its DNA's price, so the blooms a reader grows have all been paid for by their planters.
- **Compute.** The caps and the validity limits bound the work of every bloom (§3.8, §7). A reader never rewrites more than `generations × symbols` symbol steps for one seed, each bounded by §3.8; never draws more than `symbols` symbols or emits more than `vertices` vertices, because no string exceeds the symbol cap (§3.6, §4.6); and never resolves more than 510 ancestors for one mixed DNA (§6.7). The bound is real: a DNA built to be slow takes about 0.19 seconds to grow once at the free caps, and about 12 seconds at the largest (§7). Many seeds in one bag multiply that, and each of them paid its price. A reader SHOULD grow blooms off its drawing thread, SHOULD grow the blooms nearest its viewer first, and MAY limit how many it grows at once, or defer a bloom whose caps exceed its budget, saying that more are present. A reader SHOULD cache each generation's string, since generations change once a day, and redraw once per block.
- **Sandboxing.** SEEDO has no input, no output, no network, no clock but the block clock, no randomness but the weather, and no access to game state or to any event but its own DNA and seed. Every expression terminates, every generation is one pass over a bounded string, and memory is bounded by the caps. A reader that interprets SEEDO needs no other sandbox.
- **Determinism and floats.** Every value that decides geometry is an integer, and every reader MUST compute it exactly as §3 to §5 say. A reader MUST NOT replace the sine table with a sine function, the integer square root with a float square root, or floor division with a float division: one difference in one bit of one direction moves every vertex after it, and two readers then draw two blooms. Floating point MAY be used only after emission, to place the finished payload in a scene (DECK-0003 §1.2, the float hazard). The reference implementation uses JavaScript numbers, which are exact here because every intermediate value is below `2^53` (§5.1); a port uses 64-bit integers.
- **Unknown lines.** A reader ignores a line whose first word it does not know (§3.2). That is safe for determinism only because a keyword that changes geometry must come with a new `seedo` revision, which every older reader rejects, because a DNA is read under the revision it declares, and because a keyword added without a revision is read leniently (§3.2). A misspelled keyword is silently ignored, so editors warn about unknown lines; a reader shows the DNA as its author wrote it, typo included.
- **Reorganizations.** The clock reads 6 blocks back (§4.1), a mix is read at its outcome block 6 deep (§6.2), and a mixed DNA whose anchor hash is not on the reader's chain is invalid. A reorganization deeper than 6 blocks can change blooms and children; the protocol treats one as out of scope.
- **Privacy.** A seed is as private as the bag that holds it, and a hidden DNA as private as its bag. A public mix names its parents by id: mixing a hidden DNA in public says that it exists, though not what it is, and the child can be grown only by readers who can resolve every parent. A tend says in public that its signer reached the named bag and that the bag holds a seed, since that is what its kind means. The seed, its sunlight and its planter stay inside the seal, whose length is fixed (§8.3). Every reader of the bag can read which seed was tended, even a seed inside a chest that reader cannot open (§8.3, Seeds in chests).

---

## 13. Open questions (non-normative)

1. **The language's name.** "SEEDO" is a working name. A trademark check is owed before it is used in public. This DECK keeps it out of every domain string (`CYBERSPACE_SEED_TERROIR_V1`, `CYBERSPACE_SEED_MIX_V1`), so a new name changes no hash. The prototype's terroir domain was `SEEDO_TERROIR_V1`.
2. **The price numbers.** The base price (16 bits), the free caps (2,048 vertices, 2,048 symbols, 32 generations), the largest caps (65,536 vertices, 16,384 symbols, 256 generations) and the node budgets of §3.8 are provisional, chosen so that the prototype's DNAs cost about 21 bits and the worst case stays within seconds. They should be calibrated against phones. The planting price has the same hardware asymmetry as the mix floor (§12): NIP-13 is SHA-256, which a GPU mines thousands of times faster than the phone a gardener plants from. Should the price be paid in attempts (§9) instead of NIP-13 bits, so that plantings, tends and hops share one currency? Recommendation: keep NIP-13 for the first release, as the owner's model says, measure growing on phones, and revisit with the tending decisions.
3. **Blocks per generation.** `N` is fixed at 144. Should a DNA choose it, with a `generation` line? A floor would be needed: the clamp's margin is about 12 blocks, so an `N` near that would let a planter know the first generation's weather. Recommendation: fixed at 144 until a DNA needs another pace; then a line allowing 36 to 1,008.
4. **The mix delay.** 36 blocks keeps the outcome unknown with the clamp's two-hour margin (§6.2), for an honest `created_at`. With a Bitcoin timestamp on each commit, 6 would do, and a backdated commit would no longer escape it. Recommendation: 36 now; revisit if commits get timestamps.
5. **The mix floor.** A mixed DNA pays a fixed floor of 20 bits (§7), provisional. The earlier recommendation, the caps' price plus 4 bits, was written when the DNA carried the price of its caps; with planting carrying that price, a fixed floor prices the draw alone. It prices the lineage claim, not access to the form, and a GPU pays it thousands of times faster than a phone (§12). Is 20 bits the right level, and should it rise with depth, so that long breeding lines cost more? Recommendation: 20 bits, flat, until mixing is played with.
6. **Self-seeding.** The prototype drops seeds from a bloom (willow and coral, at day 30): drop `i` falls at generation `3 + 3i`, at a distance of 14 to 43 model units in a direction drawn from that generation's block, with its own planted height inside the next day, computed by every reader and published by nobody. It is not specified here because the prototype leaves too much open: how many seeds a bloom drops (a slider in the prototype, not a DNA line), whether the DNA declares it, what keeps a drop inside the bag's region (the prototype's offsets can leave it), whether drops drop seeds of their own, which caps bound the whole meadow, and how the clamp applies to a seed no event states. Recommendation: specify it after the tending decisions, with the drop count a DNA line priced like the caps, drops confined to the region of the bag that holds the parent, and no drops from drops.
7. **The tending decisions** (the research of 2026-11-10, held for arkinox, one at a time):
   1. Tend with Cantor work instead of NIP-13. Recommendation: yes.
   2. At bloom scale, tend attempts (repeated salts) instead of a residue proof. Recommendation: yes.
   3. Shares per tend. Recommendation: 8.
   4. Require presence (the tender's chain head inside the region). Recommendation: no; perhaps a bonus later.
   5. Terrain `K` as a sunlight price modifier. Recommendation: gentle, or none at first.
   6. A standing hop (the place costs work) for large-scale seeds. Recommendation: defer until seeds are planted at scale `2^8` and above.
   7. Late tends, which name an old anchor. Recommendation: accept them, with a cap on the anchor's age, settled by a simulation in the Seed Garden.
8. **What sunlight does.** Candidates: life (a bloom without enough sunlight stops growing, or fades), flowering (a DNA reads its sunlight as a built-in name), and self-seeding (sunlight pays for dropped seeds). Every one of them makes a bloom depend on which tends a reader has fetched, so two readers with different relays would draw two blooms; whichever is chosen must say how it behaves under a partial view. Recommendation: first show sunlight beside a bloom without changing it; then add life, counted only from tends whose anchors are at most the clock height, with a cap per tender per day so that one wealthy tender cannot keep a bloom alive alone.
9. **Parameter changes still pop.** Growing between generations stretches new symbols, but a parameter that a rule changes (the fiddlehead's coils, the coral's rolls) still changes once a day: 3.8 percent of the fiddlehead's height in one block. Interpolating a parameter from its old value to its new one over the day would fix it, at the cost of remembering each symbol's previous parameters.
10. **Blooms and walkers.** Should a bloom stop a walker (DECK-0003 §1.12), and should a DNA say so? The emitted payload carries no `constrain`, so today a walker passes through every bloom.
11. **Public seeds.** Every seed is hidden in a bag. A garden planted in the open would need a published form, as public shards do (`kind 33332`, reserved).
12. **Deep lineage.** `MIX_DEPTH_MAX` is 8, and a deeper child must be republished as a written DNA. Is 8 the right bound, and should a faithful republished copy (§8.1) keep its lineage for display?

---

## 14. Implementations (non-normative)

**The Seed Garden prototype** (2026-11-09 and 2026-11-10, not published; arkinox has it as a private artifact) is the source of SEEDO: its parser, rewriting, turtle, emission, terroir and mix function are this DECK's, and `seeds-reference.mjs` is its core with the changes below. It embeds 5,000 consecutive block hashes (970,217 to 975,216). Its measurements, at place A, scale `2^0`, day 30, on Node 22 (times from the prototype's README):

| DNA | species | vertices | faces | SNO bytes | full regrow, ms | redraw, ms |
|---|---|---|---|---|---|---|
| fiddlehead | fern | 2,106 | 1,508 | 75,176 | 34 (with JIT warm-up) | 2.8 |
| sword fern | fern | 3,156 | 2,258 | 111,292 | 9 | 2.0 |
| oak | tree | 2,070 | 1,682 | 76,276 | 8 | 2.5 |
| willow | tree | 1,134 | 932 | 40,874 | 2 | 0.8 |
| coral | coral | 2,724 | 2,836 | 106,393 | 7 | 0.7 |
| crystal | crystal | 4,038 | 4,712 | 168,598 | 12 | 1.7 |

The counts and bytes are those of the vectors (§11): day 30 and 6 blocks, growing between generations. The prototype's own README gives bytes for age 4,320 with growing between generations off, which differ for the oak, the willow and the coral.

**Where this DECK differs from the prototype:**

- **Planting is the seed's.** The prototype's DNA text carries `planted` and `scale`; here the seed's tags carry them, and a reader ignores those lines in a DNA (§3.2).
- **Caps are the DNA's.** The prototype has fixed caps (6,000 symbols, 40 generations, 8,000 vertices); here each DNA declares its own, and each seed pays for them (§7).
- **The mix word.** The prototype draws alleles from the outcome block's hash alone; here the commit's id is folded in (§6.3), the outcome is 36 blocks after a clamped commit height (§6.2), and the child's text has an exact form without the prototype's comments and padding (§6.6). Given the same 32-bit word, the alleles are identical.
- **The terroir domain** above scale 0 is `CYBERSPACE_SEED_TERROIR_V1`, not `SEEDO_TERROIR_V1` (§13, question 1).
- **Validity limits.** The prototype has no limit on a DNA's size, an expression's size or depth, a successor's length, or the axiom's length. The limits of §3.8 are new, and every example DNA is far inside them: at most 1.3 KB, 11 nodes and a depth of 5 in an expression, and 23 symbols in a successor.
- **The clamp and the anchor.** The prototype has neither: the clamp (§4.2), its settling and its ceiling are new, and so is the clock-block anchor of a mix (§6.2).
- **The terroir preimage** above scale 0 carries `byte(u)` (§4.4).
- **Unknown lines and the language revision.** The prototype refuses any unknown keyword; here an unknown line is ignored, and the `seedo` line guards determinism instead (§3.2, arkinox's ruling of 2026-11-10).
- **Stricter parsing**, each a case the prototype accepted: a rule parameter that shadows a gene, a `let` or a built-in name (in the prototype the parameter's value then leaked to every later symbol of the generation); header numbers that are not whole numbers (the prototype read `parseInt(...) || 0`); gene values beyond 1,000,000 and ranges that run high to low; a second `axiom` line (the prototype kept the last); a rule with two `->` (the prototype dropped everything after the second); a trailing empty argument such as `F(1,)` (the prototype dropped it); an empty rule parameter such as `A(k,)` (the prototype dropped it); `IN` in upper case in a gene line; control characters; and Unicode whitespace, which the prototype trimmed.
- **Growing between generations** is always on; the prototype's switch to turn it off is a debugging view.
- **The standard gene `opacity`** is new (§3.3, arkinox's ruling of 2026-11-11). The prototype has three standard genes, and its payloads carry no `opacity`. Every prototype DNA leaves `opacity` implicit, so this changes none of their blooms or mixes.
- **Self-seeding** is left open (§13, question 6).

**No client implements this DECK yet.** ONOSENDAI has no seeds; cyberspace-mcp has none.
