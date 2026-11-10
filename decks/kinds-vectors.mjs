// Golden vectors for DECK-0004 (items, chests, item listings, and the locks of
// regions and rooms, §3.8), DECK-0005
// (local chat), DECK-0006 (sealed comments), DECK-0007 (hidden audio) and the
// sealed entries of CYBERSPACE_V2.md §7.6 (kind 33335). Deterministic: every key is
// SHA-256 of a label, every nonce is fixed, and every BIP-340 signature uses
// 32 zero bytes of auxiliary randomness. A reader MUST accept any valid
// signature; the fixed aux only makes these files reproducible. The message
// sealed in the chest, the chat line and the hidden audio item are rumors, so
// they carry no `sig`.
// Run from a directory where nostr-tools (2.x) and @noble/curves are installed:
//   node kinds-vectors.mjs > kinds-vectors.json
import { createHash, webcrypto } from 'node:crypto'
import { getPublicKey, getEventHash } from 'nostr-tools/pure'
import { v2 as nip44 } from 'nostr-tools/nip44'
import { schnorr } from '@noble/curves/secp256k1.js'

const sha = (s) => createHash('sha256').update(s).digest()
const hex = (b) => Buffer.from(b).toString('hex')
const key = (label) => new Uint8Array(sha(`cyberspace vectors: ${label}`))
const AUX = new Uint8Array(32)
const sign = (unsigned, sk) => {
  const id = getEventHash(unsigned)
  return { ...unsigned, id, sig: hex(schnorr.sign(Buffer.from(id, 'hex'), sk, AUX)) }
}
// A rumor (CYBERSPACE_V2.md §7.6): the canonical id and no `sig` field.
const rumorOf = (unsigned) => ({ ...unsigned, id: getEventHash(unsigned) })
async function aesGcm(k, nonce, plaintext) {
  const ck = await webcrypto.subtle.importKey('raw', k, 'AES-GCM', false, ['encrypt'])
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, ck, new TextEncoder().encode(plaintext)))
  return Buffer.concat([Buffer.from(nonce), Buffer.from(ct)]).toString('base64')
}
const nonce12 = (label) => new Uint8Array(sha(`cyberspace vectors nonce: ${label}`).subarray(0, 12))
const nonce32 = (label) => new Uint8Array(sha(`cyberspace vectors nonce: ${label}`))

const hiderSk = key('hider'); const hider = getPublicKey(hiderSk)
const itemSk = key('item'); const item = getPublicKey(itemSk)
const senderSk = key('chest sender'); const sender = getPublicKey(senderSk)
const speakerSk = key('speaker'); const speaker = getPublicKey(speakerSk)
const regionKey = key('region key')
const lookupId = hex(sha(regionKey))
const C = 'c4924924924924924924920c53c81e9d260623340e5c3a75b6de6e4715cd1724'
const T = 1791800000

// DECK-0004 §2: a key item.
const keyItem = sign({ pubkey: hider, created_at: T, kind: 3340, content: 'Opens the vault under the bridge.', tags: [['C', C], ['title', 'Vapor Key'], ['item', item], ['secret', hex(itemSk)], ['-']] }, hiderSk)

// DECK-0004 §3: a chest sealed to the item's public key with a one-time sender key.
// The message inside is a rumor by the chest's signer, and it and the chest
// both carry NIP-70's `-` (CYBERSPACE_V2.md §7.6, Rumors and Protected items).
const message = rumorOf({ pubkey: hider, created_at: T, kind: 1, content: 'You found the secret sauce.', tags: [['C', C], ['-']] })
const chestPlaintext = JSON.stringify([message])
const convSeal = nip44.utils.getConversationKey(senderSk, item)
const payload = nip44.encrypt(chestPlaintext, convSeal, nonce32('chest'))
const convOpen = nip44.utils.getConversationKey(itemSk, sender)
if (hex(convSeal) !== hex(convOpen)) throw new Error('conversation keys differ')
if (nip44.decrypt(payload, convOpen) !== chestPlaintext) throw new Error('chest does not open')
const chest = sign({ pubkey: hider, created_at: T, kind: 3341, content: payload, tags: [['C', C], ['title', 'Vault'], ['lock', item, sender], ['requires', 'Vapor Key'], ['-']] }, hiderSk)

