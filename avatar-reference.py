#!/usr/bin/env python3
"""The work an avatar owes (CYBERSPACE_V2 section 8.10), as an executable statement (stdlib only).

This file computes what section 8.10 computes: the bits an avatar's shape owes, the limit on its
content, and the verdict a reader reaches on an avatar event. It also writes and checks
avatar-vectors.json, the golden vectors every implementation of section 8.10 tests itself
against, so that a port in any language uses the same values without running Python. Each port
copies avatar-vectors.json unchanged into its fixtures.

Neither this file nor the vectors are normative. Where they disagree with the text of
CYBERSPACE_V2.md, the text is right and this file is a bug.

The price. The bits owed are the floor, plus two bits for each doubling of reach, plus one and a
half bits for each doubling of detail beyond the free thirty-two. The terms are summed as real
numbers and the total is rounded up once, never term by term:

    required = ceil(10 + 2 log2(reach) + 1.5 log2(detail / 32))

  * reach: the farthest any vertex lies from the build origin, on any axis, in gibsons at true
    scale (a model unit is 2^unit gibsons), never counted below one gibson
  * detail: the number of vertices plus the number of faces, never counted below thirty-two

The limit. An avatar's content is at most 131,072 bytes (128 KiB), counted as the UTF-8 length
of the content string.

Mining (non-normative). A reader checks only the id and the committed target, so a publisher may
vary anything in the event while mining. This file's miner puts the nonce in a field named
`nonce`, written as the last field of the payload, so that SHA-256 can hash everything before
it once and hash only the last block on each try. It leads the nonce with zeros up to a block
boundary when the last partial block before it has too little room left, so that each try is
exactly one compression of SHA-256 whatever the size of the avatar. The nonce tag then carries
"0" as its first value and the committed target as its second. That is one way to mine, kept
here so that ports can check their own miner byte for byte against it; the verdict does not
depend on it.

The file holds these groups (see the "format" field of the vectors):

  * price: payloads with their reach, detail, the bits before rounding, the bits owed, and the
    bits the same shape owed before 2026-11 (never less than now)
  * bits: reach and detail pairs with the bits owed, including sums whose terms are fractional,
    which show that the total is rounded up and not each term
  * corpus: the avatars measured in the 2026-11 avatar study (the three published at the time,
    a 98 KB figure and generated shapes from 225 bytes to 206 KiB), with their size, reach and
    detail and the bits owed; their payloads are not reproduced here
  * content_limit: content lengths at and around the limit, refused or not
  * verdicts: avatar events and the verdict a reader reaches on each, among them events mined
    by this file's miner with the nonce at the end of the content, whose ids are real

Usage:
  python3 -I avatar-reference.py                      runs the self-check and prints a summary
  python3 -I avatar-reference.py --write              writes avatar-vectors.json next to this file
  python3 -I avatar-reference.py --write --corpus DIR also reads every DIR/*.sno.json into the corpus
                                                      group (otherwise the group on disk is kept)
  python3 -I avatar-reference.py --check              exits 1 unless the file on disk is what --write
                                                      would write and every vector holds
"""
import argparse
import hashlib
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VECTORS_NAME = "avatar-vectors.json"

AVATAR_KIND = 11333
AVATAR_FLOOR_BITS = 10      # every avatar
AVATAR_SIZE_BITS = 2        # per doubling of reach
AVATAR_DETAIL_BITS = 1.5    # per doubling of detail beyond the free thirty-two (three per fourfold)
AVATAR_DETAIL_FREE = 32
AVATAR_CONTENT_MAX = 131072  # bytes of content, UTF-8 (128 KiB)
TICKS_PER_UNIT = 120

# The rule before 2026-11, for the vectors' comparison only.
BEFORE_FLOOR_BITS = 16
BEFORE_DETAIL_BITS = 3


def unpack_ticks(packed, count):
    """The ticks column, one triple per vertex; -N stands for N zero triples."""
    out = []
    for item in packed or []:
        if isinstance(item, int) and not isinstance(item, bool):
            out.extend([[0, 0, 0]] * (-item))
        else:
            out.append([item[a] if len(item) > a else 0 for a in range(3)])
    while len(out) < count:
        out.append([0, 0, 0])
    return out[:count]


