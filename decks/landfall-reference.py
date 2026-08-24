#!/usr/bin/env python3
"""DECK-0001 v3 section 1.2: reference landfall derivation (stdlib only).

landfall(block_hash_hex) -> coord256 hex of the stop on the WGS84 surface.

Runs in the base spec's decimal profile (precision 96, ROUND_HALF_EVEN, the
exact PI_STR, deterministic Taylor sin/cos) with every operation in the order
the DECK lists. Executing this file checks the DECK's eight golden vectors.
Independent implementations (this file, the ONOSENDAI client in decimal.js,
and the NTH publisher) produce byte-identical output.
"""
import hashlib
from decimal import Decimal, localcontext, ROUND_HALF_EVEN

LANDFALL_DOMAIN = b"CYBERSPACE_LANDFALL_V1"
PREC = 96
PI_STR = (
    "3.14159265358979323846264338327950288419716939937510"
    "58209749445923078164062862089986280348253421170679"
)
TRIG_EPS = Decimal("1e-88")
TRIG_MAX_ITER = 256
WGS84_A_M = Decimal("6378137")
WGS84_F = Decimal(1) / Decimal("298.257223563")
AXIS_BITS = 85
AXIS_MAX = (1 << AXIS_BITS) - 1
AXIS_CENTER = 1 << (AXIS_BITS - 1)
UNITS_PER_KM = Decimal(1000) * Decimal(2) ** 33


def _sin_cos(x, PI, TWO_PI, HALF_PI):
    x = x % TWO_PI
    if x > PI:
        x -= TWO_PI
    cos_sign = Decimal(1)
    if x > HALF_PI:
        x = PI - x
        cos_sign = Decimal(-1)
    elif x < -HALF_PI:
        x = -PI - x
        cos_sign = Decimal(-1)
    x2 = x * x
    sin_sum = sin_term = x
    for k in range(1, TRIG_MAX_ITER + 1):
        sin_term = -sin_term * x2 / Decimal((2 * k) * (2 * k + 1))
        sin_sum += sin_term
        if abs(sin_term) < TRIG_EPS:
            break
    else:
        raise ValueError("sin() did not converge")
    cos_sum = cos_term = Decimal(1)
    for k in range(1, TRIG_MAX_ITER + 1):
        cos_term = -cos_term * x2 / Decimal((2 * k - 1) * (2 * k))
        cos_sum += cos_term
        if abs(cos_term) < TRIG_EPS:
            break
    else:
        raise ValueError("cos() did not converge")
    return sin_sum, cos_sum * cos_sign


def _km_to_axis_u(km):
    u = km * UNITS_PER_KM + Decimal(AXIS_CENTER)
    u_int = int(u.to_integral_value(rounding=ROUND_HALF_EVEN))
    return max(0, min(AXIS_MAX, u_int))


def _xyz_to_coord(x, y, z, plane):
    coord = plane & 1
    for i in range(AXIS_BITS):
        coord |= ((z >> i) & 1) << (1 + i * 3)
        coord |= ((y >> i) & 1) << (2 + i * 3)
        coord |= ((x >> i) & 1) << (3 + i * 3)
    return coord


def landfall(block_hash_hex: str) -> str:
    h = bytes.fromhex(block_hash_hex)
    if len(h) != 32:
        raise ValueError("block hash must be 32 bytes of hex")
    seed = hashlib.sha256(LANDFALL_DOMAIN + h).digest()
    with localcontext() as ctx:
        ctx.prec = PREC
        ctx.rounding = ROUND_HALF_EVEN
        PI = Decimal(PI_STR)
        TWO_PI = PI * 2
        HALF_PI = PI / 2
        u1 = Decimal(int.from_bytes(seed[0:16], "big")) / Decimal(1 << 128)
        u2 = Decimal(int.from_bytes(seed[16:32], "big")) / Decimal(1 << 128)
        lon = (Decimal(2) * u1 - 1) * PI
        z = Decimal(2) * u2 - 1
        rxy = (Decimal(1) - z * z).sqrt()
        sin_lon, cos_lon = _sin_cos(lon, PI, TWO_PI, HALF_PI)
        dx, dy, dz = rxy * cos_lon, rxy * sin_lon, z
        b_m = WGS84_A_M * (Decimal(1) - WGS84_F)
        inv = ((dx * dx + dy * dy) / (WGS84_A_M * WGS84_A_M) + (dz * dz) / (b_m * b_m)).sqrt()
        r = Decimal(1) / inv
        km = Decimal(1000)
        # Axis permutation per CYBERSPACE_V2 section 9.4: X_cs=X, Y_cs=Z, Z_cs=Y.
        x = _km_to_axis_u(r * dx / km)
        y = _km_to_axis_u(r * dz / km)
        zc = _km_to_axis_u(r * dy / km)
        return format(_xyz_to_coord(x, y, zc, 0), "064x")


GOLDEN = [
    ("000000002f7d702a27ccd65158740198f79d4ba1ddea8ab14b56b63a6289fe89",
     "56db6db6db6db6db6db6db3e27c436f9d3b79fb5fc6457798936b3e749e38f56"),
    ("000000000003cb256436f213199e7047e187ab99e6d3176262bfb9be49d2a31a",
     "3b6db6db6db6db6db6db6d1eb09e85e5f572906af5a025a39ae284dd83278b72"),
    ("0000000000000000212f189879294318528669d239d5fbd30e6ffcc6015ced21",
     "c492492492492492492492c7807ba8ecefd0a48a7b41dfbb50da5947b489ed8c"),
    ("000000000000000001e65a8804c7d97ee1fd52394632bdebdaf402935dcddeec",
     "a9249249249249249249258087f30451bd8dd013357959fe2b07fa052488980c"),
    ("000000000000000000521f92387f9f43258f62465e9f88b19ecad2c30e44d7ff",
     "3b6db6db6db6db6db6db6d312f699ee9f35318557d9ee813b46f229215524a30"),
    ("00000000000000000005608e4c1ff53901186e766df5eaa87c636857ed814fa9",
     "56db6db6db6db6db6db6dbfdb284c1592e0d02ffd65f9d6c12d48a2b483d7da0"),
    ("00000000000000000001e412795ed39b18e56338e9b3c20d91edf59d20e020c9",
     "c4924924924924924924920c53c81e9d260623340e5c3a75b6de6e4715cd1724"),
    ("00000000000000000001f081b994866dc3beb2c3ecd5976e9bda474e54e027c1",
     "e000000000000000000000618f9c2d172da11fc0701996d4a89df1f60aecf732"),
]

if __name__ == "__main__":
    for block_hash, expected in GOLDEN:
        got = landfall(block_hash)
        assert got == expected, f"vector mismatch for {block_hash}: {got}"
    print(f"all {len(GOLDEN)} landfall golden vectors ok")