// DECK-0004 §4: an item listing.
const proofMessage = sha(`cyberspace:item-listing:${hider}:${item}`)
const proof = hex(schnorr.sign(proofMessage, itemSk, AUX))
const listing = sign({ pubkey: hider, created_at: T, kind: 33340, content: 'Opens the vault under the bridge.', tags: [['d', item], ['name', 'Vapor Key'], ['proof', proof]] }, hiderSk)

// DECK-0005: a chat line (an unsigned rumor) sealed in an ephemeral envelope.
const rumor = rumorOf({ pubkey: speaker, created_at: T, kind: 23333, content: 'meet at the port nostr:npub1placeholder', tags: [['d', lookupId], ['C', C], ['p', hider]] })
const chatPlain = JSON.stringify([rumor])
const chatPayload = await aesGcm(regionKey, nonce12('chat'), chatPlain)
const envelope = sign({ pubkey: speaker, created_at: T, kind: 23330, content: '', tags: [['d', lookupId], ['encrypted', 'aes-256-gcm', chatPayload], ['version', '2'], ['H', '12']] }, speakerSk)

// DECK-0006: a sealed comment on the key item, rooted at the bag.
const bagAddress = `33330:${hider}:${lookupId}`
const commentText = 'Took one. Thanks for the riddle.'
const commentCt = await aesGcm(regionKey, nonce12('comment'), commentText)
const comment = sign({ pubkey: speaker, created_at: T + 60, kind: 1111, content: 'This comment is hidden at an undisclosed location in cyberspace. Happy hunting: https://onosendai.tech', tags: [['A', bagAddress], ['K', '33330'], ['P', hider], ['e', keyItem.id, '', hider], ['k', '3340'], ['p', hider], ['encrypted', 'aes-256-gcm', commentCt, 'cyberspace:region']] }, speakerSk)

// DECK-0007: hidden audio. The file is a generated tone (never a recording):
// a mono 16-bit PCM WAV, 40 samples of a 440 Hz sine at 8000 Hz. It is
// encrypted with AES-256-GCM under a fresh key and nonce, ciphertext and tag
// raw, no nonce prefix (DECK-0007 §2.2), and the item, a rumor by the hider,
// carries both.
function toneWav(samples = 40, hz = 440, rate = 8000) {
  const data = samples * 2
  const b = Buffer.alloc(44 + data)
  b.write('RIFF', 0); b.writeUInt32LE(36 + data, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(data, 40)
  for (let i = 0; i < samples; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 0.3 * 32767), 44 + i * 2)
  return b
}
const audioFile = toneWav()
const audioKey = key('audio file')
const audioNonce = nonce12('audio file')
const audioCk = await webcrypto.subtle.importKey('raw', audioKey, 'AES-GCM', false, ['encrypt'])
const audioCipher = Buffer.from(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: audioNonce }, audioCk, audioFile))
const audioX = hex(sha(audioCipher))
const audioItem = rumorOf({ pubkey: hider, created_at: T, kind: 1063, content: 'Listen by the altar.', tags: [
  ['C', C], ['title', 'Temple bell'], ['url', `https://blossom.example/${audioX}`], ['m', 'audio/wav'], ['x', audioX], ['ox', hex(sha(audioFile))],
  ['size', String(audioCipher.length)], ['encryption-algorithm', 'aes-gcm'], ['decryption-key', hex(audioKey)], ['decryption-nonce', hex(audioNonce)],
  ['autoplay'], ['retrigger', 'once'], ['fade', '6'], ['walk'], ['-'],
] })
// DECK-0007 §4.2: how loud, at a few listeners, in a height-5 region (32 gibsons a side).
function exitDistance(from, dir, side) {
  let t = Infinity
  for (let i = 0; i < 3; i++) { if (dir[i] > 0) t = Math.min(t, (side - from[i]) / dir[i]); else if (dir[i] < 0) t = Math.min(t, -from[i] / dir[i]) }
  return t
}
function gain(src, lis, side, r) {
  if (!lis.every((v) => v >= 0 && v <= side)) return 0
  const dir = lis.map((v, i) => v - src[i]); const d = Math.hypot(...dir)
  if (d <= r) return 1
  const e = exitDistance(src, dir.map((v) => v / d), side)
  const t = Math.min(1, Math.max(0, (d - r) / (e - r)))
  return 1 - t * t * (3 - 2 * t)
}
const audioSource = [10.5, 16.5, 16.5]
const audioRadius = Math.min(6, ...audioSource.map((v) => Math.min(v, 32 - v)))
const audioGains = [[10.5, 16.5, 16.5], [16.5, 16.5, 16.5], [21.25, 16.5, 16.5], [26.75, 16.5, 16.5], [32, 16.5, 16.5], [0, 16.5, 16.5], [10.5, 26.5, 26.5], [33, 16.5, 16.5]]
  .map((listener) => ({ listener, gain: Number(gain(audioSource, listener, 32, audioRadius).toFixed(12)) }))