def avatar_reach(payload):
    """The farthest any vertex lies from the build origin, on any axis, in gibsons at true scale."""
    unit = payload.get("unit", 0) or 0
    vertices = payload["vertices"]
    ticks = unpack_ticks(payload.get("ticks"), len(vertices))
    reach = 0.0
    for i, v in enumerate(vertices):
        for a in range(3):
            reach = max(reach, abs((v[a] if len(v) > a else 0) + ticks[i][a] / TICKS_PER_UNIT))
    return reach * (2 ** unit)


def avatar_detail(payload):
    return len(payload["vertices"]) + len(payload.get("faces") or [])


def raw_bits(reach, detail, floor=AVATAR_FLOOR_BITS, detail_bits=AVATAR_DETAIL_BITS):
    """The bits before rounding up: every term summed as a real number."""
    reach = max(1.0, reach)
    detail = max(AVATAR_DETAIL_FREE, detail)
    return floor + AVATAR_SIZE_BITS * math.log2(reach) + detail_bits * math.log2(detail / AVATAR_DETAIL_FREE)


def avatar_bits(reach, detail):
    """The bits owed for a reach in gibsons and a detail: the sum, rounded up once."""
    return math.ceil(raw_bits(reach, detail))


def avatar_bits_before(reach, detail):
    return math.ceil(raw_bits(reach, detail, BEFORE_FLOOR_BITS, BEFORE_DETAIL_BITS))


def avatar_work(payload):
    """The leading zero bits an avatar event's id must carry for this payload."""
    return avatar_bits(avatar_reach(payload), avatar_detail(payload))


def content_bytes(content):
    return len(content.encode("utf-8"))


def leading_zero_bits(hex_str):
    """Leading zero bits of a hex string, as NIP-13 counts them."""
    n = 0
    for ch in hex_str:
        try:
            nib = int(ch, 16)
        except ValueError:
            break
        if nib == 0:
            n += 4
            continue
        n += 4 - nib.bit_length()
        break
    return n


def serialize(event):
    """NIP-01: the id is the SHA-256 of this UTF-8 JSON array."""
    return json.dumps([0, event["pubkey"], event["created_at"], event["kind"], event["tags"], event["content"]],
                      separators=(",", ":"), ensure_ascii=False)


def event_id(event):
    return hashlib.sha256(serialize(event).encode("utf-8")).hexdigest()


def verify_avatar(event):
    """The verdict of section 8.10 on an avatar event: ok, required, committed, zeros, reason.

    The reasons, in the order they are tested: not-an-avatar (another kind, or content that is
    not a payload), too-large (content over the limit, tested before the content is parsed),
    no-nonce, under-committed (the committed target is below the price), unpaid (the id carries
    fewer zeros than the committed target), ok. Empty content is the default avatar; it owes no
    work and is drawn as the default, which is the caller's to handle before asking for a verdict.
    """
    zeros = leading_zero_bits(event.get("id", ""))
    verdict = {"ok": False, "required": 0, "committed": None, "zeros": zeros}
    if event.get("kind") != AVATAR_KIND:
        return {**verdict, "reason": "not-an-avatar"}
    content = event.get("content", "")
    if content_bytes(content) > AVATAR_CONTENT_MAX:
        return {**verdict, "reason": "too-large"}
    try:
        payload = json.loads(content)
    except (ValueError, TypeError):
        return {**verdict, "reason": "not-an-avatar"}
    if not isinstance(payload, dict) or not isinstance(payload.get("vertices"), list):
        return {**verdict, "reason": "not-an-avatar"}
    required = avatar_work(payload)
    nonce = next((t for t in event.get("tags", []) if t and t[0] == "nonce"), None)
    committed = int(nonce[2]) if nonce and len(nonce) > 2 and str(nonce[2]).isdigit() else None
    verdict = {**verdict, "required": required, "committed": committed}
    if committed is None:
        return {**verdict, "reason": "no-nonce"}
    if committed < required:
        return {**verdict, "reason": "under-committed"}
    if zeros < committed:
        return {**verdict, "reason": "unpaid"}
    return {**verdict, "ok": True, "reason": "ok"}


# ---------------------------------------------------------------- mining (non-normative)

NONCE_DIGITS_MAX = 16   # the most digits a try's nonce has; room is kept for them in the last block
MARK = "\u0000NONCE\u0000"


