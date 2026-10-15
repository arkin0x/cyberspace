// Golden vectors for DECK-0004 (items, chests, item listings), DECK-0005
// (local chat) and DECK-0006 (sealed comments). Deterministic: every key is
// SHA-256 of a label, every nonce is fixed, and every BIP-340 signature uses
// 32 zero bytes of auxiliary randomness. A reader MUST accept any valid
// signature; the fixed aux only makes these files reproducible.
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
const message = sign({ pubkey: hider, created_at: T, kind: 1, content: 'You found the secret sauce.', tags: [['C', C]] }, hiderSk)
const chestPlaintext = JSON.stringify([message])
const convSeal = nip44.utils.getConversationKey(senderSk, item)
const payload = nip44.encrypt(chestPlaintext, convSeal, nonce32('chest'))
const convOpen = nip44.utils.getConversationKey(itemSk, sender)
if (hex(convSeal) !== hex(convOpen)) throw new Error('conversation keys differ')
if (nip44.decrypt(payload, convOpen) !== chestPlaintext) throw new Error('chest does not open')
const chest = sign({ pubkey: hider, created_at: T, kind: 3341, content: payload, tags: [['C', C], ['title', 'Vault'], ['lock', item, sender], ['requires', 'Vapor Key']] }, hiderSk)

// DECK-0004 §4: an item listing.
const proofMessage = sha(`cyberspace:item-listing:${hider}:${item}`)
const proof = hex(schnorr.sign(proofMessage, itemSk, AUX))
const listing = sign({ pubkey: hider, created_at: T, kind: 33340, content: 'Opens the vault under the bridge.', tags: [['d', item], ['name', 'Vapor Key'], ['proof', proof]] }, hiderSk)

// DECK-0005: a chat line (an unsigned rumor) sealed in an ephemeral envelope.
const rumorUnsigned = { pubkey: speaker, created_at: T, kind: 23333, content: 'meet at the port nostr:npub1placeholder', tags: [['d', lookupId], ['C', C], ['p', hider]] }
const rumor = { ...rumorUnsigned, id: getEventHash(rumorUnsigned) }
const chatPlain = JSON.stringify([rumor])
const chatPayload = await aesGcm(regionKey, nonce12('chat'), chatPlain)
const envelope = sign({ pubkey: speaker, created_at: T, kind: 23330, content: '', tags: [['d', lookupId], ['encrypted', 'aes-256-gcm', chatPayload], ['version', '2'], ['h', '12']] }, speakerSk)

// DECK-0006: a sealed comment on the key item, rooted at the bag.
const bagAddress = `33330:${hider}:${lookupId}`
const commentText = 'Took one. Thanks for the riddle.'
const commentCt = await aesGcm(regionKey, nonce12('comment'), commentText)
const comment = sign({ pubkey: speaker, created_at: T + 60, kind: 1111, content: 'This comment is hidden at an undisclosed location in cyberspace. Happy hunting: https://onosendai.tech', tags: [['A', bagAddress], ['K', '33330'], ['P', hider], ['e', keyItem.id, '', hider], ['k', '3340'], ['p', hider], ['encrypted', 'aes-256-gcm', commentCt, 'cyberspace:region']] }, speakerSk)

console.log(JSON.stringify({
  note: 'Deterministic vectors. Keys are SHA-256("cyberspace vectors: <label>"); AES-GCM nonces are the first 12 bytes and the NIP-44 nonce all 32 bytes of SHA-256("cyberspace vectors nonce: <label>"); BIP-340 aux randomness is 32 zero bytes. Readers MUST accept any valid signature.',
  keys: { hider_secret: hex(hiderSk), hider, item_secret: hex(itemSk), item, chest_sender_secret: hex(senderSk), chest_sender: sender, speaker_secret: hex(speakerSk), speaker, region_key: hex(regionKey), lookup_id: lookupId },
  key_item: keyItem,
  chest: { plaintext: chestPlaintext, nip44_nonce: hex(nonce32('chest')), conversation_key: hex(convSeal), event: chest },
  item_listing: { proof_message: hex(proofMessage), event: listing },
  chat: { rumor, envelope_plaintext: chatPlain, aes_nonce: hex(nonce12('chat')), envelope },
  comment: { plaintext: commentText, aes_nonce: hex(nonce12('comment')), event: comment },
}, null, 2))