// CYBERSPACE_V2.md §7.6 (Sealed entries): bag entries carried by reference
// as kind 33335 events. Each payload is exactly the entry the bag would
// otherwise hold inline: the key item and the message above, unchanged. The
// `d` of each sealed entry is fixed here only to make the file reproducible; a
// real writer draws it at random for every placement.
const SEALED_KIND = 33335
const SEALED_PREVIEW = 'This is hidden at a place in cyberspace. Find it with ONOSENDAI: https://onosendai.tech'
const sealedD = (label) => hex(sha(`cyberspace vectors sealed entry d: ${label}`)).slice(0, 32)
async function aesGcmOpen(k, payloadB64) {
  const raw = Buffer.from(payloadB64, 'base64')
  const ck = await webcrypto.subtle.importKey('raw', k, 'AES-GCM', false, ['decrypt'])
  return new TextDecoder().decode(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.subarray(0, 12) }, ck, raw.subarray(12)))
}
async function sealEntry(label, entry, k, sk) {
  const plaintext = JSON.stringify(entry)
  const payload = await aesGcm(k, nonce12(`sealed entry: ${label}`), plaintext)
  if (await aesGcmOpen(k, payload) !== plaintext) throw new Error(`sealed entry ${label} does not open`)
  const event = sign({ pubkey: getPublicKey(sk), created_at: T, kind: SEALED_KIND, content: SEALED_PREVIEW, tags: [['d', sealedD(label)], ['encrypted', 'aes-256-gcm', payload, 'cyberspace:region'], ['alt', SEALED_PREVIEW]] }, sk)
  return { plaintext, aes_nonce: hex(nonce12(`sealed entry: ${label}`)), event }
}
const addressOf = (e) => `${e.kind}:${e.pubkey}:${e.tags.find((t) => t[0] === 'd')[1]}`
const RELAY = 'wss://cyberspace.nostr1.com'

// An ordinary bag: the chest inline, the key item and the message by reference.
const sealedKey = await sealEntry('key item', keyItem, regionKey, hiderSk)
const sealedMessage = await sealEntry('message', message, regionKey, hiderSk)
const bagEntries = [chest, ['a', addressOf(sealedKey.event), RELAY, C], ['a', addressOf(sealedMessage.event), '', C]]
const bagPlain = JSON.stringify(bagEntries)
const bagPayload = await aesGcm(regionKey, nonce12('bag with sealed entries'), bagPlain)
const bag = sign({ pubkey: hider, created_at: T + 1, kind: 33330, content: '', tags: [['d', lookupId], ['encrypted', 'aes-256-gcm', bagPayload], ['version', '2'], ['H', '12'], ['contents', 'message', '1'], ['contents', 'key', '1'], ['contents', 'chest', '1']] }, hiderSk)