def tailed_content(content, nonce):
    """The content with a `nonce` field as the last field of the payload (any earlier one dropped)."""
    payload = json.loads(content)
    if "nonce" in payload:
        del payload["nonce"]
        content = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    stripped = content.rstrip()
    if not stripped.endswith("}"):
        raise ValueError("the content is not a JSON object")
    body = stripped[:-1]
    sep = "" if body.rstrip().endswith("{") else ","
    return body + sep + '"nonce":"' + nonce + '"}'


def tail_split(event, target):
    """The serialized event cut around the nonce: (pre, post, lead), where every try hashes
    pre + lead + digits + post and `lead` is the zeros that move the digits to a block boundary
    when the last partial block of `pre` has too little room for them, `post` and the padding."""
    fields = dict(event)
    fields["tags"] = [t for t in event["tags"] if not (t and t[0] == "nonce")] + [["nonce", "0", str(target)]]
    fields["content"] = tailed_content(event["content"], MARK)
    ser = serialize(fields).encode("utf-8")
    mark = json.dumps(MARK, ensure_ascii=False)[1:-1].encode("utf-8")
    pre, post = ser.split(mark)
    rem = len(pre) % 64
    lead = "0" * (64 - rem) if rem + NONCE_DIGITS_MAX + len(post) + 9 > 64 else ""
    return pre, post, lead


def mine_tail(event, target, start=0, limit=1 << 26):
    """Mine `event` (pubkey, created_at, kind, tags, content) to `target` with the nonce at the end
    of the content: the nonces start, start + 1, ... each led by the zeros tail_split gives.
    Returns the event to sign (its id included), and the tries it took."""
    pre, post, lead = tail_split(event, target)
    mid = hashlib.sha256(pre + lead.encode())
    for n in range(start, start + limit):
        h = mid.copy()
        h.update(str(n).encode() + post)
        digest = h.hexdigest()
        if leading_zero_bits(digest) >= target:
            nonce = lead + str(n)
            out = dict(event)
            out["tags"] = [t for t in event["tags"] if not (t and t[0] == "nonce")] + [["nonce", "0", str(target)]]
            out["content"] = tailed_content(event["content"], nonce)
            out["id"] = digest
            assert event_id(out) == digest
            return out, n - start + 1
    raise RuntimeError("no nonce found within the limit")


# ---------------------------------------------------------------- the vectors

