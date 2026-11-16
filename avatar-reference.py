#!/usr/bin/env python3
"""What a reader checks on an avatar event (CYBERSPACE_V2 section 8.10), as an executable statement (stdlib only).

An avatar (kind 11333) carries no proof of work. A reader draws it when its content is within the
limit of 131,072 bytes (128 KiB, counted as UTF-8) and holds a payload the reader can read, and
draws its default avatar for that identity otherwise. A `nonce` tag, which avatars published
before 2026-11 carry, is ignored, whatever it commits to and whatever the id carries.

This file writes and checks avatar-vectors.json, the golden vectors every implementation of
section 8.10 tests itself against, so that a port in any language uses the same values without
running Python. Each port copies avatar-vectors.json unchanged into its fixtures.

Neither this file nor the vectors are normative. Where they disagree with the text of
CYBERSPACE_V2.md, the text is right and this file is a bug. The verdict covers section 8.10
only: a reader still validates a payload by DECK-0003 section 1.9 before it draws one, and some
payloads here are not valid SNO (they lack `v`, `name` or `colors`).

The file holds these groups (see the "format" field of the vectors):

  * content_limit: content lengths at and around the limit, refused or not
  * corpus: avatars measured in 2026-11 (the three published at the time, a 98 KB figure and
    generated shapes from 225 bytes to 206 KiB), with their size and whether a reader refuses
    them; their payloads are not reproduced here
  * verdicts: avatar events and the verdict a reader reaches on each, among them events that
    carry a nonce tag committing to any target, with any number of zeros on the id

Usage:
  python3 -I avatar-reference.py                      runs the self-check
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
AVATAR_CONTENT_MAX = 131072  # bytes of content, UTF-8 (128 KiB)


def content_bytes(content):
    """The content's length as the limit counts it. A lone surrogate counts three bytes, as a
    JavaScript TextEncoder writes it."""
    return len(content.encode("utf-8", errors="surrogatepass"))


def is_number(x):
    if isinstance(x, bool) or not isinstance(x, (int, float)):
        return False
    try:
        return math.isfinite(float(x))
    except OverflowError:
        return False  # an integer too large for a float, which JSON.parse reads as Infinity


def readable(payload):
    """Whether a payload is one a reader can read at all: content a client cannot read is not an
    avatar. vertices is a list of lists whose first three entries, where present, are numbers;
    ticks, where present, is a list whose entries are a run (a whole number, zero or below) or a
    list whose first three entries, where present, are numbers; faces, where present, is a list."""
    if not isinstance(payload, dict) or not isinstance(payload.get("vertices"), list):
        return False
    triple = lambda v: isinstance(v, list) and all(is_number(x) for x in v[:3])
    if not all(triple(v) for v in payload["vertices"]):
        return False
    ticks = payload.get("ticks")
    if ticks is not None and not (isinstance(ticks, list) and all(
            (is_number(t) and t <= 0 and t == int(t)) or triple(t) for t in ticks)):
        return False
    faces = payload.get("faces")
    return faces is None or isinstance(faces, list)


def refuse_constant(name):
    raise ValueError(f"{name} is not JSON")


def verify_avatar(event):
    """The verdict of section 8.10 on an avatar event: {"ok": bool, "reason": str}.

    The reasons, in the order they are tested: not-an-avatar (another kind, content that is not a
    string, or content that is not a readable payload), too-large (content over the limit, tested
    before the content is parsed), ok. Tags are not read: a `nonce` tag means nothing here. Empty
    content is the default avatar, which is the caller's to handle before asking for a verdict.
    """
    if event.get("kind") != AVATAR_KIND:
        return {"ok": False, "reason": "not-an-avatar"}
    content = event.get("content", "")
    if not isinstance(content, str):
        return {"ok": False, "reason": "not-an-avatar"}
    if content_bytes(content) > AVATAR_CONTENT_MAX:
        return {"ok": False, "reason": "too-large"}
    try:
        # NaN and Infinity are not JSON. Integers are read as floats, as JSON.parse reads them, so
        # one too long for a float becomes infinity instead of failing Python's integer-length limit.
        payload = json.loads(content, parse_constant=refuse_constant, parse_int=float)
    except (ValueError, TypeError, RecursionError):
        return {"ok": False, "reason": "not-an-avatar"}
    if not readable(payload):
        return {"ok": False, "reason": "not-an-avatar"}
    return {"ok": True, "reason": "ok"}


# ---------------------------------------------------------------- the vectors

CONTENT_LIMIT_CASES = [0, 65536, 131071, 131072, 131073, 262144]

# The secp256k1 generator point, whose secret key is 1 and known to everyone: never use it for a
# real event. The events are unsigned and their ids made up: a verdict reads neither.
VECTOR_PUBKEY = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
VECTOR_CREATED_AT = 1763251200
PLAIN = '{"unit":0,"vertices":[[0,0,0],[1,0,0],[0,1,0],[0,0,1]],"faces":[[0,1,2],[0,2,3]]}'


def synthetic_verdicts():
    def ev(body=PLAIN, kind=AVATAR_KIND, tags=None, zeros=0):
        return {"kind": kind, "pubkey": VECTOR_PUBKEY, "created_at": VECTOR_CREATED_AT,
                "tags": [["name", "one"]] + (tags or []), "content": body,
                "id": "0" * (zeros // 4) + "f" * (64 - zeros // 4)}
    prefix, suffix = '{"vertices":[[0,0,0]],"faces":[],"pad":"', '"}'
    fill_at_limit = AVATAR_CONTENT_MAX - len(prefix) - len(suffix)
    at_limit = prefix + "a" * fill_at_limit + suffix
    big = prefix + "a" * (fill_at_limit + 1) + suffix
    # Two-byte characters: under the limit counted in characters, at and over it in bytes.
    wide_at = prefix + "é" * (fill_at_limit // 2) + suffix
    wide_over = prefix + "a" + "é" * (fill_at_limit // 2) + suffix
    # Lone surrogates, three bytes each as a JavaScript TextEncoder writes them.
    lone_n = (fill_at_limit - 2) // 3
    lone_at = prefix + "a" * (fill_at_limit - 3 * lone_n) + "\ud800" * lone_n + suffix
    lone_over = prefix + "a" * (fill_at_limit - 3 * lone_n + 1) + "\ud800" * lone_n + suffix
    assert content_bytes(lone_at) == AVATAR_CONTENT_MAX and content_bytes(lone_over) == AVATAR_CONTENT_MAX + 1
    assert content_bytes(big) == AVATAR_CONTENT_MAX + 1 and content_bytes(at_limit) == AVATAR_CONTENT_MAX
    assert content_bytes(wide_at) == AVATAR_CONTENT_MAX and content_bytes(wide_over) == AVATAR_CONTENT_MAX + 1
    assert len(wide_over) < AVATAR_CONTENT_MAX
    cases = [
        ("a plain avatar, no nonce tag", ev()),
        ("published before 2026-11 with its work: the nonce tag is ignored", ev(tags=[["nonce", "52113", "16"]], zeros=17)),
        ("a nonce tag committing to more than the id carries", ev(tags=[["nonce", "1", "40"]], zeros=4)),
        ("a nonce tag whose target is not digits", ev(tags=[["nonce", "x", "ten"]])),
        ("a large reach and much detail cost nothing", ev(body='{"unit":10,"vertices":' + json.dumps([[i % 7 - 3, i % 5 - 2, i % 3 - 1] for i in range(300)], separators=(",", ":")) + ',"faces":[]}')),
        ("a payload with no vertices", ev(body='{"vertices":[]}')),
        ("another kind", ev(kind=1)),
        ("content that is not json", ev(body="not json")),
        ("empty content (the default avatar, the caller's to handle first)", ev(body="")),
        ("vertices that are not a list", ev(body='{"vertices":"no"}')),
        ("a coordinate that is not a number", ev(body='{"vertices":[["x",0,0],[1,0,0]]}')),
        ("a coordinate that is null", ev(body='{"vertices":[[null,0,0]]}')),
        ("a vertex that is not a list", ev(body='{"vertices":[null]}')),
        ("a tick that is not a number", ev(body='{"vertices":[[0,0,0]],"ticks":[["zz",0,0]]}')),
        ("a tick that is a boolean", ev(body='{"vertices":[[0,0,0],[0,0,0]],"ticks":[true,[240,0,0]]}')),
        ("a run of ticks that is not a whole number", ev(body='{"vertices":[[0,0,0]],"ticks":[-0.5]}')),
        ("a run of ticks far longer than the vertices", ev(body='{"vertices":[[0,0,0]],"ticks":[-1e300]}')),
        ("faces that are not a list", ev(body='{"vertices":[[0,0,0]],"faces":"abc"}')),
        ("faces and ticks that are null are absent", ev(body='{"vertices":[[0,0,0]],"faces":null,"ticks":null}')),
        ("a fourth entry in a vertex is not read", ev(body='{"vertices":[[0,0,0,"x"],[1,0]]}')),
        ("NaN in a field the reader does not read", ev(body='{"vertices":[[0,0,0]],"note":NaN}')),
        ("a 5,000-digit integer in a field the reader does not read", ev(body='{"vertices":[[0,0,0]],"note":' + "9" * 5000 + '}')),
        ("a NaN coordinate", ev(body='{"vertices":[[NaN,0,0]]}')),
        ("an integer too large for a float", ev(body='{"vertices":[[' + "9" * 400 + ',0,0]]}')),
        ("content at the limit", ev(body=at_limit)),
        ("content one byte over the limit", ev(body=big)),
        ("content of two-byte characters at the limit in bytes", ev(body=wide_at)),
        ("content of two-byte characters one byte over the limit", ev(body=wide_over)),
        ("content over the limit that is not json: refused for its size", ev(body="x" * (AVATAR_CONTENT_MAX + 1))),
        ("content of lone surrogates at the limit in bytes", ev(body=lone_at)),
        ("content of lone surrogates one byte over the limit", ev(body=lone_over)),
    ]
    out = []
    for name, e in cases:
        v = verify_avatar(e)
        if len(e["content"]) > 8192:
            # Keep the file small: describe the content instead of carrying 128 KiB of it.
            c = e["content"]
            if c.startswith(prefix):
                body = c[len(prefix):-len(suffix)]
                rest = body.lstrip("a")
                lead = body[: len(body) - len(rest)] if rest[:1] in ("é", "\ud800") else ""
                recipe = {"prefix": prefix + lead, "fill": body[len(lead)], "count": len(body) - len(lead), "suffix": suffix}
            else:
                recipe = {"prefix": "", "fill": c[0], "count": len(c), "suffix": ""}
            assert recipe["prefix"] + recipe["fill"] * recipe["count"] + recipe["suffix"] == c
            e = {**e, "content": None, "content_recipe": recipe}
        out.append({"name": name, "event": e, "verdict": v})
    return out


def build(corpus):
    return {
        "format": {
            "about": "Golden vectors of what a reader checks on an avatar event, CYBERSPACE_V2.md section 8.10, written by avatar-reference.py. Not normative: where they disagree with the text, the text is right. The verdicts cover section 8.10 only; a reader still validates a payload by DECK-0003 section 1.9 before drawing it, and some payloads here are not valid SNO. An avatar carries no proof of work: no verdict reads a tag.",
            "constants": "The constants of section 8.10.",
            "content_limit": "Content lengths in bytes (UTF-8) and whether a reader refuses them.",
            "corpus": "Avatars measured in 2026-11 (the three then published, marked published, a 98 KB figure, generated shapes): bytes (UTF-8 length of the content), vertices, faces and refused (content over the limit: a reader draws the default). The payloads are not reproduced.",
            "verdicts": "Events and the verdict section 8.10 reaches on each, {ok, reason}, reason one of ok, not-an-avatar, too-large. Ids are made up and events unsigned: a verdict reads neither. An event whose content is null carries content_recipe instead: prefix, then fill repeated count times, then suffix.",
        },
        "constants": {"kind": AVATAR_KIND, "content_max": AVATAR_CONTENT_MAX},
        "content_limit": [{"bytes": b, "refused": b > AVATAR_CONTENT_MAX} for b in CONTENT_LIMIT_CASES],
        "corpus": corpus,
        "verdicts": synthetic_verdicts(),
    }


# The three avatars published before 2026-11-16, as fetched from relay.onosendai.tech.
PUBLISHED = {"xor-stella-octangula", "ship", "guy"}


def read_corpus(directory):
    rows = []
    for f in sorted(os.listdir(directory)):
        if not f.endswith(".sno.json"):
            continue
        with open(os.path.join(directory, f), encoding="utf-8") as fh:
            content = fh.read().strip()
        payload = json.loads(content)
        rows.append({"name": f[: -len(".sno.json")], "published": f[: -len(".sno.json")] in PUBLISHED, "bytes": content_bytes(content),
                     "vertices": len(payload["vertices"]), "faces": len(payload.get("faces") or []),
                     "refused": content_bytes(content) > AVATAR_CONTENT_MAX})
    return rows


def dump(data):
    # ASCII only, so that lone surrogates are written as escapes a JSON parser reads back.
    return json.dumps(data, indent=1, ensure_ascii=True) + "\n"


def self_check(data):
    for v in data["content_limit"] + data["corpus"]:
        assert (v["bytes"] > AVATAR_CONTENT_MAX) == v["refused"], v
    for v in data["verdicts"]:
        e = dict(v["event"])
        if e["content"] is None:
            r = e.pop("content_recipe")
            e["content"] = r["prefix"] + r["fill"] * r["count"] + r["suffix"]
        assert verify_avatar(e) == v["verdict"], v["name"]
        # No verdict depends on a tag: the same event without its tags reaches the same verdict.
        assert verify_avatar({**e, "tags": []}) == v["verdict"], v["name"]
    # The operative figure fits; the generated knights over the limit do not.
    names = {c["name"]: c for c in data["corpus"]}
    if names:
        assert not names["operative-v3"]["refused"] and names["ps1-knight-plus"]["refused"]
        assert sum(c["published"] for c in data["corpus"]) == 3 and not any(c["refused"] for c in data["corpus"] if c["published"])


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
    if args.corpus:
        corpus = read_corpus(args.corpus)
    else:
        corpus = [{k: c[k] for k in ("name", "published", "bytes", "vertices", "faces", "refused")} for c in (json.loads(on_disk)["corpus"] if on_disk else [])]
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
        print(f"{args.out} holds: {len(data['content_limit'])} content limit, {len(data['corpus'])} corpus and {len(data['verdicts'])} verdict vectors")
    else:
        print("self-check passed")


if __name__ == "__main__":
    main()