// A room bag (DECK-0004 §3.7.2): the room key seals the room bag and every
// sealed entry it names.
const doorSecret = key('door secret')
const roomKey = new Uint8Array(sha(Buffer.concat([Buffer.from('cyberspace:door', 'utf8'), Buffer.from(regionKey), Buffer.from(doorSecret)])))
const roomLookupId = hex(sha(roomKey))
const roomMessage = rumorOf({ pubkey: hider, created_at: T, kind: 1, content: 'Behind the door, by reference.', tags: [['C', C], ['-']] })
const sealedRoom = await sealEntry('room message', roomMessage, roomKey, hiderSk)
const roomPlain = JSON.stringify([['a', addressOf(sealedRoom.event), RELAY, C]])
const roomPayload = await aesGcm(roomKey, nonce12('room bag with a sealed entry'), roomPlain)
const roomBag = sign({ pubkey: hider, created_at: T + 1, kind: 33330, content: '', tags: [['d', roomLookupId], ['encrypted', 'aes-256-gcm', roomPayload], ['version', '2']] }, hiderSk)
if (await aesGcmOpen(regionKey, roomBag.tags[1][2]).catch(() => null) !== null) throw new Error('the region key must not open the room bag')

// Entries a reader MUST drop.
const foreign = await sealEntry('foreign signer', rumorOf({ pubkey: speaker, created_at: T, kind: 1, content: 'Not the hider.', tags: [['C', C], ['-']] }), regionKey, speakerSk)
const nested = await sealEntry('nested', sealedMessage.event, regionKey, hiderSk)
const doorSender = key('door sender')
const doorPlain = JSON.stringify([['room', hex(doorSecret)]])
const doorSeal = nip44.encrypt(doorPlain, nip44.utils.getConversationKey(doorSender, item), nonce32('door'))
const door = sign({ pubkey: hider, created_at: T, kind: 3341, content: doorSeal, tags: [['C', C], ['title', 'Door'], ['lock', item, getPublicKey(doorSender)], ['requires', 'Vapor Key'], ['door', '12'], ['-']] }, hiderSk)
// Height 12, the bag's own: a reader that wrongly opened this door would
// derive the room key above from the bag's key and reach the room bag.
const sealedDoor = await sealEntry('door', door, regionKey, hiderSk)

