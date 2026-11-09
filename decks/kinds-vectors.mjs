// Golden vectors for DECK-0004 (items, chests, item listings), DECK-0005
// (local chat), DECK-0006 (sealed comments), DECK-0007 (hidden audio) and the
// sealed entries of CYBERSPACE_V2.md §7.6 (kind 33333). Deterministic: every key is
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
// as kind 33333 events. Each payload is exactly the entry the bag would
// otherwise hold inline: the key item and the message above, unchanged. The
// `d` of each sealed entry is fixed here only to make the file reproducible; a
// real writer draws it at random for every placement.
const SEALED_KIND = 33333
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
const door = sign({ pubkey: hider, created_at: T, kind: 3341, content: doorSeal, tags: [['C', C], ['title', 'Door'], ['lock', item, getPublicKey(doorSender)], ['requires', 'Vapor Key'], ['door', '4'], ['-']] }, hiderSk)
const sealedDoor = await sealEntry('door', door, regionKey, hiderSk)

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
}, null, 2))
