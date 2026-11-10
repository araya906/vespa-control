"""Generate the original SVG illustrations in img/species and img/nests.

Usage: python3 tools/art.py   (writes into img/; app icons: rsvg-convert img/icon.svg and tools/icon-maskable.svg to PNG)
Illustrations are schematic and drawn from published descriptions; no photos are traced.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SPECIES = {
    "velutina": dict(scale=0.92, head="#1d1612", face="#e8941a", thorax="#1a1410", legs="#2a1d14", tips="#f2c14e",
                     wing="#5a4a3a", segs=["#2a1d14", "#2a1d14", "#2a1d14", "#e8941a", "#d07a12", "#3a2a1d"],
                     edges=["#f0b429", "#f0b429", "#c9962a", None, None, None], spots=False),
    "orientalis": dict(scale=1.0, head="#8a3a17", face="#f2c230", thorax="#7a3214", legs="#9b4a22", tips="#c96a2a",
                       wing="#8a6a50", segs=["#8a3a17", "#8a3a17", "#f2c230", "#f2c230", "#8a3a17", "#7a3214"],
                       edges=[None] * 6, spots=False),
    "crabro": dict(scale=1.0, head="#a3411c", face="#f0c531", thorax="#5a2a16", legs="#a3411c", tips="#c9732a",
                   wing="#a08a70", segs=["#6a2f17", "#f0c531", "#f0c531", "#f0c531", "#f0c531", "#e0b020"],
                   edges=["#f0c531", None, None, None, None, None], spots=True),
}

LEGS = [((82, 70), (56, 52), (46, 38)), ((80, 86), (50, 100), (38, 122)), ((84, 100), (58, 142), (50, 184))]


def legs(c):
    out = []
    for (a, b, d) in LEGS:
        for m in (1, -1):
            f = (lambda p: (p[0] if m == 1 else 200 - p[0], p[1]))
            pa, pb, pd = f(a), f(b), f(d)
            out.append(f'<path d="M{pa[0]} {pa[1]} L{pb[0]} {pb[1]}" stroke="{c["legs"]}" stroke-width="5" stroke-linecap="round"/>')
            out.append(f'<path d="M{pb[0]} {pb[1]} L{pd[0]} {pd[1]}" stroke="{c["tips"]}" stroke-width="4" stroke-linecap="round"/>')
    return "".join(out)


def abdomen(c, name):
    top, h = 110, 104
    seg_h = h / 6
    parts = [f'<clipPath id="ab-{name}"><ellipse cx="100" cy="162" rx="32" ry="52"/></clipPath><g clip-path="url(#ab-{name})">']
    for i, col in enumerate(c["segs"]):
        y = top + i * seg_h
        parts.append(f'<rect x="60" y="{y:.1f}" width="80" height="{seg_h + 0.5:.1f}" fill="{col}"/>')
        if c["edges"][i]:
            parts.append(f'<rect x="60" y="{y + seg_h - 3:.1f}" width="80" height="3" fill="{c["edges"][i]}"/>')
        if c["spots"] and 1 <= i <= 4:
            parts.append(f'<path d="M100 {y:.1f} l-7 0 l7 {seg_h * 0.6:.1f} l7 -{seg_h * 0.6:.1f}z" fill="#2a1a10"/>')
            for dx in (-18, 18):
                parts.append(f'<circle cx="{100 + dx}" cy="{y + seg_h * 0.45:.1f}" r="3.2" fill="#2a1a10"/>')
    parts.append('</g><ellipse cx="100" cy="162" rx="32" ry="52" fill="none" stroke="#0004" stroke-width="1.5"/>')
    return "".join(parts)


def hornet(name, c):
    s = c["scale"]
    body = (
        legs(c)
        + f'<path d="M92 30 Q80 10 66 6 M108 30 Q120 10 134 6" stroke="{c["head"]}" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        + f'<ellipse cx="100" cy="40" rx="20" ry="15" fill="{c["head"]}"/>'
        + f'<ellipse cx="100" cy="48" rx="13" ry="7" fill="{c["face"]}"/>'
        + '<ellipse cx="84" cy="37" rx="6" ry="10" fill="#120c08"/><ellipse cx="116" cy="37" rx="6" ry="10" fill="#120c08"/>'
        + f'<ellipse cx="100" cy="78" rx="24" ry="26" fill="{c["thorax"]}"/>'
        + f'<ellipse cx="100" cy="99" rx="12" ry="5" fill="{c["thorax"]}" stroke="#0003"/>'
        + f'<ellipse cx="100" cy="108" rx="7" ry="5" fill="{c["thorax"]}"/>'
        + abdomen(c, name)
        + f'<g fill="{c["wing"]}" fill-opacity=".35" stroke="{c["wing"]}" stroke-opacity=".8" stroke-width="1.2">'
        + '<ellipse cx="70" cy="118" rx="13" ry="54" transform="rotate(16 70 118)"/>'
        + '<ellipse cx="130" cy="118" rx="13" ry="54" transform="rotate(-16 130 118)"/>'
        + '<ellipse cx="78" cy="128" rx="9" ry="34" transform="rotate(10 78 128)"/>'
        + '<ellipse cx="122" cy="128" rx="9" ry="34" transform="rotate(-10 122 128)"/></g>'
    )
    g = f'<g transform="translate({100 - 100 * s:.1f} {125 - 125 * s:.1f}) scale({s})">{body}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" role="img">{g}</svg>\n'


def mini(x, y, k=1.0, body="#2a1d14", band="#e8941a"):
    return (f'<g transform="translate({x} {y}) scale({k})"><ellipse cx="0" cy="0" rx="6" ry="3" fill="{body}"/>'
            f'<rect x="1" y="-3" width="2.5" height="6" fill="{band}"/><ellipse cx="-2" cy="-4" rx="4" ry="2" fill="#fff" fill-opacity=".6"/></g>')


def stripes(x0, x1, y0, y1, step, col):
    return "".join(f'<path d="M{x0} {y} q15 -4 30 0 t30 0 t30 0 t30 0" stroke="{col}" stroke-width="2" fill="none"/>'
                   for y in range(y0, y1, step))


def nest_primary():
    return ('<rect width="240" height="200" fill="#eef3ea"/>'
            '<path d="M0 0h240v34l-240 18z" fill="#8a5a3c"/>'
            + "".join(f'<rect x="{x}" y="0" width="10" height="44" fill="#6e4429"/>' for x in (30, 110, 190))
            + '<path d="M120 46 v14" stroke="#9a8060" stroke-width="3"/>'
            '<clipPath id="np"><circle cx="120" cy="92" r="34"/></clipPath>'
            '<circle cx="120" cy="92" r="34" fill="#cdb48f"/>'
            f'<g clip-path="url(#np)">{stripes(70, 170, 66, 126, 8, "#a8916c")}</g>'
            '<path d="M112 124 q8 10 16 0 v8 q-8 6 -16 0z" fill="#b39a76"/><ellipse cx="120" cy="131" rx="5" ry="3" fill="#2a1d14"/>'
            + mini(150, 140) + mini(95, 150, 0.9) + '<path d="M20 186h200" stroke="#9fb39a" stroke-width="3"/>')


def nest_secondary():
    return ('<rect width="240" height="200" fill="#e6f0f6"/><rect y="182" width="240" height="18" fill="#a7c49a"/>'
            '<path d="M112 200 V90 M112 130 L80 96 M112 110 L150 70 M112 96 L118 50" stroke="#6e4c33" stroke-width="9" stroke-linecap="round" fill="none"/>'
            '<g fill="#5e8f4e" fill-opacity=".85"><circle cx="70" cy="80" r="34"/><circle cx="160" cy="62" r="36"/>'
            '<circle cx="112" cy="40" r="34"/><circle cx="95" cy="100" r="26"/></g>'
            '<clipPath id="ns"><path d="M150 46 q22 2 24 30 q2 34 -24 44 q-26 -10 -24 -44 q2 -28 24 -30z"/></clipPath>'
            '<path d="M150 46 q22 2 24 30 q2 34 -24 44 q-26 -10 -24 -44 q2 -28 24 -30z" fill="#d8c3a0"/>'
            f'<g clip-path="url(#ns)">{stripes(110, 200, 52, 120, 7, "#b59b74")}</g>'
            '<ellipse cx="170" cy="82" rx="4" ry="5" fill="#2a1d14"/>' + mini(196, 92) + mini(186, 112, 0.9)
            + '<g fill="#3d4a5a"><circle cx="46" cy="148" r="6"/><rect x="41" y="155" width="10" height="20" rx="4"/>'
            '<rect x="42" y="174" width="3.5" height="10"/><rect x="47" y="174" width="3.5" height="10"/></g>'
            '<path d="M62 182 V60" stroke="#3d4a5a" stroke-width="1.5" stroke-dasharray="4 3"/>'
            '<path d="M58 66 l4 -8 l4 8" fill="none" stroke="#3d4a5a" stroke-width="1.5"/>'
            '<text x="6" y="118" font-family="sans-serif" font-size="13" fill="#3d4a5a">&gt;10 m</text>')


def comb(cx, cy, w, rows):
    out = []
    for r in range(rows):
        y = cy + r * 9
        out.append(f'<rect x="{cx - w / 2}" y="{y}" width="{w}" height="5" rx="2" fill="#c9a77a"/>')
        out.append(f'<path d="M{cx} {y + 5} v4" stroke="#8a6a4a" stroke-width="2"/>')
    return "".join(out)


def nest_orientalis():
    return ('<rect width="240" height="200" fill="#f6ecd8"/><rect y="70" width="240" height="130" fill="#a9825c"/>'
            '<path d="M0 70h240" stroke="#7da35f" stroke-width="5"/>'
            '<g fill="#b9b0a2" stroke="#8d8576">' + "".join(
                f'<rect x="{x}" y="{y}" width="26" height="14" rx="3"/>' for y in (12, 27, 42, 57) for x in (178 + (y % 2) * 6, 205))
            + '</g><ellipse cx="194" cy="46" rx="4" ry="3" fill="#2a140a"/>'
            '<ellipse cx="70" cy="72" rx="7" ry="3" fill="#2a140a"/>'
            '<path d="M70 74 q4 30 30 44" stroke="#5e3e24" stroke-width="10" fill="none" stroke-linecap="round"/>'
            '<ellipse cx="120" cy="140" rx="46" ry="34" fill="#d9c09a" stroke="#6b4a2c" stroke-width="2"/>'
            + comb(120, 118, 60, 5)
            + mini(64, 50, 1, "#8a3a17", "#f2c230") + mini(84, 36, 0.9, "#8a3a17", "#f2c230") + mini(206, 34, 0.9, "#8a3a17", "#f2c230"))


def nest_crabro():
    return ('<rect width="240" height="200" fill="#eef3ea"/><rect y="182" width="240" height="18" fill="#a7c49a"/>'
            '<path d="M90 200 V10 h60 V200z" fill="#7a5638"/>'
            '<path d="M100 40 v140 M138 20 v150" stroke="#62432a" stroke-width="2"/>'
            '<ellipse cx="120" cy="96" rx="15" ry="22" fill="#2b1c11"/>'
            '<clipPath id="nc"><ellipse cx="120" cy="96" rx="15" ry="22"/></clipPath>'
            f'<g clip-path="url(#nc)"><ellipse cx="120" cy="104" rx="13" ry="16" fill="#b9946a"/>{stripes(100, 140, 92, 120, 5, "#8f6f4c")}</g>'
            + mini(150, 80, 1, "#6a2f17", "#f0c531") + mini(160, 104, 0.9, "#6a2f17", "#f0c531"))


def wrap(inner):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" role="img">{inner}</svg>\n'


def main():
    (ROOT / "img/species").mkdir(parents=True, exist_ok=True)
    (ROOT / "img/nests").mkdir(parents=True, exist_ok=True)
    for name, c in SPECIES.items():
        (ROOT / f"img/species/{name}.svg").write_text(hornet(name, c), encoding="utf-8")
    nests = {"velutina-primary": nest_primary, "velutina-secondary": nest_secondary,
             "orientalis-cavity": nest_orientalis, "crabro-hollow": nest_crabro}
    for name, fn in nests.items():
        (ROOT / f"img/nests/{name}.svg").write_text(wrap(fn()), encoding="utf-8")


if __name__ == "__main__":
    main()