// DECK-0004 §3.8: a region key and a room key as locks. The region is a real
// aligned cube, computed from a coordinate as CYBERSPACE_V2.md §2.3, §4.6,
// §4.7 and §7.2 compute it, so these vectors check the whole path from a
// coordinate to a lock.
const AXIS_BITS = 85
const xyzToCoord = (x, y, z, plane) => {
  let c = BigInt(plane & 1)
  for (let i = 0n; i < BigInt(AXIS_BITS); i++) {
    c |= ((z >> i) & 1n) << (1n + i * 3n)
    c |= ((y >> i) & 1n) << (2n + i * 3n)
    c |= ((x >> i) & 1n) << (3n + i * 3n)
  }
  return c
}
const cantorPair = (a, b) => { const s = a + b; return (s * (s + 1n)) / 2n + b }
const subtreeCantor = (base, h) => {
  let v = Array.from({ length: 2 ** h }, (_, i) => base + BigInt(i))
  for (let l = 0; l < h; l++) v = Array.from({ length: v.length / 2 }, (_, i) => cantorPair(v[2 * i], v[2 * i + 1]))
  return v[0]
}
const intToBytesBeMin = (n) => { let s = n.toString(16); if (s.length % 2) s = '0' + s; return Buffer.from(s, 'hex') }
function regionOf(x, y, z, plane, h) {
  const hb = BigInt(h)
  const base = [x, y, z].map((v) => (v >> hb) << hb)
  const regionN = cantorPair(cantorPair(subtreeCantor(base[0], h), subtreeCantor(base[1], h)), subtreeCantor(base[2], h))
  const locationKey = new Uint8Array(sha(intToBytesBeMin(regionN)))
  return { height: h, plane, base: base.map(String), base_coordinate: xyzToCoord(base[0], base[1], base[2], plane).toString(16).padStart(64, '0'), region_n: regionN.toString(), location_key: hex(locationKey), lookup_id: hex(sha(locationKey)), locationKey }
}
// The lock of a bag key: SHA-256(UTF-8("cyberspace:lock") || key), taken as a
// secp256k1 secret when it is nonzero and below the curve order n, and its
// BIP-340 x-only public key.
const CURVE_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
function lockOf(bagKey) {
  const preimage = Buffer.concat([Buffer.from('cyberspace:lock', 'utf8'), Buffer.from(bagKey)])
  const secret = new Uint8Array(sha(preimage))
  const d = BigInt('0x' + hex(secret))
  if (d === 0n || d >= CURVE_N) throw new Error('this key has no lock (DECK-0004 §3.8.1)')
  return { preimage: preimage.toString('hex'), lock_secret: hex(secret), lock: getPublicKey(secret), secret }
}
const lockPoint = { x: (1n << 84n) + 1234567n, y: (1n << 84n) - 89012n, z: (1n << 84n) + 3456n, plane: 0 }
const lockRegion = regionOf(lockPoint.x, lockPoint.y, lockPoint.z, lockPoint.plane, 4)
const lockRegionH5 = regionOf(lockPoint.x, lockPoint.y, lockPoint.z, lockPoint.plane, 5)
const lockRegionIdea = regionOf(lockPoint.x, lockPoint.y, lockPoint.z, 1, 4)
if (lockRegionIdea.location_key !== lockRegion.location_key) throw new Error('region_n has no plane bit: the ideaspace twin shares the key')
const regionLock = lockOf(lockRegion.locationKey)
const regionLockH5 = lockOf(lockRegionH5.locationKey)
if (regionLock.lock === regionLockH5.lock) throw new Error('heights 4 and 5 must give different locks')

// A chest sealed to the region's lock (§3.2, unchanged) and opened with the
// lock secret derived from the region key (§3.3, With an item).
const lockedSenderSk = key('region lock chest sender'); const lockedSender = getPublicKey(lockedSenderSk)
const lockedMessage = rumorOf({ pubkey: hider, created_at: T, kind: 1, content: 'You carried the right key here.', tags: [['C', C], ['-']] })
const lockedPlain = JSON.stringify([lockedMessage])
const lockedConvSeal = nip44.utils.getConversationKey(lockedSenderSk, regionLock.lock)
const lockedPayload = nip44.encrypt(lockedPlain, lockedConvSeal, nonce32('region lock chest'))
const lockedConvOpen = nip44.utils.getConversationKey(regionLock.secret, lockedSender)
if (hex(lockedConvSeal) !== hex(lockedConvOpen)) throw new Error('region lock conversation keys differ')
if (nip44.decrypt(lockedPayload, lockedConvOpen) !== lockedPlain) throw new Error('the region lock chest does not open')
// The region key itself is not the lock secret: used as one, it must not open the chest.
if (hex(nip44.utils.getConversationKey(lockRegion.locationKey, lockedSender)) === hex(lockedConvSeal)) throw new Error('the bare region key must not open the chest')
const lockedChest = sign({ pubkey: hider, created_at: T, kind: 3341, content: lockedPayload, tags: [['C', C], ['title', 'Grate'], ['lock', regionLock.lock, lockedSender], ['requires', 'Where the old light turned'], ['-']] }, hiderSk)

