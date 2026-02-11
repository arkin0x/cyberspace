# The Cyberspace Meta-Protocol: An Extension of Reality

>[!note]
>Trustless location-based encryption has been achieved in a new version of the protocol proposed here: [Cyberspace v2](https://github.com/arkin0x/cyberspace/blob/master/CYBERSPACE_MOVEMENT_SYSTEM.md). This deprecates much of what you'll find below, and large changes are coming.

>[!warning]
>This specificatin is a work in progress. When a final version is released, it will be tagged under Releases.

# Table of Contents

1. [Purpose](#Purpose)
2. [Abstract](#abstract)
3. [Cyberspace Meta-Protocol](#cyberspace-meta-protocol)
4. [Characteristics of Cyberspace](#characteristics-of-cyberspace)
5. [Claiming Space and Building Structures](#claiming-space-and-building-structures)
6. [Human and AI Avatars in Cyberspace](#human-and-ai-avatars-in-cyberspace)
7. [Dictionary](#dictionary)
8. [Cyberspace Clients](#cyberspace-clients)

# Purpose

The purpose of the cyberspace meta-protocol is to create an extension of reality in digital space. This is accomplished by constructing a digital system that contains the same fundamental properties as reality: being permissionless (no actions can be prevented) and thermodynamic (every action has a cost paid to the universe in entropy). "Extension of reality" does not mean a simulation of reality but rather it refers to a wholly new and different piece of reality being unlocked and made accessible through this protocol. 

Combining the properties of the permissionless [nostr protocol](https://github.com/nostr-protocol/nostr) and [SHA256-based proof-of-work](https://github.com/nostr-protocol/nips/blob/master/13.md) enables this, allowing for the construction of a consequential metaverse posessing [all of the properties predicted in sci-fi](https://habla.news/u/arkinox@arkinox.tech/LgILfOouzSU_hO3EnuUk4).

# Abstract

In reality we are able to do anything that we have the thermodynamic energy to do. This doesn't mean that all actions are acceptable or legal, but you can still _do_ them. You can expend energy to move, communicate, build, etc. without any permission and the only way someone can stop you is by spending energy to oppose you.

Likewise, all actions in reality have a thermodynamic cost that must be paid to the universe in the form of entropy.

### Therefore, reality is a permissionless thermodynamic protocol.

This is what makes doing things in real life different from doing them in a video game.

A video game is not permissionless. You need permission from abstract rules (coded logic) to play and perform actions in a video game. Furthermore, the video game has no thermodynamic constraints on the virtual actions you can take. The actions you take are abstract, and governed by abstract rules enforced by a centralized controller, which is subject to bias and can be tricked with clever abstract logic (hacked). Abstract actions you take in a video game have little value or impact on reality (aside from how people feel about those actions.)

Being permissioned and wholly abstract is why no virtual world or metaverse has ever nor could ever be meaningfully utilized by humanity as an extension of reality. Cyberspace is different because it is built on top of a permissionless protocol (nostr) and all actions in cyberspace are governed by thermodynamics via proof-of-work. This makes cyberspace a permissionless and thermodynamic protocol, just like reality. **Nothing can happen in cyberspace without a provable and substantial expenditure of energy in the physical world.** A permissionless virtual action with a provable thermodynamic cost is effectively as real as any action in the real world, except the consequences of the action happen in cyberspace rather than physical space. 

# Cyberspace Meta-Protocol

<img width="2292" alt="Cyberspace Venn Diagram" src="https://github.com/arkin0x/cyberspace/assets/99223753/984d5cdd-242b-4187-8422-8bee50e2a474">

The Cyberspace Meta-Protocol is a protocol built on top of nostr to enable interaction with cyberspace. It provides generalized tools to interact with other cyberspace users and provides a way to secure and modify the scarce space within cyberspace.

Cyberspace is a digital space which contains 2 planes. One plane exists in reality and the other plane is imaginary. Both planes have identical coordinate systems and an X, Y, and Z axis each 2^85 units long. All cyberspace objects exist as nostr events. All cyberspace coordinates are derived from a 256-bit number by decoding it into three 85-bit unsigned integers representing X, Y and Z coordinates and interpreting the least significant bit to determine which plane the coordinate falls within. The method used to obtain a 256-bit coordinate for an object depends on the object's event kind/purpose.

- Constructs are kind 331 events. The construct event `id`, a 256-bit hash, is used to decode the X, Y, and Z coordinates.
- An avatar's home coordinate is derived from their 256-bit pubkey which can be decoded into X, Y, and Z coordinates.
- A kind 1 "notes" layer addresses notes by simhashing the `content` of the note to obtain a 256-bit hash, which can be decoded into X, Y, and Z coordinates. This is referred to as a _semantic coordinate_ because there is a relationship between the coordinate and the meaning of the event.

Below are the initial actions defined for cyberspace. The basis for these actions lies in the fundamental property of finite spatial dimension. Where there are spatial dimensions, movement is required. When space is finite, space will be contested. To contest space, there must be tools for applying thermodynamic energy to constrain or influence the movement of opposition. Likewise, there must be tools to resist the application of thermodynamic force. We also need tools to communicate and build. The inspiration for these actions comes from nature.

All actions require the publishing of an event with at least 1 unit of NIP-13 proof-of-work (POW) except for constructs which use a special kind of proof-of-work.

# Characteristics of Cyberspace

## Coordinate System

Cyberspace is a virtual coordinate system derived from a 256 bit number. 256 was chosen as a basis for a virtual coordinate system because it is highly common in decentralized technologies such as cryptography, bitcoin, and nostr, and would be compatible with the most ubiquitous mining hardware on the planet - bitcoin mining hardware - which processes SHA-256 hashes that output 256-bit numbers.

A coordinate system may be encoded into a 256 bit number in many ways, but for cyberspace it is encoded to be maximally compatible with the fundamental mechanisms of nostr such as relay querying.

Cyberspace is comprised of two separate spatial planes. Each plane is a space whose volume is (2^85)^3.

A 256 bit number allows us to have 3 spatial axes each 85 bits long. 85 + 85 + 85 = 255 bits, which means we have 1 bit leftover. This final bit determines which plane the coordinate belongs to: 0 for d-space or 1 for i-space.

## Planes

i-space (Ideaspace) is an entirely virtual space, meaning that zero points in i-space represent a point in reality. When people think of cyberspace, they are likely imagining this wholly virtual place.

D-space, or "Dataspace" is a virtual space where all points represent a point in reality. It can be thought of as an augmented reality layer that can provide digital context to physical places in reality. D-space may be viewed in an augmented reality context where it is overlayed on the real world, or explored as a purely virtual space like i-space.

The size of i-space and d-space are the same, but since d-space is meant to be overlayed on reality, it must be scaled to reality appropriately. Therefore, we must choose a scale by which 1 unit of d-space may relate to 1 unit of measurement in reality.

## Scaling D-Space to Reality

<img width="1945" alt="d-space dimensions" src="https://github.com/arkin0x/cyberspace/assets/99223753/af2a3f40-4d0a-46ae-844d-220afca8d17b">

One axis of d-space is 2^85 units, which equals 38,685,626,227,668,133,590,597,632 units. The real space that d-space occupies is a cube whose center is the core of the Earth and whose side length is 96,056 kilometers. This means the distance from the center of the earth to one of the closest edges of the cube is 48028 km, which is approximately geosynchronous orbit.

This scale for d-space was chosen because coordinates outside of this cube would likely not be useful to the everyday person (and NASA probably has better systems for this purpose). A cyberspace coordinate system involving multiple celestial bodies, such as the moon or other planets, would be too complex and not useful for everyday augmented reality purposes. As presented, this scale for d-space is entirely Earth-centric; the imaginary cube of d-space rotates with the Earth. Geosynchronous satellites are the most distant objects from Earth that will remain roughly static in the d-space coordinate system.

The precision of allocating 2^85 units to 96,056 km is absurd. One cyberspace unit equals 0.000000000000002482989403731051 millimeters, which is 1x10^-8 smaller than an atom. However, this absurd precision means there are more cyberspace coordinates nested around the earth's surface than if the scale of d-space were spread across, say, the whole galaxy. Having a higher percentage of d-space coordinates scaled across the surface of the earth (where humans spend their time) is a good thing.

Space in cyberspace may be claimed and owned via proof-of-work mining (like bitcoin), and mining is a game of probability. Therefore, the more cyberspace coordinates that are near the surface of the earth, the easier it will be for people to claim useful space. Still, it will be exceedingly difficult to mine this limited slice of cyberspace representing the earth's surface.

## Sectors

The scale of cyberspace is massive, and it may not be possible to load all of cyberspace at once in any modern programming language. The solution to this was to divide cyberspace into sectors such that sectors may be loaded into memory as chunks and displayed within most computer graphics systems.

A sector is 2^30 gibsons along each axis. This number was chosen because almost all modern programming languages support int32 number types at a minimum. A sector's coordinate system of 2^30 fits within int32, allowing any programming language to load at least 1 sector at a time and display it in a graphics system. If a given system supports larger values, it could load and display multiple adjacent sectors at a time.

Although 2^30 is a large number, cyberspace is 2^85 along each axis, meaning there are 2^55 sectors per axis.

Each sector has a unique id. Every cyberspace object will have an "S" tag to identify which sector it is in. Simply, the sector id is a string of "xid-yid-zid" where each element is the 0-based index of the sector along the given axis. An example S tag with an example sector id would be:

```json
    ["S", "22493668282275767-30865482130737924-22684969844795780"]
```

Sectors aid in querying cyberspace via Nostr Protocol. While nostr supports partial queries for authors and event ids, nostr does not support partial queries on tags. Since the cyberspace coordinate of a given cyberspace object is stored in the "C" tag, the "S" Sector tag creates a way to query an area of cyberspace for objects by giving a unique identifier to a reasonably large area of space. You can easily query for adjacent sectors by incrementing or decrementing the individual parts of the sector id.

Note that the cyberspace coordinate tag is still necessary to manifest the exact location of an object. When searching, the "C" tag can primarily be used to query the genesis of a given avatar's action chain by querying for a "C" tag matching the user's hexadecimal pubkey.

# Claiming Space and Building Structures

## Notes as Building Blocks for Signs

Nostr kind 1 events are short notes (tweets). They are visualized in cyberspace as colored cubes. The cyberspace coordinate for a kind 1 note is determined by the sha256 simhash of the content of the note. This means that the position of the note can be mined by simhashing different content to find something that puts the note in the place you want it. However, the vast majority of notes are simply people communicating thoughts, and their position is an afterthought introduced by ONOSENDAI.

It is interesting to view nostr notes in this way because the simhash creates a loose link between the meaning of the note and it's location in cyberpspace. The original ONOSENDAI proof-of-concept demonstrated this behavior and referred to it as the "vector of human discourse" due to the nebulas of similar notes that it would create.

If you want to create something in cyberspace that others can see, you can build it out of notes. This is referred to as a Sign, as this is how it functions: you can see it, but that's about it. It isn't interactive. The content of the notes used to build a cyberspace sign will not matter; only the position and color of the note and the other notes it is connected to matter.

To build a sign, one must decide on the topology of the sign and determine where in cyberspace notes must be published to serve as the vertices for the topology. Then one can publish kind 1 notes with content that will resolve to a particular coordinate when simhashed; this will most likely be accomplished by a mining program similar to the construct miner. The color of each note cube is derived from the last 6 digits of the created_at converted to hex. You can customize the timestamp to be whatever you need it to be so that the note is the color you want; created_at doesn't actually have to be the current timestamp.

>[!info]
> Using seconds as a hex color means that the full gamut of hex-based colors spans 16777215 seconds (0xffffff) or 194 days or roughly 6.3 months. 

The cube itself can help serve as a visual building block for a sign, but in the vast scale of cyberspace it can be difficult or impossible to see a single cube at any significant distance. Therefore, even more important than the cube is the connections it has. Nostr events can have tags that reference other event ids via the `e` tag. When a note cube references another note cube in its `e` tag, this relationship is visualized as a line. The line should be drawn in any graphics engine in such that they can be seen clearly from any distance, making the scale of individual note cubes irrelevant. The color of the line will be the same as the cube color.

>[!info]
> Besides the content of a kind 1 event being totally random, there are no distinguishing features that would enable someone to detect that a particular event belongs to a sign. A note cube that references another note cube via `e` tag creates an anamorphic vector; the direction and magnitude of the line between the referencing cube and the referenced cube can only be measured in the context of cyberspace.

Once you have built a sign, you will need to publish a signpost event (event list) that tells other avatars how to visualize your sign. This is because typically a sign that would be visible in dataspace would span millions of sectors and not all of them could be loaded simultaneously, so dataspace users must read signpost events that mark where its relevant note cubes are so that they may be loaded to visualize the sign. The nice thing about this approach is that signposts may be secret. Without the signpost it is unlikely that you would ever be able to distinguish a sign in the vast noise of random notes spread across millions of sectors of cyberspace. Avatars can only trust signposts published in their web of trust, or they can set a POW threshold for public signposts they are willing to see, or they could bravely visualize any signpost they find on their relays.

## Constructs

A Construct is a cubic region of cyberspace that you own. You obtain a Construct by publishing a kind `331` "Construct" event. The 256-bit event `id` is used to determine the coordinates of your construct. The size of the bounding box of your construct is determined by a construct-specific quantification of proof-of-work. The amount of proof-of-work on your construct is also your claim to the space it inhabits; if another pubkey publishes higher proof-of-work for the same space, then they can take the space from you. Luckily, cyberspace is exceedingly large and there is plenty of room for everyone, but there may be some real estate in d-space that is more desirable and may be hotly contested.

>[!info]
> You can mine constructs and publish them right now at https://construct.onosendai.tech! Make sure you have a nostr signing extension like nos2x, Alby, or the Spring browser on Android.

The reason why constructs utilize a different kind of proof-of-work is because the output of the proof-of-work is a 256-bit location coordinate for where the construct will reside rather than a number of leading 0 bits that typical NIP-13 proof-of-work produces.

Other cyberspace objects utilize the "C" tag to store their cyberspace coordinate.

All cyberspace objects including constructs utilize the "S" tag to store their current [sector](#sector); this makes it easy to query nearby objects when traversing cyberspace.

### Decoding Coordinates from a 256-bit Number

Any 256-bit number represents a coordinate in cyberspace. Therefore, a 256-bit number may be referred to as a _coordinate_ (singular) while _coordinates_ (plural) most often refers to the individual X, Y, and Z values derived _from_ a coordinate.

All cyberspace coordinates are decoded from 256 bits in the following way:

Create 3 zeroed buffers to contain the X, Y, and Z coordinates. Iterate over the 256 bits starting at index 0. 

- If the current bit index modulo 3 is 0, make that bit the least significant bit of the X coordinate and then shift left.
- If the current bit index modulo 3 is 1, make that bit the least significant bit of the Y coordinate and then shift left.
- If the current bit index modulo 3 is 2, make that bit the least significant bit of the Z coordinate and then shift left.

Repeat this for bits 0 thru 254. Once complete, the X, Y, and Z coordinates will each be an 85-bit number.

The final (least significant) bit 255 determines which plane the coordinate belongs to: `0` for [d-space](#dictionary) or `1` for [i-space](#dictionary). 

>[!tip]
>A trick to remembering which plane corresponds to which binary value, simply remember that d-space (AKA reality) came first, and i-space (AKA virtual reality) came second. Then, if you're not a programmer, subtract 1.

### Searching Partitions of Cyberspace for Constructs

The X, Y, and Z coordinates are interleaved throughout the 256-bit number to allow location-based search/querying via the nostr protocol for constructs, because the most significant bits of the coordinate are also the most significant bits of the 256-bit number. In the case of constructs, one can query nostr relays for the most significant event `id` bits of a kind 331 event to find all constructs in a given area of cyberspace; the search area size corresponds to the precision of the search, as partial searches for event `id`s are allowed by the nostr protocol but only for full bytes.

For example, a partial event `id` search of hexadecimal "e" (binary 0x1110) will only return Constructs in the left half of the right, front, upper quadrant of cyberspace. The left half is because of the final 0 in the binary form; this is a second X coordinate filter that can't be avoided when querying in hexadecimal. This means the largest query-able area of cyberspace is 1/16 of it. To extend the example, searching for hexadecimal "f" (binary 0x1111) would yield all Constructs in the right half of the right, front, upper quadrant of cyberspace.

>[!info]
>Cyberspace uses a right-handed coordinate system, just like Three.js: https://stackoverflow.com/questions/35495872/direction-of-rotation-or-handedness-in-three-js#comment124263015_35510906
>
>x+ is right
>y+ is up
>z - is forward
>
>It may seem strange that z- is forward, but it makes sense intuitively if you consider that, while facing forward, increasing the Z brings something closer to you and decreasing it makes it farther away.

### Mining Your Construct

You can mine the construct event `id` to get the desired coordinates (target) with a nonce and a target coordinate in the form of a 256-bit hex string (even though the lsb is ignored). Unlike [NIP-13 POW](https://github.com/nostr-protocol/nips/blob/master/13.md), there is no invalidation for this coordinate proof-of-work. You simply hash until you get "close enough" to your target coordinate for your own satisfaction; then the amount of proof-of-work is quantified to determine the bounding box size of your Construct.

Example construct proof-of-work event tag:
```
tags: [["nonce", "<nonce>", "<256-bit hexadecimal target>"]]
```

The nonce is simply any string value with enough entropy to yield a wide range of results. For the [ONOSENDAI Construct Miner](https://construct.onosendai.tech/) a 64-bit nonce comprised of a 16-character fixed-length buffer using a limited set of 16 adjacent ASCII symbols is used so that the buffer can be incremented directly in binary between hashes without converting it to text; this increases hash output speed and, more importantly, sidesteps a memory leak manifested in the TextDecoder class when calling it repeatedly while hashing from a web worker.

#### Quantifying Construct Proof-of-Work

Construct proof-of-work is quantified differently than all other cyberspace objects who use NIP-13, which counts leading zeroes on the event `id`. 

A construct's valid proof-of-work _P_ determines its bounding box size _B_. _P_ is calculated like this:

- zero out the last bit (255th bit) in the event `id` and the nonce target
- get the binary Hamming distance between the modified event `id` and the modified target.
- take 255 minus the Hamming distance output. This is the Hamming similarity.
- take the maximum of 0 or (similarity minus 128). This is the amount of valid proof-of-work, _P_.

>[!tip]
>Given two random 256-bit numbers, their Hamming distance will average 128, which means half of their bits are the same and half of the bits are different. Therefore, we treat 128 as zero, or the baseline above which we must increase the similarity in order to complete valid proof-of-work. This is why we subtract 128 from our similarity.
>
>Accordingly, the maximum proof-of-work a construct can have is 128.

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

While mining you will calculate the valid proof-of-work for each iteration to determine if it is close enough to your desired target coordinate, or, if the construct is at least the size you want it to be.

## Shards (coming soon)

Once you've published a construct, you will be able to put 3D objects into it called Shards. In cyberspace terms, Shards are child objects of constructs, but exist as a separate event in nostr. The spec for the 3D format is in development, but you will be able to publish a kind 33331 (replaceable parameterized) "Shard" event containing 3D data and set the e tag to reference your Construct. The coordinates of the Shard event will be relative to the Construct's origin; Shards outside of the bounding box will simply be invisible. In order to be valid, Shards will require proof-of-work relative to their complexity (TBD; may relate to vertex count or bytes). Shards will be zappable and may represent purchasable goods or services. Shards may also be marked as "traversable" allowing Avatars to attach to them temporarily; this is how you can implement ground/gravity or pathways within your Construct that Avatars may use as an anchor to interact in a more human way (as opposed to floating in 3D space).

### Thermo

<img width="500" alt="Cyberspace Venn Diagram" src="https://github.com/arkin0x/cyberspace/assets/99223753/8011edd0-ad03-4ae3-8175-1ca0d91307b5">

Shards may contain code that defines their behavior and interactions with other Shards. In this way, fully interactive experiences may be localized to constructs in cyberspace. The code language that enables this interactivity is currently being developed. It is a Domain Specific Language (DSL) called **Thermo** and you can read about it here: https://hackmd.io/5QyYn2u1TVO0kgDibeeogw

### Edge Case

A construct's coordinate may exist on an edge or vertex of cyberspace's valid coordinate bounds. In this case, the bounding box of the construct may NOT extend beyond valid cyberspace coordinates, as these coordinates may not be represented in a 256-bit coordinate making travel outside of cyberspace impossible. Shards are addressed relative to the construct, but a shard that even partially falls outside of cyberspace will not be valid or visible.

### Overwriting

If someone else publishes a Construct that overlaps with yours, only the Construct with the most proof-of-work will be visible. Therefore, it is in your best interest to continually hash higher proof-of-work versions of your constructs and be ready to publish them should your space ever be overwritten. 

In this way, nobody can lay claim to a space forever, all space is scarce, and all space is tied to real-world costs.

# Human and AI Avatars In Cyberspace

Avatars are a presence in cyberspace controlled by a human or AI operator in reality. The avatar's pubkey serves as a 256-bit home coordinate where the avatar first spawns. If an avatar is killed, it will respawn at the home coordinate.

## Taking Action

Avatars rez into their cyberspace journey at their home coordinate and then utilize proof-of-work to move around and interact in cyberspace.

To act, an avatar must publish a _genesis_ action beginning their action chain or publish an action at the end of their existing action chain. All actions require proof-of-work, and the amount of proof-of-work determines the intensity of the action.

The action chain may be conceptualized like the bitcoin blockchain: each subsequent action contains a reference to the prior action's hash (event `id`) _and_ the avatar's genesis action event `id`. The difference is that each avatar has its own chain that it adds to, and chains are only verified by those who wish to interact with you.

>[!info]
>A _hash chain_ is where each new element commits to the hash of a prior element. Technically, a blockchain is a type of hash chain, but a hash chain is not a blockchain. The action chain is not a blockchain either but only a kind of hash chain (or a [_noschain_](https://snort.social/search/%23noschain) in nostr parlance.) 

An action chain is useful because it proves the avatar's current location and actions are legitimate if its chain is valid.  Action chains are also useful because their creation is a non-trivial expense which incentivizes the production of valid action chains that won't be disregarded by the rest of the avatars who are following the protocol.

A forked action chain is wholly invalid and causes its owner to derezz, meaning they are "dead" until they publish a new genesis for a new action chain. Other conditions can cause similar chain invalidations, such as non-chronological created_at timestamps, impossible velocities, or impossible coordinate changes between actions.

Since the action chain is not a blockchain, there is no hard consensus preventing the creation of invalid action chains. However, the cyberspace meta-protocol contains validation rules for action chains that allow any avatar to verify the validity of anyone's action chain, especially their own. Cyberspace clients should not be capable of producing invalid action chains, but this does not mean that they do not need to be validated. Invalid chains may be disregarded and cause the immediate derezz of the offending avatar.

>[!example] Cyberspace Theory
>Your personal journey from your mother's womb to where you are now is a unique pattern of thermodynamic expenditures across time. Likewise, your action chain is a cryptographically provable, thermodynamically intensive journey across cyberspace and time. Even if the environmental factors outside of your control were in your favor, you _still_ needed to expend the right energy in the right ways to make use of those advantages. Therefore, wherever you are, you earned the right to be there via your thermodynamic expenditures.
>
>Therefore, every avatar has every incentive to invalidate and ignore any action chain that is not provably valid, because any invalid action chain represents a discrepancy between an outcome and the proper work required to achieve it.
>
>In reality, your existence in a particular place _is_ the proof-of-work because reality cannot be cheated. However, since cyberspace is an abstraction, it can be cheated unless the participants in the abstraction agree on rules that preclude cheating. Proof-of-work is a rule which utilizes thermodynamic reality as an engine for producing un-cheatable values, and the protocol through which participants interpret these values produces a robust abstract system based on reality.

## Action Event Structure

There are several different types of actions but one common format for all action chain nostr events. All actions are `kind 333` and have an empty `content`. The meat of what defines a valid action in the action chain is in its `tags`.
### Required Tags

#### `"ms"` - milliseconds
The milliseconds of the `created_at` timestamp of the event. This is to support a higher time resolution. Valid values are `0` to `999` expressed as a string (as all nostr tags must be string values.)

#### ``"C"`` - coordinate (capital C)
This is the avatar's current 256-bit coordinate in the hexadecimal form `["C","8828040..."]`

Reminder: this coordinate contains the X, Y, Z, and plane information which is the final bit (when interpreting the 64 hex digits into binary); Dataspace is `0` and Ideaspace is `1`.

>[!tip]
>For the genesis action, the `"C"` tag will always be equal to your raw hex pubkey.

#### `"Cd"` - coordinate decimal part
This is the fractional part of the cyberspace coordinate, which cannot be expressed in the 256-bit form so it must be stored separately. Avatars are one of few objects in cyberspace that can change position and so having fractional units is a convenience for smooth cyberspace travel. This tag is not used on non-moving cyberspace objects such as constructs.

This tag is expressed in the form `["Cd", "<x>", "<y>", "<z>"]`.

Each value is an integer expressed as a string with a maximum of 8 places.

Example: `["Cd", "39562", "24990", "02610673"]`.

Note that no decimal point is used because the number is to be parsed as an integer and then divided by 100_000_000 before adding it to the `"C"` tag's xyz values.

The default `"Cd"` tag is `["Cd", "0", "0", "0"]`.

#### `"quaternion"` 
The avatar's current quaternion rotation in the form `["quaternion","<x>","<y>","<z>","<w>"]` 

Each value is a decimal number expressed as a string with a maximum of 8 decimal places.

The default quaternion is `["quaternion", "0", "0", "0", "1"]`.

This is the direction that new velocity will be applied, which may or may not also be the way the avatar is facing depending on the cyberspace client's control scheme.

#### `"velocity"`
The avatar's current velocity (not including this event's POW) in the form `["velocity","<x>","<y>","<z>"]`.

Each value is a decimal number expressed as a string with a maximum of 8 decimal places.

For the genesis action this will always be `["velocity","0","0","0"]`.

>[!faq] Does POW affect velocity?
>The current action's `"velocity"` is a checkpoint to verify that the velocity calculations since the previous action's timestamp were done correctly; therefore, the current action's POW won't affect it. Instead, POW is applied to the first step of the simulation after the validated action.
>

#### `"S"` - sector (capital S)
The sector that the action's coordinate is in in the form `["S", "<x>", "<y>", "<z>"]`.

Each value is an integer represeting the 0-based index of the sector along each axis.

A sector is 2^30 Gibsons along each axis. If you derive the X, Y, Z coordinates from the `"C"` tag and divide each by 2^50 (then floor) you will have the sector for that coordinate.

#### `"A"` - action type
A tag to define what kind of action this event's proof-of-work should be applied to, which may be `drift, hop, freeze, derezz, vortex, bubble, armor, stealth, or noop`

Here is a quick summary of what each action does:

- `drift` boosts the avatar in the direction they are facing by applying the action's POW to their velocity.
- `hop` translates the avatar to a specific coordinate; the distance traveled must be paid for with POW. This is useful when surgical movements are needed and velocity is not helpful, like when updating a physical object's realtime position in cyberspace.
- `freeze` decays the avatar's velocity so that stopping is easier (otherwise you'd have to drift perfectly in the opposite direction and that would be very difficult to do especially when accounting for rotations)
- `derezz` applies the action's POW as an attack against a specified target avatar
- `vortex` targets an avatar with a stationary gravitational force whose power is relative to the POW of the action
- `bubble` target an avatar with a stationary anti-gravitational force whose power is relative to the POW of the action
- `armor` adds armor points to your avatar as a buffer against `derezz` attacks; the amount of armor added is relative to the POW of the action
- `stealth` buys time and entropy relative to the POW of the action. During the `time` you earn you can validly obscure your `quaternion`, `C` and `A` tags by `entropy` amount in order to obscure where your avatar is, which hinders other avatars from successfully targeting you with `derezz` attacks. When you publish your first action after the stealth time runs out, you must publish with it the unobscured `quaternion`, `C` and `A` tags to maintain a valid action chain; observers can verify that the unobscured values compute to the obscured values.
- `noop` is used for the genesis action and during stealth to add decoy actions to the action chain. The POW has no effect.

>[!hint]
>You can publish obscured stealth actions _during_ stealth to extend the duration of your stealth, making perpetual stealth possible. However, stealth adds an extra layer of proof-of-work cost to maintain it indefinitely. And most importantly, stealth is not bulletproof; luck, persistence, or high proof-of-work from a motivated enemy can undo it!

>[!faq] Are there other actions not included here?
>A shout is an action that requires NIP-13 proof-of-work but it represents the ephemeral transmission of a location-based message, and therefore isn't included in the action chain.
>
>There are other cyberspace objects that require proof-of-work but aren't part of an action chain, such as constructs, shards, and portals.

#### `"version"`
Used for cyberspace protocol versioning. Currently in the form `["version", "1"]`

### Conditionally Required Tags

#### `"nonce"` - NIP-13
All actions require NIP-13 POW except genesis actions and noop actions. The action's NIP-13 proof-of-work, in the form `["nonce","<current nonce>","<target difficulty>]"`. The number of leading binary zeroes of the event's resulting `id` must match `<target difficulty>` for the work to be valid.

#### `"e"` genesis
An `"e"` tag in the form `["e", "<genesis action event id>", "<recommended relay>", "genesis"]` 
> __Required on all actions except genesis action. The purpose of this tag is so all subsequent actions can be easily verified to belong to a single genesis action via this reference; this is why it is not included on the genesis action itself.__

#### `"e"` previous
An `"e"` tag in the form `["e", "<preceding action chain event id in chain>", "<recommended relay>", "previous"]`
> __Required on all actions except genesis action. The purpose of this tag is to establish the hash chain from each preceding event. Genesis actions have no precursor and therefore do not have this tag either.__

#### `"p"` target
A `"p"` tag specifying one pubkey target for an aggressive `derezz, vortex, or bubble` action. Only one `"p"` tag allowed per action (subsequent will invalidate action chain).
> Required on `derezz`, `vortex`, and `bubble` action types.

### Optional Tags

#### `"echo"`
Optional [[Echo Resistance]] proof-of-work in the form `["echo",<successful nonce>,<target difficulty>]`


>[!warning]
>Malformed, extra, or unknown tags will invalidate your entire action chain and force you to respawn!
>
>_Example: putting an `"e"` genesis tag on a genesis action is invalid!_

> [!note]
> Since the `id` of the event will contain the proof-of-work, it may be queried from relays as a "POW of minimum X leading zeroes" filter.

## Action Type Details

### Drift

`drift` converts the action's Proof of Work (POW) into velocity in the direction the avatar is facing (the quaternion). There is no drag in cyberspace, so velocity induces a perpetual drift akin to outer space.

This new velocity is applied on the first step of the simulation after the drift action's timestamp. 

Where:
<center>

<i>P</i> is the value derived from POW

<i>Z</i> is 2<sup>-10</sup> or 0.0009765625

<i>V<sub>M</sub></i> is the vector3 representing the magnitude of the drift

<i>Q</i> is the avatar's current unit quaternion rotation

<i>V<sub>A</sub></i> is the new vector3 representing the action's contribution to velocity along each axis

<i>V</i> is the avatar's existing total velocity along each axis

</center>


Then:

<i><center>

P = 2<sup> POW - 10</sup>

if ( P <= Z ) P = 0

V<sub>M</sub> = [ 0, 0, P ]

V<sub>A</sub> = Q &middot; V<sub>M</sub> &middot; Q*

V = V + V<sub>A</sub>
</center></i>

Note:
- The resulting velocity V is applied on the next simulation step after the drift action's timestamp.
- Velocity is always applied once per frame (60 times per second).
- The velocity unit is Gibsons.
- 10 is subtracted from POW to allow for small precise movement values at low POW. If POW was not reduced, then the smallest amount of POW would move an avatar 60 G/s.
- The if statement forces POW of 0 to yield no velocity.
- <i>V<sub>A</sub> = Q &middot; V<sub>M</sub> &middot; Q*</i> is the simplified form of the rotation of the vector by the quaternion via quaternion multiplication. Given a quaternion q = (qw, qx, qy, qz) and a vector v = (x, y, z), the operation <i>V<sub>A</sub> = Q &middot; V<sub>M</sub> &middot; Q*</i> expands to:
    <i>V<sub>A</sub> = (
        (1 - 2y² - 2z²)x + (2xy - 2wz)y + (2xz + 2wy)z,
        (2xy + 2wz)x + (1 - 2x² - 2z²)y + (2yz - 2wx)z,
        (2xz - 2wy)x + (2yz + 2wx)y + (1 - 2x² - 2y²)z
    )</i>


### Freeze 

`freeze` allows a drifting avatar to come to a definitive halt or to reduce velocity without changing direction. Freeze reduces all axes velocity V relative to the action's POW:

<i><center>V = V &middot; (256 - POW) / 256</center></i>

Note:
- The resulting velocity V is applied on the next simulation step after the freeze action's timestamp.
- Once the velocity on a given axis is &lt; 0.00000001 it is equivalent to zero because the maximum precision of the velocity in cyberspace is 8 decimal places.


## Publishing Actions (out of date, archive only)

By publishing a kind 333 "Drift" event, the avatar can specify their current coordinate (which will be their home coordinate for their very first drift event) and the direction they wish to move. The amount of NIP-13 proof-of-work _P_ on the drift event, which is determined by the number of leading consecutive binary zeroes on the event `id`, will determine the acceleration, equal to _2<sup>P</sup>_. Acceleration is added to their velocity, which begins at 0.

Each subsequent drift event must reference the previous drift event in the e tag and supply the remaining amount of velocity from any previous drifts. Velocity is decayed by 0.99 at a rate of 60 times per second. This continuous chain of drift events referencing their previous drift events is called a __action chain__.

The action chain allows anyone to verify that the movements are legitimate and that the avatar followed the rules to arrive at the position they currently occupy.

To verify a action chain, one must query and receive EOSE for an avatar's drift events. Then, starting with the oldest event, the movement must be simulated and checked against each subsequent drift to ensure they are within an acceptable tolerance (TBD). Checks include velocity, created_at timestamps, and resulting coordinates.

If a drift event goes outside of those tolerances, it is considered "broken" and the last valid drift event is considered the "tip" of the broken action chain. Other ways a action chain can break:

- a new drift event is published that does not reference the most recent drift event before it. In this case, the last drift event in the previous chain is the tip
- a new drift event is published that references a previous drift event which is already referenced by another drift event (action chain fork). In this case, the last valid drift event published before the fork is the tip.

When a action chain is broken, the new (technically invalid) action chain is treated as if it is valid, but the tip of the broken chain acts like a frozen ghost copy of that avatar. This copy is vulnerable to Derezz attacks just like any avatar is, but more vulnerable because the copy is stationary.

### Aggression

**Derezz**. To keep avatars honest in their action chains and to allow the thermodynamic resolution of disputes, aggressive actions are enabled by proof-of-work.

A Derezz attack, if successful, will "kill" the victim and teleport them back to their home coordinate while also nullifying all of their proof-of-work Armor, Stealth, Vortex, and Bubble events before their demise.

A Derezz must reference a drift event of the victim and the attacker's previous drift event in the e tag. The p tag must reference the victim.

A Derezz attack may be performed on any drift event. However, the newest drift events are the most vulnerable. The older a drift event is in its action chain, the less vulnerable it is to a successful Derezz. This is why the tip of a broken action chain makes the avatar extremely vulnerable to Derezz, because the broken chain no longer has any new drift events to defend it from attack. Here is how it works:

A Derezz event "X" references the victim drift event "D" in the e tag.

The sum of proof-of-work of all events in the victim action chain following event D but having a timestamp before X is considered temporal armor against the Derezz attack.
The power of a Derezz attack is the amount of proof-of-work in a kind 86 event. Only 1 unit of Derezz is enough to kill a target avatar. However, the Derezz power is applied like this:

- The maximum applied power of the Derezz attack is floor( attacker valid action chain length / 1000 )
- The distance between the attacker and the victim drift event is subtracted from the Derezz power.
- The victim's Armor proof-of-work (kind 10087) is subtracted from the Derezz power.
- The victim's temporal armor is subtracted from the Derezz power.

If the remaining Derezz power is negative or zero, it has no effect.

By these rules, the tip of a broken action chain will never have temporal armor. Drift events are essentially permanent, so a broken action chain will remain vulnerable as long as the avatar has not been killed. Once Derezzed, an avatar starts fresh with a new action chain at their home coordinate and no chains prior to the Derezz event can be targeted any more.

**Vortex**. A Vortex exerts a constant gravitational force that pulls a victim toward it while the attacker can generate higher PoW for a Derezz, as an example. An attacker may publish a kind 88 "Vortex" PoW event and specify the victim's pubkey (only 1 allowed) and e tag the respective action chains. The content of the event should specify the coordinates where the Vortex should appear; if omitted it should appear at the victim's location. If the Vortex's PoW is 10 and the victim is 7 units away from it, 3 units of acceleration are applied to pull the victim toward the center.

**Bubble**. Securing one's property is a human right, and so it is necessary to provide tools for avatars to defend their cyber property. Bubble is an event kind 90 that represents the creation of a constant anti-gravitational force that pushes an aggressor away from it. It functions as the exact opposite to a Vortex. The range and force of repulsion is constant regardless of the aggressor's distance from the origin.

### Defense

**Armor**. An avatar may publish a kind 10087 "Armor" PoW event. The valid PoW in this event is subtracted from any incoming Derezz as a defensive measure.

Defenders against Derezz have an asymmetric advantage because they can generate Armor PoW any time before they encounter an attacker, whereas the attacker must generate enough Derezz to overcome their victim's Armor in a very short period of time. Therefore, an additional aggressive action is available to balance out this defender's advantage in the form of Vortex.

**Stealth**. The state of the nostr network does not reflect whether an avatar is actively controlling their Presence or not. Your latest Drift event determines where you are located. If you close your cyberspace client, other avatars will still see you in that location and you are still vulnerable to attack. Therefore, it is important to be able to conceal one's location so that when the human controller is not present the avatar is less vulnerable.

Stealth is an event kind 10085 that simply publishes proof-of-work to define a stealth boundary. Updated details forthcoming.

**Echo Resistance**. It is possible that an aggressor may be creating valid aggressive events against you but not publishing them intentionally. If you publish movement events that do not respect these aggressive events, you will break your action chain; however, if you were not aware of those events, you can be forced to unintentionally break your action chain if an aggressor witholds the events until you have moved enough to contradict their would-be effect.

Because this late publishing (which could also be due to latency) is like an echo of the original event's creation, I refer to it as an Echo attack.

In order to combat this, the Echo Resistance mechanic is introduced. Avatars may add an additional "echo" tag to any Drift event that contains NIP-13-like proof-of-work. The tag should include ["echo", <nonce>, <target>, <sha256>]. Drifts with a valid echo proof are immune to all aggression events (except Derezz), meaning they may omit them from their velocity/position calculations. The reason why Derezz is omitted is because if successful Derezz resets the avatar's position anyway, so withholding it does not supply any significant benefit to the aggressor.

There are restrictions on usage of echo resistance. Each consecutive echo-resistant Drift event (n) requires 2^(ceil(n)) valid Pow ("target" in the echo tag). This means the PoW cost for consecutive echo events is 1, 2, 4, 8, 16, 32, 64, ... . This exponential increase is designed to make sustained use of echo resistance expensive and therefore strategic.

For every non-echo-resistant event published, the count (n) is reduced by 0.5 until it hits 1, which is the minimum PoW target/cost for a valid echo-resistant event. This means that for each consecutive echo-drift event, double the number of non-shielded events are required for cooldown. This prevents overuse or spamming of echo resistance.

Aggression events must be included in an aggressor's action chain. This means that the aggressor must stop publishing Drift events (stop moving) to successfully withhold an aggression event. If a nearby avatar has suddenly stopped moving, it may be a cue to begin applying echo resistance to your Drift events and moving away from that avatar as fast as possible.

The increasing PoW requirement for consecutive echo-drifts means that the defender will be slowed down as their thermodynamic resources are directed towards generating the echo PoW. This offers an inherent balance: the more you use echo resistance, the more vulnerable you are to Derezz attacks due to your reduced speed.

The Echo Resistance mechanism provides a strategic balance between action chain defense and speed, providing players with more agency in how they interact within the environment.

Echo Resistance also provides a natural counter to Vortex and Bubble events even when there is no risk of a withheld event or action chain break, as the echo resistance negates their effects.

Echo shielding is an additional NIP-13-like proof-of-work on a Drift event. 

### Communication

**Shout**. You may publish an event of kind 20333 "Shout" (ephemeral) with PoW to broadcast a public message to nearby avatars. The more proof-of-work the event has, the larger the broadcast radius. The event must reference in its e tag the tip of the Shouting avatar's action chain; this is the coordinate from which the Shout emanates. Avatars will ignore Shouts whose radius they do not fall within.

The Shout may have an optional parameter to be broadcast as voice or text. Text shouts show up in a chat box on the interface, while voice Shouts will be heard via text-to-speech engines built into the web browser. This, of course, can be muted globally on the receiving avatar's interface, which will force the speech to the text chat box.

Clients should have optional speech-to-text via the web browser too so that a human controller can speak naturally to broadcast a Shout without typing.

# Dictionary

**action** - a nostr event specified by the cyberspace meta-protocol that avatars may publish to interact with cyberspace

**action chain** - (previously referred to as movement chain) - a hash chain of all actions an avatar issues in cyberspace. Each subsequent event refers to the previous event by its event `id`. This chain can be verified by any other avatar. An action chain becomes invalid or "broken" if its drift events leave a certain range of tolerance, if an invalid action is published, if a fork in the chain is detected, or if a new chain is begun.

**armor** - a kind 10087 event representing a reduction in magnitude of any incoming derezz attack. The reduction is equal to the amount of proof-of-work on the kind 10087 event.

**avatar** - an operator's presence in cyberspace that is subject to the forces of cyberspace

**bubble** - a kind 90 event representing a constant repulsive gravitational force emanating from a coordinate that affects a single target avatar. The proof-of-work on a kind 90 event determines the radius and constant force of the repulsion applied in units/second.

**caster** - referring to the creator of an action specified by the cyberspace meta-protocol.

**construct** - a cubic portion of cyberspace that is claimed by an operator by publishing a kind 331 event with the highest proof-of-work of any kind 331 in that location. The amount of proof-of-work on the kind 331 also determines the size of the space claimed.

**cyberspace** - a permissionless and thermodynamic digital extension of reality. Refers to both d-space and i-space.

**cyberspace meta-protocol** - the rules and algorithms that enable cyberspace to exist on the nostr protocol

**d-space** - another name for dataspace, which is the digital space enabled by the cyberspace meta-protocol where all points represent a point in reality. D-space is meant to be overlaid on reality by a constant scaling factor and rotation relative to the planet to create a digital/physical composite space. This combination of digital and physical is commonly referred to as augmented reality. D-space is a cube whose center is the WGS-84 center of Earth, and whose faces are tangent to geosynchronous orbit at a radius of 48028km. The +X axis extends from Earth's center through the Prime Meridian at the equator. The +Z axis is +90° Longitude East from +X. The +Y axis is +90° Latitude.

**dataspace** - the formal name of d-space

**derezz** - a thermodynamic action that, if successful, teleports a single victim to their home coordinate and nullifies their proof-of-work actions, excluding constructs

**drift** - a kind 333 event representing the current coordinate and the application of acceleration to an avatar's current vector. The proof-of-work on a kind 333 represents the amount of velocity added to the avatar.

**echo** - referring to an action event that would affect a target avatar if published but is purposely withheld in order to be published later so as to invalidate the target avatar's action chain

**echo attack** - the intentional act of withholding an action that would affect an avatar and then publishing it later to try and invalidate the target avatar's action chain. This is possible because the echo event introduces new information when published that alters the valid possible drifts the victim can make.

**echo resistance** - an additional proof-of-work that may be applied to one's drift event in order to cancel any potential echo actions that would affect it. A drift event with echo resistance may also ignore legitimate non-echo actions, but the cost to publish echo-resistant drifts doubles each time it is used consecutively.

**event** - a nostr event that is also an action

**genesis event** - the first event that begins an action chain

**Gibson** - the fundamental quanta of the cyberspace coordinate system. Each axis of cyberspace is 2^85 Gibsons long.

**i-space** - another name for ideaspace, which is the digital space enabled by the cyberspace meta-protocol where zero points represent a point in reality. I-space is meant to be entirely virtual, which is commonly referred to as virtual reality.

**ideaspace** - the formal name of i-space

**magnitude** - a value derived from an amount of proof-of-work

**operator** - a human or ai that controls an avatar

**permissionless** - relating to a mechanism whose use cannot be prevented

**plane** - a coordinate subset of cyberspace; referring to either d-space or i-space

**portal** - an object constructed via proof-of-work that allows avatars to travel between d-space and i-space, or between points on the same plane

**presence** - the visible representation of an avatar in cyberspace which may be customized

**rez** - slang for when an avatar publishes their first action in history, or, after being derezzed

**sector** - a cubic region of cyberspace that is 2^30 gibsons along each axis. As each axis of cyberspace is 2^85, that means there are 2^55 sectors along each axis. All cyberspace objects have an "S" tag denoting the sector id, which is comprised of the 0-based sector index along each axis. The "S" tag makes it easy to query for all cyberspace objects in a given sector.

**shard** - a kind 33332 event that represents an object that belongs to a construct. Shards may represent 3D models, boundaries, rules, or interactive elements. Shards do not exist outside their construct. The proof-of-work on a kind 33332 must exceed the complexity of the data it stores.

**shout** - a kind 20333 event that represents the broadcast of a message from the location of the caster. The proof-of-work on a kind 20333 determines the unit range at which other avatars will "hear" the message.

**spawn** - see rez or genesis event

**stealth** - a kind 10085 event that represents a stealth boundary radius around caster where other avatars outside the radius cannot determine the caster's exact coordinates because they are encoded in a zk-snarks proof. A kind 10085 event must be published to the action chain before subsequent drift events are zk-snarks encoded.

**thermodynamic** - relating to a mechanism that increases the entropy of the universe proportionally to an action's magnitude

**unit** - a generic term for a Gibson

**vortex** - a kind 88 event representing an attractive gravitational well pulling toward a coordinate that affects a single target avatar. The proof-of-work on a kind 88 event determines the radius of the well and the attraction force is the radius minus the target avatar's distance from the center applied in units/second.

# Cyberspace Clients

| Client | DATASPACE | IDEASPACE | Constructs | Shards | Avatars | Drift | Derezz | Armor | Vortex | Bubble | Stealth | Shout |
|--------|-------------|--------|-----------|-------|--------|-------|--------|--------|---------|-------|--------|--------|
| [ONOSENDAI オノセンダイ](https://github.com/arkin0x/ONOSENDAI) | ⛔ | ✅ | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 |  
| [Yondar](https://github.com/innovatario/yondar-mono) | ✅ | ⛔ | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 
| [ONOSENDAI Construct Miner](https://github.com/arkin0x/construct-miner) | ✅ | ✅ | ☑ | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 |  

# Keywords

Metaverse, bitcoin, lightning, cyberspace, mining, sha256, hash

# License

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