def cube(r, unit=0):
    vs = [[x, y, z] for x in (-r, r) for y in (-r, r) for z in (-r, r)]
    fs = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1],
          [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
    return {"unit": unit, "vertices": vs, "faces": fs}


def small_and_busy():
    """Two hundred vertices within a gibson and 312 faces: detail 512, reach one."""
    vs = [[x % 3 - 1, (x // 3) % 3 - 1, (x // 9) % 2] for x in range(200)]
    return {"unit": 0, "vertices": vs, "faces": [[i % 200, (i + 1) % 200, (i + 2) % 200] for i in range(312)]}


PRICE_CASES = [
    ("one gibson, plain", {"unit": 0, "vertices": [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], "faces": [[0, 1, 2], [0, 2, 3]]}),
    ("half gibson, ticks", {"unit": 0, "vertices": [[0, 0, 0], [-1, -1, -1]], "ticks": [[60, 60, 60], [60, 60, 60]], "faces": []}),
    ("two gibsons", cube(2)),
    ("four gibsons", cube(4)),
    ("sixteen gibsons via unit", cube(4, unit=2)),
    ("a thousand and twenty-four gibsons", cube(1, unit=10)),
    ("detailed but small", small_and_busy()),
    ("packed zero ticks", {"unit": 0, "vertices": [[3, 0, 0], [0, 0, 0]], "ticks": [-2], "faces": []}),
    ("a gibson and a half, ticks", {"unit": 0, "vertices": [[1, 0, 0], [0, 0, 0]], "ticks": [[60, 0, 0], -1], "faces": []}),
    ("negative unit", cube(4, unit=-1)),
]

BITS_CASES = [
    # (reach, detail): the floor, then each term alone, then sums of fractional terms
    (1, 8), (0.25, 31), (1, 32), (1, 33), (1, 64), (1, 128), (1, 1024), (2, 32), (4, 32), (16, 32), (1000, 32),
    (2 ** 85, 32), (1.5, 48), (3, 32), (3, 5510), (1.4, 42), (5, 210), (3, 6398), (4, 6213), (2, 1008),
]

CONTENT_LIMIT_CASES = [0, 65536, 131071, 131072, 131073, 262144]

# A throwaway pubkey (no one holds its secret key); the mined vectors are unsigned, since a
# verdict never reads the signature: a reader checks it as it checks any event's.
VECTOR_PUBKEY = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
VECTOR_CREATED_AT = 1763251200


def ship_payload():
    return {"v": 2, "name": "Ship", "unit": 0, "extent": 8, "mode": "solid",
            "vertices": [[0, 1, 0], [-1, 1, 0], [0, 1, -2], [0, 1, 1], [-1, 1, 0], [0, 1, 0], [0, 1, 0], [0, 0, 0], [-1, 0, 0], [1, 0, 0], [-1, 1, 0], [-1, 1, 1], [-1, 1, 0], [0, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 1], [-1, 1, 1]],
            "ticks": [[48, 0, 0], [72, 0, 0], [0, 0, 96], -1, [72, 24, 72], [48, 24, 72], [0, 48, 0], [0, 96, 0], [0, 96, 72], [0, 96, 72], [48, 0, 96], [96, 0, 0], [72, 24, 96], [24, 0, 0], [72, 0, 96], [48, 24, 96], [48, 0, 24], [72, 0, 24]],
            "colors": [64, 64, 64, 251, 59, 59, 64, 251, 59, 59, 249, 249, 249, 249, 249, 249, 238, 238],
            "faces": [[9, 0, 5], [4, 1, 8], [2, 0, 7], [1, 2, 7], [2, 6, 0], [1, 6, 2], [6, 1, 3], [3, 0, 6], [3, 7, 0], [3, 1, 7], [3, 0, 9], [3, 8, 1], [4, 3, 1], [5, 0, 3], [4, 8, 3], [5, 3, 9], [15, 14, 13], [11, 10, 12], [17, 12, 10], [12, 17, 11], [10, 11, 17], [15, 13, 16], [14, 15, 16], [14, 16, 13]],
            "opacity": 95}


def compact(payload):
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def mined_vectors():
    """Events mined by mine_tail, deterministic: the same template always finds the same nonce."""
    out = []
    plain = compact(PRICE_CASES[0][1])
    ship = compact(ship_payload())
    # A name of seven characters moves the nonce near the end of a block, so the miner leads it with zeros.
    long_name = "x" * 7
    for name, content, tags, target in [
        ("one gibson, nonce at the end, at its price", plain, [["name", "one"]], avatar_bits(1, 32)),
        ("Ship, nonce at the end, at its price", ship, [["name", "Ship"]], None),
        ("Ship, nonce at the end, at the price before 2026-11", ship, [["name", "Ship"]], "before"),
        ("one gibson, nonce led with zeros to a block boundary", plain, [["name", long_name]], avatar_bits(1, 32)),
    ]:
        payload = json.loads(content)
        reach, detail = avatar_reach(payload), avatar_detail(payload)
        if target is None:
            target = avatar_bits(reach, detail)
        elif target == "before":
            target = avatar_bits_before(reach, detail)
        template = {"pubkey": VECTOR_PUBKEY, "created_at": VECTOR_CREATED_AT, "kind": AVATAR_KIND, "tags": tags, "content": content}
        pre, post, lead = tail_split(template, target)
        event, tries = mine_tail(template, target)
        out.append({"name": name, "template": template, "target": target, "lead": lead, "tries": tries,
                    "event": event, "verdict": verify_avatar(event)})
    return out


def synthetic_verdicts():
    """Events whose ids are made up to carry a given number of zeros: the verdict reads only the id."""
    content = compact(PRICE_CASES[0][1])
    def ev(zeros, committed, kind=AVATAR_KIND, body=content, first="12345"):
        tags = [["name", "one"]] + ([["nonce", first, committed]] if committed is not None else [])
        return {"kind": kind, "pubkey": VECTOR_PUBKEY, "created_at": VECTOR_CREATED_AT, "tags": tags, "content": body,
                "id": "0" * (zeros // 4) + "f" * (64 - zeros // 4)}
    prefix, suffix = '{"vertices":[[0,0,0]],"faces":[],"pad":"', '"}'
    fill_at_limit = AVATAR_CONTENT_MAX - len(prefix) - len(suffix)
    at_limit = prefix + "a" * fill_at_limit + suffix
    big = prefix + "a" * (fill_at_limit + 1) + suffix
    assert content_bytes(big) == AVATAR_CONTENT_MAX + 1 and content_bytes(at_limit) == AVATAR_CONTENT_MAX
    cases = [
        ("paid at the floor", ev(12, "10")),
        ("paid with zeros to spare", ev(20, "10")),
        ("committed above the price, id short of the commitment", ev(12, "16")),
        ("committed below the price", ev(20, "8")),
        ("no nonce tag", ev(20, None)),
        ("a target that is not digits", ev(20, "ten")),
        ("the first value of the nonce tag means nothing", ev(12, "10", first="0")),
        ("another kind", ev(20, "10", kind=1)),
        ("content that is not json", ev(20, "10", body="not json")),
        ("vertices that are not a list", ev(20, "10", body='{"vertices":"no"}')),
        ("content at the limit, paid", ev(12, "10", body=at_limit)),
        ("content one byte over the limit, paid", ev(12, "10", body=big)),
    ]
    out = []
    for name, e in cases:
        v = verify_avatar(e)
        if len(e["content"]) > 1024:
            # Keep the file small: describe the content instead of carrying 128 KiB of it.
            count = len(e["content"]) - len(prefix) - len(suffix)
            assert e["content"] == prefix + "a" * count + suffix
            e = {**e, "content": None, "content_recipe": {"prefix": prefix, "fill": "a", "count": count, "suffix": suffix}}
        out.append({"name": name, "event": e, "verdict": v})
    return out


def build(corpus):
    price = []
    for name, payload in PRICE_CASES:
        reach, detail = avatar_reach(payload), avatar_detail(payload)
        price.append({"name": name, "payload": payload, "reach": reach, "detail": detail,
                      "raw_bits": round(raw_bits(reach, detail), 9), "required": avatar_work(payload),
                      "required_before_2026_11": avatar_bits_before(reach, detail)})
    bits = [{"reach": r, "detail": d, "raw_bits": round(raw_bits(r, d), 9), "required": avatar_bits(r, d),
             "required_before_2026_11": avatar_bits_before(r, d)} for r, d in BITS_CASES]
    limit = [{"bytes": b, "refused": b > AVATAR_CONTENT_MAX} for b in CONTENT_LIMIT_CASES]
    return {
        "format": {
            "about": "Golden vectors of the work an avatar owes, CYBERSPACE_V2.md section 8.10, written by avatar-reference.py. Not normative: where they disagree with the text, the text is right.",
            "constants": "The constants of section 8.10.",
            "price": "Payloads: reach (gibsons, before the floor of one), detail (vertices plus faces, before the floor of 32), raw_bits (the sum before rounding, to 9 places), required (the bits owed), required_before_2026_11 (the bits the rule before 2026-11 asked; never less than required).",
            "bits": "Reach and detail pairs, without payloads, with the same fields. A port tests its price function on them directly.",
            "corpus": "The avatars measured in the 2026-11 avatar study: bytes (UTF-8 length of the content), vertices, faces, reach, required, required_before_2026_11 and refused (content over the limit: a reader draws the default whatever work it carries). The payloads are not reproduced; a port tests its price function on reach and vertices plus faces.",
            "content_limit": "Content lengths in bytes and whether a reader refuses them.",
            "verdicts": "Events and the verdict section 8.10 reaches on each. Synthetic events carry made-up ids with a given number of zeros. An event whose content is null carries content_recipe instead: prefix, then fill repeated count times, then suffix.",
            "mined": "Events mined by this file's miner with the nonce as the last field of the content (non-normative; the verdict does not depend on how an id was found). template is the event before mining, target the committed bits, lead the zeros the miner put before the nonce's digits, tries the nonces it tried from 0. The events are unsigned: a verdict never reads the signature.",
        },
        "constants": {"kind": AVATAR_KIND, "floor_bits": AVATAR_FLOOR_BITS, "size_bits": AVATAR_SIZE_BITS,
                      "detail_bits": AVATAR_DETAIL_BITS, "detail_free": AVATAR_DETAIL_FREE,
                      "content_max": AVATAR_CONTENT_MAX, "ticks_per_unit": TICKS_PER_UNIT},
        "price": price,
        "bits": bits,
        "corpus": corpus,
        "content_limit": limit,
        "verdicts": synthetic_verdicts(),
        "mined": mined_vectors(),
    }


def read_corpus(directory):
    rows = []
    for f in sorted(os.listdir(directory)):
        if not f.endswith(".sno.json"):
            continue
        with open(os.path.join(directory, f), encoding="utf-8") as fh:
            content = fh.read().strip()
        payload = json.loads(content)
        reach, detail = avatar_reach(payload), avatar_detail(payload)
        rows.append({"name": f[: -len(".sno.json")], "bytes": content_bytes(content),
                     "vertices": len(payload["vertices"]), "faces": len(payload.get("faces") or []),
                     "reach": round(reach, 9), "required": avatar_bits(reach, detail),
                     "required_before_2026_11": avatar_bits_before(reach, detail),
                     "refused": content_bytes(content) > AVATAR_CONTENT_MAX})
    return rows


def dump(data):
    return json.dumps(data, indent=1, ensure_ascii=False) + "\n"


def self_check(data):
    """Every vector holds, and every claim section 8.10 makes about the price."""
    for v in data["price"]:
        assert abs(avatar_reach(v["payload"]) - v["reach"]) < 1e-9, v["name"]
        assert avatar_work(v["payload"]) == v["required"], v["name"]
    for v in data["price"] + data["bits"] + data["corpus"]:
        detail = v.get("detail", v.get("vertices", 0) + v.get("faces", 0))
        assert avatar_bits(v["reach"], detail) == v["required"], v
        # No shape costs more than it did before 2026-11.
        assert v["required"] <= v["required_before_2026_11"], v
    for v in data["content_limit"]:
        assert (v["bytes"] > AVATAR_CONTENT_MAX) == v["refused"]
    for v in data["verdicts"]:
        e = dict(v["event"])
        if e["content"] is None:
            r = e.pop("content_recipe")
            e["content"] = r["prefix"] + r["fill"] * r["count"] + r["suffix"]
        assert verify_avatar(e) == v["verdict"], v["name"]
    for v in data["mined"]:
        e = v["event"]
        assert event_id(e) == e["id"], v["name"]
        assert leading_zero_bits(e["id"]) >= v["target"], v["name"]
        assert verify_avatar(e) == v["verdict"] and v["verdict"]["ok"], v["name"]
        assert json.loads(e["content"])["nonce"].isdigit()
        assert e["content"].endswith('"}') and '"nonce":"' in e["content"][-40 - len(v["lead"]):]
    # The ladder section 8.10 quotes.
    assert [avatar_bits(r, 32) for r in (1, 2, 4, 16, 1000)] == [10, 12, 14, 18, 30]
    assert avatar_bits(2 ** 85, 32) == 180
    # The rounding is of the sum, not of each term: 1.17 + 0.88 is 2.05, which rounds up to 3, not to 1 + 1.
    assert avatar_bits(1.5, 48) == 13
    # A reach under a gibson and a detail under 32 cost nothing beyond the floor.
    assert avatar_bits(0.25, 8) == AVATAR_FLOOR_BITS
    # Detail is priced below reach, per doubling.
    assert AVATAR_DETAIL_BITS < AVATAR_SIZE_BITS


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--corpus", metavar="DIR")
    ap.add_argument("--out", default=os.path.join(HERE, VECTORS_NAME))
    args = ap.parse_args()
    on_disk = None
    if os.path.exists(args.out):
        with open(args.out, encoding="utf-8") as fh:
            on_disk = fh.read()
    corpus = read_corpus(args.corpus) if args.corpus else (json.loads(on_disk)["corpus"] if on_disk else [])
    data = build(corpus)
    self_check(data)
    text = dump(data)
    if args.write:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {args.out} ({len(text.encode())} bytes, sha256 {hashlib.sha256(text.encode()).hexdigest()})")
    elif args.check:
        if on_disk != text:
            print(f"{args.out} is not what --write would write", file=sys.stderr)
            sys.exit(1)
        print(f"{args.out} holds: {len(data['price'])} price, {len(data['bits'])} bits, {len(data['corpus'])} corpus, "
              f"{len(data['verdicts'])} verdict and {len(data['mined'])} mined vectors")
    else:
        print("self-check passed")
        for v in data["bits"]:
            print(f"  reach {v['reach']:>8g}  detail {v['detail']:>5}  {v['raw_bits']:>7.3f} bits -> {v['required']:>3}  (before 2026-11: {v['required_before_2026_11']})")


if __name__ == "__main__":
    main()