// A room key (§3.7.2) of the same region, and its lock.
const lockDoorSecret = key('lock room door secret')
const lockRoomKey = new Uint8Array(sha(Buffer.concat([Buffer.from('cyberspace:door', 'utf8'), Buffer.from(lockRegion.locationKey), Buffer.from(lockDoorSecret)])))
const roomLock = lockOf(lockRoomKey)
const strip = ({ secret, locationKey, ...rest }) => rest

// A door sealed to the region's lock, end to end: the lock secret opens the
// door, the door gives its door secret, and the door secret with the key of
// the door's own room gives the room key. The door stands at C, in its own
// region of height 4, far from the region its lock asks for.
const coordToXyz = (c) => {
  let x = 0n; let y = 0n; let z = 0n
  for (let i = 0n; i < BigInt(AXIS_BITS); i++) {
    z |= ((c >> (1n + i * 3n)) & 1n) << i
    y |= ((c >> (2n + i * 3n)) & 1n) << i
    x |= ((c >> (3n + i * 3n)) & 1n) << i
  }
  return [x, y, z, Number(c & 1n)]
}
const [cx, cy, cz, cplane] = coordToXyz(BigInt('0x' + C))
const doorRegion = regionOf(cx, cy, cz, cplane, 4)
const lockedDoorSecret = key('region lock door secret')
const lockedDoorSenderSk = key('region lock door sender'); const lockedDoorSender = getPublicKey(lockedDoorSenderSk)
const lockedDoorPlain = JSON.stringify([['room', hex(lockedDoorSecret)]])
const lockedDoorConv = nip44.utils.getConversationKey(lockedDoorSenderSk, regionLock.lock)
const lockedDoorPayload = nip44.encrypt(lockedDoorPlain, lockedDoorConv, nonce32('region lock door'))
const lockedDoorOpened = JSON.parse(nip44.decrypt(lockedDoorPayload, nip44.utils.getConversationKey(regionLock.secret, lockedDoorSender)))
if (lockedDoorOpened[0][1] !== hex(lockedDoorSecret)) throw new Error('the region lock door does not give its door secret')
const lockedDoor = sign({ pubkey: hider, created_at: T, kind: 3341, content: lockedDoorPayload, tags: [['C', C], ['title', 'Cistern door'], ['lock', regionLock.lock, lockedDoorSender], ['requires', 'Where the old light turned'], ['door', '4'], ['-']] }, hiderSk)
const lockedDoorRoomKey = new Uint8Array(sha(Buffer.concat([Buffer.from('cyberspace:door', 'utf8'), Buffer.from(doorRegion.locationKey), Buffer.from(lockedDoorSecret)])))

const utf8 = (s) => Buffer.byteLength(s, 'utf8')
const refKey = JSON.stringify(bagEntries[1])

