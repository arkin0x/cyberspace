# The Cyberspace Meta-Protocol: An Extension of Reality

# Purpose

The purpose of the cyberspace meta-protocol is to create an extension of reality in digital space. This is accomplished by combining the properties of the permissionless [nostr protocol](https://github.com/nostr-protocol/nostr) and [proof-of-work](https://github.com/nostr-protocol/nips/blob/master/13.md).

# Abstract

In reality we are able to do anything that we have the thermodynamic energy to do (this doesn't mean that all actions are acceptable or legal, but you can still _do_ them). You can expend energy to move, communicate, build, etc. without any permission and the only way someone can stop you is by spending energy to oppose you.

Likewise, all actions in reality have a thermodynamic cost that must be paid to the universe in the form of entropy.

### Reality is a permissionless thermodynamic protocol.

This is what makes doing these things in real life different from doing them in a video game.

A video game is not permissionless. You need permission from abstract rules (coded logic) to play and perform actions in a video game. Furthermore, the video game has no thermodynamic constraints on the virtual actions you can take. The actions you take are abstract, and governed by abstract rules enforced by a centralized controller, which is subject to bias and can be tricked with clever abstract logic (hacked). Abstract actions you take in a video game have little value or impact on reality (aside from how people feel about those actions.)

Being permissioned and wholly abstract is why no virtual world has ever nor could ever be meaningfully utilized by humanity as an extension of reality. However, cyberspace is different because it is built on top of a permissionless protocol (nostr) and all actions in cyberspace are constrained by thermodynamics via proof-of-work.

A permissionless virtual action with a thermodynamic cost is effectively **as real as any action in the real world**, except the consequences of the action happen in cyberspace rather than physical space. All actions in cyberspace will have a thermodynamic cost, and therefore cyberspace will be an extension of reality itself.

# Cyberspace Meta-Protocol

Cyberspace is a digital space that has 3 axes each 2^85 long. Objects from the nostr protocol can be addressed in this space in several ways. The method usually depends on the event's kind. Generally, all coordinates are derived from a 256-bit number by discarding the least significant bit and then dividing it into three 85-bit twos-compliment integers representing X, Y and Z coordinates; this is referred to as embedding.

- Kind 1 "notes" are addressed by simhashing the content of the event to obtain a 256-bit hash, which can be embedded into X, Y, and Z coordinates. This is referred to as a semantic coordinate because there is a relationship between the coordinate and the meaning of the event.
- Constructs are kind 33333 (replaceable) events. The construct event ID, a 256-bit hash, can be embedded into X, Y, and Z coordinates.
- Operators' home coordinate is derived from their 256-bit pubkey which can be embedded into X, Y, and Z coordinates.
- Operators that have a kind 0 with a valid NIP-05 will have their home coordinate addressed to the semantic coordinate of their NIP-05 identifier (e.x. the embedded simhash of arkinox@arkinox.tech)

Below are the initial actions defined for cyberspace. The basis for these actions lies in the fundamental property of finite spatial dimension. Where there are spatial dimensions, movement is required. When space is finite, space will be contested. To contest space, there must be tools for applying thermodynamic energy to constrain or influence the movement of opposition. Likewise, there must be tools to resist the application of thermodynamic force. We also need tools to communicate and build. The inspiration for these actions comes from nature.

All actions require the publishing of an event with at least 1 unit of NIP-13 proof-of-work (PoW) except for constructs which use a special kind of proof-of-work.

## Building

**Constructs**. A construct is a zappable portion of cyberspace that you own. You obtain a construct by publishing a kind 33333 "Construct" event. The 256-bit event ID is used to determine the coordinates of your construct. The first 85 bits is the X coordinate. The second 85 bits is the Y coordinate. The third 85 bits is the Z coordinate. The last bit (the least significant bit) is ignored.

You can mine this event ID to get the desired coordinates with a nonce and a target coordinate in the form of a 256-bit hex string (although the lsb is ignored). Unlike NIP-13 PoW, there is no invalidation for this coordinate proof-of-work. You simply hash until you get "close enough" to your target coordinate for your own satisfaction.

The construct's valid proof-of-work _P_ determines its bounding box size, where the length of a side is equal to _2<sup>P</sup>_. _P_ is calculated by taking 255 minus the Hamming distance between the event ID and the target coordinate.

**Shards**. Once you've gotten your construct published, you will be able to put 3D objects into it. I am still working on the spec for the 3D format, but you will be able to publish a kind 33334 "Shard" event and set the e tag to reference your construct. The coordinates of the Shard will be relative to the construct's origin; Shards outside of the bounding box will simply be invisible. Shards will require proof-of-work but I am still working on the mechanics. Shards will be zappable and may represent purchasable goods or services.

### Overwriting

If someone else publishes a construct that overlaps with yours, only the construct with the most proof-of-work will be visible. Therefore, it is in your best interest to continually hash higher proof-of-work versions of your constructs and be ready to publish them should your real estate ever be overwritten. 

In this way, nobody can lay claim to a space forever, all space is scarce, and all space is tied to real-world costs.

## Operators

Operators are a zappable presence in cyberspace controlled by a human or AI agent in reality.

The home coordinate is the spawning location for an operator. It is first derived from the simhash of the operator's NIP-05 identity, such as adam@jensen.dx. This means there will be clusters of operators belonging to the same NIP-05 identity server such as nostrplebs.com, and in turn high-traffic/high-value real-estate for constructs near these clusters.

If the operator does not have a NIP-05 identity, their home coordinate will default to a coordinate derived from their pubkey (85 bits for x, y, then z, discarding the least significant bit).

## Movement

Operators rez into their cyberspace journey at their home coordinate and then utilize proof-of-work to move around cyberspace. By publishing a kind 333 "Drift" event, the operator can specify their current coordinate (which will be their home coordinate for their very first drift event) and the direction they wish to move. The amount of NIP-13 proof-of-work _P_ on the drift event, which is determined by the number of leading consecutive binary zeroes on the event ID, will determine the acceleration, equal to _2<sup>P</sup>_. Acceleration is added to their velocity, which begins at 0.

Each subsequent drift event must reference the previous drift event in the e tag and supply the remaining amount of velocity from any previous drifts. Velocity is decayed by 0.99 at a rate of 60 times per second. This continuous chain of drift events referencing their previous drift events is called a __movement chain__.

The movement chain allows anyone to verify that the movements are legitimate and that the operator followed the rules to arrive at the position their currently occupy.

To verify a movement chain, one must query and receive EOSE for an operator's drift events. Then, starting with the oldest event, the movement must be simulated and checked against each subsequent drift to ensure they are within an acceptable tolerance (TBD). Checks include velocity, created_at timestamps, and resulting coordinates.

If a drift event goes outside of those tolerances, it is considered "broken" and the last valid drift event is considered the "tip" of the broken movement chain. Other ways a movement chain can break:

a new drift event is published that does not reference the most recent drift event before it. In this case, the last drift event in the previous chain is the tip.
a new drift event is published that references a previous drift event which is already referenced by another drift event (movement chain fork). In this case, the last valid drift event published before the fork is the tip.
When a movement chain is broken, the new (technically invalid) movement chain is treated as if it is valid, but the tip of the broken chain acts like a frozen ghost copy of that operator. This copy is vulnerable to Derezz attacks just like any operator is, but more vulnerable because the copy is stationary.

## Aggression

**Derezz**. To keep operators honest in their movement chains and to allow the thermodynamic resolution of disputes, aggressive actions are enabled by proof-of-work.

A Derezz attack, if successful, will "kill" the victim and teleport them back to their home coordinate while also nullifying all of their proof-of-work Armor, Stealth, Vortex, and Bubble events before their demise.

A Derezz must reference a drift event of the victim and the attacker's previous drift event in the e tag. The p tag must reference the victim.

A Derezz attack may be performed on any drift event. However, the newest drift events are the most vulnerable. The older a drift event is in its movement chain, the less vulnerable it is to a successful Derezz. This is why the tip of a broken movement chain makes the operator extremely vulnerable to Derezz, because the broken chain no longer has any new drift events to defend it from attack. Here is how it works:

A Derezz event "X" references the victim drift event "D" in the e tag.
The sum of proof-of-work of all events in the victim movement chain following event D but having a timestamp before X is considered temporal armor against the Derezz attack.
The power of a Derezz attack is the amount of proof-of-work in a kind 86 event. Only 1 unit of Derezz is enough to kill a target operator. However, the Derezz power is applied like this:

- The maximum applied power of the Derezz attack is floor( attacker valid movement chain length / 1000 )
- The distance between the attacker and the victim drift event is subtracted from the Derezz power.
- The victim's Armor proof-of-work (kind 10087) is subtracted from the Derezz power.
- The victim's temporal armor is subtracted from the Derezz power.

If the remaining Derezz power is negative or zero, it has no effect.

By these rules, the tip of a broken movement chain will never have temporal armor. Drift events are essentially permanent, so a broken movement chain will remain vulnerable as long as the operator has not been killed. Once Derezzed, an operator starts fresh with a new movement chain at their home coordinate and no prior chains can be targeted.

**Armor**. An operator may publish a kind 10087 "Armor" PoW event. The valid PoW in this event is subtracted from any incoming Derezz as a defensive measure.

Defenders against Derezz have an asymmetric advantage because they can generate Armor PoW any time before they encounter an attacker, whereas the attacker must generate enough Derezz to overcome their victim's Armor in a very short period of time. Therefore, an additional aggressive action is available to balance out this defender's advantage...

**Vortex**. A Vortex exerts a constant gravitational force that pulls a victim toward it while the attacker can generate higher PoW for a Derezz, as an example. An attacker may publish a kind 88 "Vortex" PoW event and specify the victim's pubkey (only 1 allowed) and e tag the respective movement chains. The content of the event should specify the coordinates where the Vortex should appear; if omitted it should appear at the victim's location. If the Vortex's PoW is 10 and the victim is 7 units away from it, 3 units of acceleration are applied to pull the victim toward the center.

## Defense

**Bubble**. Securing one's property is a human right, and so it is necessary to provide tools for operators to defend their cyber property. Bubble is an event kind 90 that represents the creation of a constant anti-gravitational force that pushes an aggressor away from it. It functions as the exact opposite to a Vortex. The range and force of repulsion is constant regardless of the aggressor's distance from the origin.

**Stealth**. The state of the nostr network does not reflect whether an operator is actively controlling their Presence or not. Your latest Drift event determines where you are located. If you close your cyberspace client, other operators will still see you in that location and you are still vulnerable to attack. Therefore, it is important to be able to conceal one's location so that when the human controller is not present the operator is less vulnerable.

Stealth is an event kind 10085 that simply publishes proof-of-work to define a stealth boundary. Each unit of proof-of-work results in a stealth radius = 4096 / (POW+1). A smaller stealth radius is better. 4096 is the length of 1 sector.

When an operator has published a valid Stealth event, they may publish their Drift events differently without breaking their movement chain. Instead of publishing their coordinates directly in the Drift event, they may publish a zk-snark that will only reveal their coordinates if the input to the zk-snark is a coordinate within the boundary radius. This is called a Stealth Drift event.

Someone hunting this stealth operator may see their Stealth Drift events and input their own coordinates into the zk-snark. If they are not within the stealth boundary radius, they will simply receive a rejection. If they are within the stealth boundary radius, they will receive the actual coordinates of the operator.

## Communication

**Shout**. You may publish an event of kind 20333 "Shout" (ephemeral) with PoW to broadcast a public message to nearby operators. The more proof-of-work the event has, the larger the broadcast radius. The event must reference in its e tag the tip of the Shouting operator's movement chain; this is the coordinate from which the Shout emanates. Operators will ignore Shouts whose radius they do not fall within.

The Shout may have an optional parameter to be broadcast as voice or text. Text shouts show up in a chat box on the interface, while voice Shouts will be heard via text-to-speech engines built into the web browser. This, of course, can be muted globally on the receiving operator's interface, which will force the speech to the text chat box.

Clients should have optional speech-to-text via the web browser too so that a human controller can speak naturally to broadcast a Shout without typing.

# Cyberspace Clients

| Client |  Constructs | Shards | Operators | Drift | Derezz | Armor | Vortex | Bubble | Stealth | Shout |
|--------|-------------|--------|-----------|-------|--------|-------|--------|--------|---------|-------|
| [ONOSENDAI オノセンダイ](https://github.com/arkin0x/ONOSENDAI) | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 |  

# Keywords

Metaverse, bitcoin, lightning

# License

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
