# The Cyberspace Meta-Protocol: An Extension of Reality

# Table of Contents

1. [Purpose](#Purpose)
2. [Abstract](#abstract)
3. [Cyberspace Meta-Protocol](#cyberspace-meta-protocol)
4. [Claiming Space and Building Structures](#claiming-space-and-building-structures)
5. [Human and AI Agents in Cyberspace](#human-and-ai-agents-in-cyberspace)
6. [Dictionary](#dictionary)
7. [Cyberspace Clients](#cyberspace-clients)

# Purpose

The purpose of the cyberspace meta-protocol is to create an extension of reality in digital space. This is accomplished by constructing a digital system that contains the same fundamental properties as reality: being permissionless (no actions can be prevented) and thermodynamic (every action has a cost paid to the universe in entropy).

Combining the properties of the permissionless [nostr protocol](https://github.com/nostr-protocol/nostr) and [proof-of-work](https://github.com/nostr-protocol/nips/blob/master/13.md) enables this, allowing for the construction of a consequential metaverse similar to those predicted in sci-fi. 

# Abstract

In reality we are able to do anything that we have the thermodynamic energy to do (this doesn't mean that all actions are acceptable or legal, but you can still _do_ them). You can expend energy to move, communicate, build, etc. without any permission and the only way someone can stop you is by spending energy to oppose you.

Likewise, all actions in reality have a thermodynamic cost that must be paid to the universe in the form of entropy.

### Reality is a permissionless thermodynamic protocol.

This is what makes doing things in real life different from doing them in a video game.

A video game is not permissionless. You need permission from abstract rules (coded logic) to play and perform actions in a video game. Furthermore, the video game has no thermodynamic constraints on the virtual actions you can take. The actions you take are abstract, and governed by abstract rules enforced by a centralized controller, which is subject to bias and can be tricked with clever abstract logic (hacked). Abstract actions you take in a video game have little value or impact on reality (aside from how people feel about those actions.)

Being permissioned and wholly abstract is why no virtual world has ever nor could ever be meaningfully utilized by humanity as an extension of reality. However, cyberspace is different because it is built on top of a permissionless protocol (nostr) and all actions in cyberspace are constrained by thermodynamics via proof-of-work.

A permissionless virtual action with a thermodynamic cost is effectively **as real as any action in the real world**, except the consequences of the action happen in cyberspace rather than physical space. All actions in cyberspace will have a thermodynamic cost, and therefore cyberspace will be an extension of reality itself.

# Cyberspace Meta-Protocol

The Cyberspace Meta-Protocol is a protocol built on top of nostr to enable interaction with cyberspace. It provides generalized tools to interact with other cyberspace users and provides a way to secure and modify the scarce space within cyberspace.

Cyberspace is a digital space that has 3 axes each 2^85 long. Objects from the nostr protocol can be addressed in this space in several ways. The method usually depends on the event's kind. Generally, all coordinates are derived from a 256-bit number by decoding it into three 85-bit twos-compliment integers representing X, Y and Z coordinates and interpreting the least significant bit to determine which plane the coordinate falls within; this interpretation is referred to as embedding. This process is [discussed below](#claiming-space-and-building-structures).

- Kind 1 "notes" are addressed by simhashing the content of the event to obtain a 256-bit hash, which can be embedded into X, Y, and Z coordinates. This is referred to as a semantic coordinate because there is a relationship between the coordinate and the meaning of the event.
- Constructs are kind 332 events. The construct event ID, a 256-bit hash, can be embedded into X, Y, and Z coordinates.
- Operators' home coordinate is derived from their 256-bit pubkey which can be embedded into X, Y, and Z coordinates.
- Operators that have a kind 0 with a valid NIP-05 will have their home coordinate addressed to the semantic coordinate of their NIP-05 identifier (e.x. the embedded simhash of arkinox@arkinox.tech)

Below are the initial actions defined for cyberspace. The basis for these actions lies in the fundamental property of finite spatial dimension. Where there are spatial dimensions, movement is required. When space is finite, space will be contested. To contest space, there must be tools for applying thermodynamic energy to constrain or influence the movement of opposition. Likewise, there must be tools to resist the application of thermodynamic force. We also need tools to communicate and build. The inspiration for these actions comes from nature.

All actions require the publishing of an event with at least 1 unit of NIP-13 proof-of-work (PoW) except for constructs which use a special kind of proof-of-work.

# Claiming Space and Building Structures

## Constructs

A Construct is a zappable portion of cyberspace that you own. You obtain a Construct by publishing a kind 332 "Construct" event. The 256-bit event ID is used to determine the coordinates of your Construct. The size of the bounding box of your construct is determined by proof-of-work.

### Decoding Coordinates from a 256-bit number

The nostr event ID is a hexadecimal string representing 256 bits. Coordinates are decoded from 256 bits in the following way:

- If the current bit index modulo 3 is 0, make that bit the least significant bit of the X coordinate and then shift left.
- If the current bit index modulo 3 is 1, make that bit the least significant bit of the Y coordinate and then shift left.
- If the current bit index modulo 3 is 2, make that bit the least significant bit of the Z coordinate and then shift left.

Repeat this for bits 0 thru 254. Once complete, the X, Y, and Z coordinates will each be an 85-bit number.

The final (least significant) bit 255 determines which plane the coordinate belongs to: [c-space](#dictionary) or [d-space](#dictionary).

The X, Y, and Z coordinates are interleaved throughout the event ID to allow location-based equerying via the nostr protocol, because the most significant bits of the coordinate are also the most significant bits of the event ID.

One can query relays for the most significant event ID bits of a kind 332 Construct event to find all Constructs in a given area of cyberspace; the search area size corresponds to the precision of the search.

For example, a partial event ID search of hexadecimal "e" (binary 0x1110) will only return Constructs in the left half of the right, back, upper quadrant of cyberspace. The left half is because of the final 0 in the binary form; this is a second X coordinate filter that can't be avoided when querying in hexadecimal. This means the largest query-able area of cyberspace is 1/16 of it. To extend the example, searching for hexadecimal "f" (binary 0x1111) would yield all Constructs in the right half of the right, back, upper quadrant of cyberspace.

### Mining Your Construct

You can mine the Construct event ID to get the desired coordinates (target) with a nonce integer and a target coordinate in the form of a 256-bit hex string (even though the lsb is ignored). Unlike [NIP-13 PoW](https://github.com/nostr-protocol/nips/blob/master/13.md), there is no invalidation for this coordinate proof-of-work. You simply hash until you get "close enough" to your target coordinate for your own satisfaction; then the amount of proof-of-work is quantified to determine the bounding box size of your Construct.

Example Construct proof-of-work event tag:
```
tags: [["nonce", "<nonce>", "<256-bit hexadecimal target>"]]
```

The nonce is simply an incremented integer, expressed as a string as required of all tag values by the nostr spec, starting with 0.

The Construct's valid proof-of-work _P_ determines its bounding box size _B_. _P_ is calculated like this:

- zero out the last bit in the event ID and the target (255th bit)
- get the binary Hamming distance between the modified event ID and the modified target.
- take 255 minus the Hamming distance output. This is the similarity.
- take the maximum of 0 or (similarity minus 128). This is the amount of valid proof-of-work, _P_.

To calculate the side length of the construct's bounding box _B_:

$$
\text{B = }\text{floor}\left(\left(\sum_{{i=1}}^{{P}} i\right)^{1 + \frac{P}{32}}\right)
$$

or in Python:

```
def summation(n):
    if n < 2:
        return n
    else:
        return n + summation(n - 1)

def size(pow):
    return math.floor(summation(pow) ** (1 + pow / 32))
```

Where `pow` is the valid proof-of-work.



While mining you will calculate the valid proof-of-work for each iteration to determine if it is close enough to your desired target coordinate, or, if the Construct is at least the size you want it to be.

## Shards

Once you've published a Construct, you will be able to put 3D objects into it called Shards. In cyberspace terms, Shards are child objects of Constructs, but exist as a separate event in nostr. The spec for the 3D format is in development, but you will be able to publish a kind 33332 (replaceable parameterized) "Shard" event containing 3D data and set the e tag to reference your Construct. The coordinates of the Shard event will be relative to the Construct's origin; Shards outside of the bounding box will simply be invisible. In order to be valid, Shards will require proof-of-work relative to their complexity (TBD; may relate to vertex count or bytes). Shards will be zappable and may represent purchasable goods or services. Shards may also be marked as "traversable" allowing Operators to attach to them temporarily; this is how you can implement ground/gravity or pathways within your Construct that Operators may use as an anchor to interact in a more human way (as opposed to floating in 3D space).

### Edge Case

A Construct's coordinate may exist on an edge or vertex of cyberspace's valid coordinate bounds. In this case, even though the bounding box of the construct may extend beyond valid cyberspace coordinates, it is considered valid and may be fully utilized; Shards are addressed relative to the Construct, so a Construct that spills outside of valid cyberspace coordinates may be permitted with no problems.

### Overwriting

If someone else publishes a Construct that overlaps with yours, only the Construct with the most proof-of-work will be visible. Therefore, it is in your best interest to continually hash higher proof-of-work versions of your Constructs and be ready to publish them should your space ever be overwritten. 

In this way, nobody can lay claim to a space forever, all space is scarce, and all space is tied to real-world costs.

# Human and AI Agents In Cyberspace

## Operators

Operators are a zappable presence in cyberspace controlled by a human or AI agent in reality.

The home coordinate is the spawning location for an operator. It is first derived from the simhash of the operator's NIP-05 identity, such as arkinox@arkinox.tech. This means there will be clusters of operators belonging to the same NIP-05 identity server such as nostrplebs.com, and in turn high-traffic/high-value space for Constructs near these clusters.

If the operator does not have a NIP-05 identity, their home coordinate will default to a coordinate derived from their pubkey (85 bits for x, y, then z, discarding the least significant bit).

### Movement

Operators rez into their cyberspace journey at their home coordinate and then utilize proof-of-work to move around cyberspace. By publishing a kind 333 "Drift" event, the operator can specify their current coordinate (which will be their home coordinate for their very first drift event) and the direction they wish to move. The amount of NIP-13 proof-of-work _P_ on the drift event, which is determined by the number of leading consecutive binary zeroes on the event ID, will determine the acceleration, equal to _2<sup>P</sup>_. Acceleration is added to their velocity, which begins at 0.

Each subsequent drift event must reference the previous drift event in the e tag and supply the remaining amount of velocity from any previous drifts. Velocity is decayed by 0.99 at a rate of 60 times per second. This continuous chain of drift events referencing their previous drift events is called a __action chain__.

The action chain allows anyone to verify that the movements are legitimate and that the operator followed the rules to arrive at the position they currently occupy.

To verify a action chain, one must query and receive EOSE for an operator's drift events. Then, starting with the oldest event, the movement must be simulated and checked against each subsequent drift to ensure they are within an acceptable tolerance (TBD). Checks include velocity, created_at timestamps, and resulting coordinates.

If a drift event goes outside of those tolerances, it is considered "broken" and the last valid drift event is considered the "tip" of the broken action chain. Other ways a action chain can break:

- a new drift event is published that does not reference the most recent drift event before it. In this case, the last drift event in the previous chain is the tip
- a new drift event is published that references a previous drift event which is already referenced by another drift event (action chain fork). In this case, the last valid drift event published before the fork is the tip.

When a action chain is broken, the new (technically invalid) action chain is treated as if it is valid, but the tip of the broken chain acts like a frozen ghost copy of that operator. This copy is vulnerable to Derezz attacks just like any operator is, but more vulnerable because the copy is stationary.

### Aggression

**Derezz**. To keep operators honest in their action chains and to allow the thermodynamic resolution of disputes, aggressive actions are enabled by proof-of-work.

A Derezz attack, if successful, will "kill" the victim and teleport them back to their home coordinate while also nullifying all of their proof-of-work Armor, Stealth, Vortex, and Bubble events before their demise.

A Derezz must reference a drift event of the victim and the attacker's previous drift event in the e tag. The p tag must reference the victim.

A Derezz attack may be performed on any drift event. However, the newest drift events are the most vulnerable. The older a drift event is in its action chain, the less vulnerable it is to a successful Derezz. This is why the tip of a broken action chain makes the operator extremely vulnerable to Derezz, because the broken chain no longer has any new drift events to defend it from attack. Here is how it works:

A Derezz event "X" references the victim drift event "D" in the e tag.

The sum of proof-of-work of all events in the victim action chain following event D but having a timestamp before X is considered temporal armor against the Derezz attack.
The power of a Derezz attack is the amount of proof-of-work in a kind 86 event. Only 1 unit of Derezz is enough to kill a target operator. However, the Derezz power is applied like this:

- The maximum applied power of the Derezz attack is floor( attacker valid action chain length / 1000 )
- The distance between the attacker and the victim drift event is subtracted from the Derezz power.
- The victim's Armor proof-of-work (kind 10087) is subtracted from the Derezz power.
- The victim's temporal armor is subtracted from the Derezz power.

If the remaining Derezz power is negative or zero, it has no effect.

By these rules, the tip of a broken action chain will never have temporal armor. Drift events are essentially permanent, so a broken action chain will remain vulnerable as long as the operator has not been killed. Once Derezzed, an operator starts fresh with a new action chain at their home coordinate and no chains prior to the Derezz event can be targeted any more.

**Vortex**. A Vortex exerts a constant gravitational force that pulls a victim toward it while the attacker can generate higher PoW for a Derezz, as an example. An attacker may publish a kind 88 "Vortex" PoW event and specify the victim's pubkey (only 1 allowed) and e tag the respective action chains. The content of the event should specify the coordinates where the Vortex should appear; if omitted it should appear at the victim's location. If the Vortex's PoW is 10 and the victim is 7 units away from it, 3 units of acceleration are applied to pull the victim toward the center.

**Bubble**. Securing one's property is a human right, and so it is necessary to provide tools for operators to defend their cyber property. Bubble is an event kind 90 that represents the creation of a constant anti-gravitational force that pushes an aggressor away from it. It functions as the exact opposite to a Vortex. The range and force of repulsion is constant regardless of the aggressor's distance from the origin.

### Defense

**Armor**. An operator may publish a kind 10087 "Armor" PoW event. The valid PoW in this event is subtracted from any incoming Derezz as a defensive measure.

Defenders against Derezz have an asymmetric advantage because they can generate Armor PoW any time before they encounter an attacker, whereas the attacker must generate enough Derezz to overcome their victim's Armor in a very short period of time. Therefore, an additional aggressive action is available to balance out this defender's advantage in the form of Vortex.

**Stealth**. The state of the nostr network does not reflect whether an operator is actively controlling their Presence or not. Your latest Drift event determines where you are located. If you close your cyberspace client, other operators will still see you in that location and you are still vulnerable to attack. Therefore, it is important to be able to conceal one's location so that when the human controller is not present the operator is less vulnerable.

Stealth is an event kind 10085 that simply publishes proof-of-work to define a stealth boundary. Each unit of proof-of-work results in a stealth radius = 4096 / (POW+1). A smaller stealth radius is better. 4096 is the length of 1 sector.

When an operator has published a valid Stealth event, they may publish their Drift events differently without breaking their action chain. Instead of publishing their coordinates directly in the Drift event, they may publish a zk-snark that will only reveal their coordinates if the input to the zk-snark is a coordinate within the boundary radius. This is called a Stealth Drift event.

Someone hunting this stealth operator may see their Stealth Drift events and input their own coordinates into the zk-snark. If they are not within the stealth boundary radius, they will simply receive a rejection. If they are within the stealth boundary radius, they will receive the actual coordinates of the operator.

**Echo Resistance**. It is possible that an aggressor may be creating valid aggressive events against you but not publishing them intentionally. If you publish movement events that do not respect these aggressive events, you will break your action chain; however, if you were not aware of those events, you can be forced to unintentionally break your action chain if an aggressor witholds the events until you have moved enough to contradict their would-be effect.

Because this late publishing (which could also be due to latency) is like an echo of the original event's creation, I refer to it as an Echo attack.

In order to combat this, the Echo Resistance mechanic is introduced. Operators may add an additional "echo" tag to any Drift event that contains NIP-13-like proof-of-work. The tag should include ["echo", <nonce>, <target>, <sha256>]. Drifts with a valid echo proof are immune to all aggression events (except Derezz), meaning they may omit them from their velocity/position calculations. The reason why Derezz is omitted is because if successful Derezz resets the Operator's position anyway, so withholding it does not supply any significant benefit to the aggressor.

There are restrictions on usage of echo resistance. Each consecutive echo-resistant Drift event (n) requires 2^(ceil(n)) valid Pow ("target" in the echo tag). This means the PoW cost for consecutive echo events is 1, 2, 4, 8, 16, 32, 64, ... . This exponential increase is designed to make sustained use of echo resistance expensive and therefore strategic.

For every non-echo-resistant event published, the count (n) is reduced by 0.5 until it hits 1, which is the minimum PoW target/cost for a valid echo-resistant event. This means that for each consecutive echo-drift event, double the number of non-shielded events are required for cooldown. This prevents overuse or spamming of echo resistance.

Aggression events must be included in an aggressor's action chain. This means that the aggressor must stop publishing Drift events (stop moving) to successfully withhold an aggression event. If a nearby operator has suddenly stopped moving, it may be a cue to begin applying echo resistance to your Drift events and moving away from that operator as fast as possible.

The increasing PoW requirement for consecutive echo-drifts means that the defender will be slowed down as their thermodynamic resources are directed towards generating the echo PoW. This offers an inherent balance: the more you use echo resistance, the more vulnerable you are to Derezz attacks due to your reduced speed.

The Echo Resistance mechanism provides a strategic balance between action chain defense and speed, providing players with more agency in how they interact within the environment.

Echo Resistance also provides a natural counter to Vortex and Bubble events even when there is no risk of a withheld event or action chain break, as the echo resistance negates their effects.

Echo shielding is an additional NIP-13-like proof-of-work on a Drift event. 

### Communication

**Shout**. You may publish an event of kind 20333 "Shout" (ephemeral) with PoW to broadcast a public message to nearby operators. The more proof-of-work the event has, the larger the broadcast radius. The event must reference in its e tag the tip of the Shouting operator's action chain; this is the coordinate from which the Shout emanates. Operators will ignore Shouts whose radius they do not fall within.

The Shout may have an optional parameter to be broadcast as voice or text. Text shouts show up in a chat box on the interface, while voice Shouts will be heard via text-to-speech engines built into the web browser. This, of course, can be muted globally on the receiving operator's interface, which will force the speech to the text chat box.

Clients should have optional speech-to-text via the web browser too so that a human controller can speak naturally to broadcast a Shout without typing.

# Dictionary

action - a nostr event specified by the cyberspace meta-protocol that operators may publish to interact with cyberspace

action chain - (previously referred to as action chain) - a hash chain of all actions an operator issues in cyberspace. Each subsequent event refers to the previous event by its event id. This chain can be verified by any other operator. An action chain becomes invalid or "broken" if its drift events leave a certain range of tolerance, if an invalid action is published, if a fork in the chain is detected, or if a new chain is begun.

agent - a human or AI

armor - a kind 10087 event representing a reduction in magnitude of any incoming derezz attack. The reduction is equal to the amount of proof-of-work on the kind 10087 event.

bubble - a kind 90 event representing a constant repulsive gravitational force emanating from a coordinate that affects a single target operator. The proof-of-work on a kind 90 event determines the radius and constant force of the repulsion applied in units/second.

c-space - colloquially referred to as "cyberspace", but specifically referring to the wholly virtual digital space enabled by the cyberspace meta-protocol. "Wholly virtual" means no point in c-space represents a point in reality.

caster - referring to the creator of an action specified by the cyberspace meta-protocol.

construct - a cubic portion of cyberspace that is claimed by an agent by publishing a kind 332 event with the highest proof-of-work of any kind 332 in that location. The amount of proof-of-work on the kind 332 also determines the size of the space claimed.

cyberspace - a permissionless and thermodynamic digital extension of reality. Colloquially refers to c-space, but may be used to accurately refer to the composite of both c-space and d-space.

cyberspace meta-protocol - the rules and algorithms that enable cyberspace to exist on the nostr protocol

d-space - another name for dataspace, which is the digital space enabled by the cyberspace meta-protocol where all points in d-space represent a point in reality. D-space is meant to be overlaid on reality to create a digital/physical composite space. This combination of digital and physical is commonly referred to as augmented reality.

dataspace - the formal name of d-space

derezz - a thermodynamic action that, if successful, teleports a single victim to their home coordinate and nullifies their proof-of-work actions, excluding constructs

drift - a kind 333 event representing the current coordinate and the application of acceleration to an operator's current vector. The proof-of-work on a kind 333 represents the amount of velocity added to the operator.

echo - referring to an action event that would affect a target operator if published but is purposely withheld in order to be published later so as to invalidate the target operator's action chain

echo attack - the intentional act of withholding an action that would affect an operator and then publishing it later to try and invalidate the target operator's action chain. This is possible because the echo event introduces new information when published that alters the valid possible drifts the victim can make.

echo resistance - an additional proof-of-work that may be applied to one's drift event in order to cancel any potential echo actions that would affect it. A drift event with echo resistance may also ignore legitimate non-echo actions, but the cost to publish echo-resistant drifts doubles each time it is used consecutively.

event - a nostr event that is also an action

operator - an agent's presence in cyberspace that is subject to the forces of cyberspace

magnitude - a value derived from an amount of proof-of-work. E.g., the armor's magnitude was 5 because the kind 10087 event had 5 units of proof-of-work.

permissionless - relating to a mechanism whose use cannot be prevented

presence - the visible representation of an operator in cyberspace

rez - when an operator publishes their first action in history, or, after being derezzed

shard - a kind 33332 event that represents an object that belongs to a construct. Shards may represent 3D models, boundaries, rules, or interactive elements. Shards do not exist outside their construct. The proof-of-work on a kind 33332 must exceed the complexity of the data it stores.

shout - a kind 20333 event that represents the broadcast of a message from the location of the caster. The proof-of-work on a kind 20333 determines the unit range at which other operators will "hear" the message.

stealth - a kind 10085 event that represents a stealth boundary radius around caster where other operators outside the radius cannot determine the caster's exact coordinates because they are encoded in a zk-snarks proof. A kind 10085 event must be published to the action chain before subsequent drift events are zk-snarks encoded.

thermodynamic - relating to a mechanism that increases the entropy of the universe proportionally to an action's magnitude

unit - the fundamental measurement quanta of cyberspace. Each axis of cyberspace is 2^85 units long. An operator's default presence is an icosahedron with a 1 unit diameter.

vortex - a kind 88 event representing an attractive gravitational well pulling toward a coordinate that affects a single target operator. The proof-of-work on a kind 88 event determines the radius of the well and the attraction force is the radius minus the target operator's distance from the center applied in units/second.

# Cyberspace Clients

| Client |  Constructs | Shards | Operators | Drift | Derezz | Armor | Vortex | Bubble | Stealth | Shout |
|--------|-------------|--------|-----------|-------|--------|-------|--------|--------|---------|-------|
| [ONOSENDAI オノセンダイ](https://github.com/arkin0x/ONOSENDAI) | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 |  

# Keywords

Metaverse, bitcoin, lightning

# License

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