console.log(JSON.stringify({
  note: 'Deterministic vectors. Keys are SHA-256("cyberspace vectors: <label>"); AES-GCM nonces are the first 12 bytes and the NIP-44 nonce all 32 bytes of SHA-256("cyberspace vectors nonce: <label>"); BIP-340 aux randomness is 32 zero bytes. Readers MUST accept any valid signature.',
  keys: { hider_secret: hex(hiderSk), hider, item_secret: hex(itemSk), item, chest_sender_secret: hex(senderSk), chest_sender: sender, speaker_secret: hex(speakerSk), speaker, region_key: hex(regionKey), lookup_id: lookupId },
  key_item: keyItem,
  chest: { plaintext: chestPlaintext, nip44_nonce: hex(nonce32('chest')), conversation_key: hex(convSeal), event: chest },
  item_listing: { proof_message: hex(proofMessage), event: listing },
  chat: { rumor, envelope_plaintext: chatPlain, aes_nonce: hex(nonce12('chat')), envelope },
  comment: { plaintext: commentText, aes_nonce: hex(nonce12('comment')), event: comment },
  audio: {
    file_hex: audioFile.toString('hex'), file_key: hex(audioKey), file_nonce: hex(audioNonce), ciphertext_hex: audioCipher.toString('hex'), item: audioItem,
    gain: { region_height: 5, side: 32, source: audioSource, fade: 6, radius: audioRadius, samples: audioGains },
  },
  sealed_entries: {
    note: 'CYBERSPACE_V2.md §7.6, Sealed entries. Each payload is exactly the entry the bag would otherwise hold inline. The fixed d values stand in for the random d a real writer draws for every placement.',
    key_item: sealedKey,
    message: sealedMessage,
    bag: { plaintext: bagPlain, aes_nonce: hex(nonce12('bag with sealed entries')), event: bag, reads_as: [chest.id, keyItem.id, message.id] },
    room: {
      door_secret: hex(doorSecret), room_key: hex(roomKey), room_lookup_id: roomLookupId,
      message: sealedRoom,
      bag: { plaintext: roomPlain, aes_nonce: hex(nonce12('room bag with a sealed entry')), event: roomBag, reads_as: [roomMessage.id] },
    },
    reject: {
      foreign_signer: { reference: ['a', addressOf(foreign.event), '', C], sealed: foreign, why: 'the sealed entry is not signed by the bag\'s signer' },
      nested: { reference: ['a', addressOf(nested.event), '', C], sealed: nested, why: 'the payload is itself a sealed entry' },
      door: { reference: ['a', addressOf(sealedDoor.event), '', C], sealed: sealedDoor, why: 'a door is never carried by reference' },
    },
    sizes: {
      key_item_inline_bytes: utf8(JSON.stringify(keyItem)),
      key_item_reference_bytes: utf8(refKey),
      key_item_reference_in_bag_bytes: Math.ceil(utf8(refKey) * 4 / 3),
    },
  },
  locks: {
    note: 'DECK-0004 §3.8. lock_secret = SHA-256(UTF-8("cyberspace:lock") || key), valid when nonzero and below the curve order; lock = its BIP-340 x-only public key. preimage is the 47 hashed bytes. region_n is decimal, given for the height 4 regions only. base is the region\'s aligned base on X, Y and Z, decimal. region_n carries no plane bit (CYBERSPACE_V2.md §4.7), so the region with the same X, Y, Z and height in ideaspace has the same location key and the same lock.',
    point: { x: String(lockPoint.x), y: String(lockPoint.y), z: String(lockPoint.z), plane: lockPoint.plane, coordinate: xyzToCoord(lockPoint.x, lockPoint.y, lockPoint.z, lockPoint.plane).toString(16).padStart(64, '0') },
    region: { ...strip(lockRegion), ideaspace_base_coordinate: lockRegionIdea.base_coordinate, ...strip(regionLock) },
    region_height_5: (({ region_n, ...r }) => r)({ ...strip(lockRegionH5), ...strip(regionLockH5) }),
    chest: { plaintext: lockedPlain, nip44_nonce: hex(nonce32('region lock chest')), conversation_key: hex(lockedConvSeal), opens_with_lock_secret: regionLock.lock_secret, event: lockedChest },
    door: {
      note: 'A door at C, sealed to region.lock. Its own room is the height 4 region that holds C, so its room key uses that region\'s location key (door_region), not region.location_key.',
      door_region: strip(doorRegion), plaintext: lockedDoorPlain, nip44_nonce: hex(nonce32('region lock door')), conversation_key: hex(lockedDoorConv), opens_with_lock_secret: regionLock.lock_secret,
      event: lockedDoor, door_secret: hex(lockedDoorSecret), room_key: hex(lockedDoorRoomKey), room_lookup_id: hex(sha(lockedDoorRoomKey)),
    },
    room: { location_key: lockRegion.location_key, door_secret: hex(lockDoorSecret), room_key: hex(lockRoomKey), room_lookup_id: hex(sha(lockRoomKey)), ...strip(roomLock) },
  },
}, null, 2))
