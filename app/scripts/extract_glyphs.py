"""Split Posy's segment-designs.svg into per-glyph segment lists and derive digit maps.

Usage: python3 -I app/scripts/extract_glyphs.py segment-designs.svg OUT
(or `pnpm glyphs` from app/). OUT ending in .json is the app's data
(src/core/segments/glyphs.json); anything else is the mockup's `window.GLYPHS` script.

Needs Inkscape on PATH: `inkscape --query-all` gives every element's bounding box in
document order, which saves us from evaluating SVG path geometry here.

A glyph's segment index is its child order in the SVG. Reordering shapes in the sheet
silently changes which segment is which, so treat the sheet as frozen.
"""

import itertools
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

SVG_NS = 'http://www.w3.org/2000/svg'
NS = '{%s}' % SVG_NS
SHAPES = ('path', 'rect', 'polygon', 'ellipse', 'circle')
ET.register_namespace('', SVG_NS)


def tag(e):
    return e.tag.replace(NS, '')


# Raw sheet caption -> (family name, variant names or None for numbered variants).
FAMILIES = {
    'Sports': ('Sports', None),
    'Sports Rounder': ('Sports Rounder', None),
    'Sports Black': ('Sports Black', None),
    'Sports Black 9 segment': ('Sports Black 9', None),
    'Seamless Regular, Bold, Black': ('Seamless', ['Regular', 'Bold', 'Black']),
    'Seamless Tangram': ('Seamless Tangram', None),
    'Seamless Round': ('Seamless Round', None),
    'Ugly': ('Ugly', None),
    'Classic': ('Classic', None),
    'Classic Bold': ('Classic Bold', None),
    'Classic Black': ('Classic Black', None),
    'Default': ('Default', None),
    'Verticals Priority Symmetrical, Asymmetrical': ('Verticals Priority', ['Symmetrical', 'Asymmetrical']),
    'Default Black': ('Default Black', None),
    'Double Bubble': ('Double Bubble', None),
    'Half Bubble, 7 and 17 segm.': ('Half Bubble', ['7 seg', '17 seg']),
    'X Bubble': ('X Bubble', None),
    '9 segments (bleh..)': ('9 Segments', None),
    'Solid 11 segm. Regular, Bold': ('Solid 11', ['Regular', 'Bold']),
    'Sharp Traced* and Bold, 9,8,7 segm.': ('Sharp', ['Traced', 'Bold']),
    'Sharp Based 5 segm.': ('Sharp 5', None),
    'Round 5 segm.': ('Round 5', None),
    '4 Segments': ('4 Segments', None),
    'X Black': ('X Black', None),
    'X light': ('X Light', None),
    'X 7 Segments Black': ('X7 Black', None),
    'X 7 Segments Regular': ('X7 Regular', None),
    'X 7 Segments Light': ('X7 Light', None),
    'FreeForm 6 segments': ('FreeForm 6', None),
    'Freeform 7 segm.': ('FreeForm 7', None),
    'X 13 segm.': ('X13', None),
    'X 15 segm.': ('X15', None),
    'X Light 15 segm.': ('X Light 15', None),
    'X Ugly 9 segm.': ('X Ugly 9', None),
    '3*5 Matrix': ('3×5 Matrix', None),
    'Fake 5*7 Matrix (color coded)': ('Fake 5×7', ['7 seg', '18 seg']),
    'Fake 3*5 Matrix (color coded)': ('Fake 3×5', ['10 seg', '10 seg B', '8 seg']),
    '14 segment (with dot 15)': ('14 Segment', None),
    'No Compromise': ('No Compromise', None),
}

# Designs the automatic maps get wrong, or can't map at all, drawn by hand and checked
# digit by digit. Each segment gets a role in SEVEN's letters: 'f' lights with f, 'af'
# with a or f (a corner piece), '&bg' only with both (an inner corner), '' never.
HAND = {
    # The middle bar is split in three. Its outer pieces also join the verticals:
    # both light for 0, only the right for 1 and 7; the centre stays dark.
    'sports-black-9-1': ['e', 'efg', 'g', 'f', 'bcg', 'd', 'c', 'a', 'b'],
    'sports-black-9-2': ['f', 'g', 'efg', 'e', 'b', 'd', 'bcg', 'c', 'a'],
    'sports-black-9-3': ['e', 'f', 'g', 'b', 'efg', 'bcg', 'c', 'd', 'a'],
    'sports-black-9-4': ['g', 'f', 'e', 'efg', 'd', 'c', 'bcg', 'a', 'b'],
    # Inner middle joints also connect the verticals in 0, 1 and 7. Each outer
    # wedge fills a straight side only when both its upper and lower strokes light.
    'half-bubble-17-seg': ['b', 'f', 'a', 'af', 'e', 'de', 'c', 'd', 'bcg', '&ef', '&bg', 'efg', '&cg', '&bc',
                           '&eg', '&fg', 'g'],
    # The middle runs as a slant; the piece at the right of it joins b and c too.
    'solid-11-regular': ['g', 'bcg', 'g', 'e', 'c', 'a', 'e', 'd', 'f', 'b', ''],
    'solid-11-bold': ['', 'f', 'e', 'bcg', 'g', 'a', 'g', 'c', 'd', 'b', '&de'],
    # Seven outer bars plus an upper and lower diagonal, used in the overrides below.
    '9-segments-1': ['f', '', 'b', '', 'a', 'e', 'c', 'd', 'g'],
    '9-segments-2': ['f', 'e', 'b', '', '', 'g', 'c', 'd', 'a'],
    # Five pieces: the lower two hook round to the bottom. 0 and 8 match; 7 is drawn short, apart from 3.
    'sharp-5-1': ['b', 'a', 'f', 'e', 'c'],
    # Four quarters, lit with their side: several digits share a shape.
    '4-segments-1': ['b', 'f', 'c', 'e'],
    # Drawn outright below.
    'sharp-traced': [], 'sharp-bold': [], 'round-5-1': [], 'x13-1': [], 'x-ugly-9-1': [],
    '14-segment-1': [], '14-segment-2': [], 'no-compromise-1': [],
}
# Sharp's script digits share segment order in both drawings. The zero is a lower
# loop, 6 uses the upper-right curve, and only 4 uses the little middle-right tick.
# Digit sequence: https://www.youtube.com/shorts/oMmxs_z5rMs
SHARP_DIGITS = {
    0: [5, 6, 8],
    1: [2, 7],
    2: [0, 1, 5, 8],
    3: [0, 1, 6, 8],
    4: [2, 3, 4, 7],
    5: [1, 3, 6, 8],
    6: [0, 5, 6, 8],
    7: [0, 1, 7],
    8: [0, 1, 3, 5, 6, 8],
    9: [0, 1, 3, 7],
}
# Digits a role table can't draw, given outright: segment indexes, 0–9.
HAND_DIGITS = {
    # The lower diagonal replaces the stepped leg of 2 and the upright tails of 7 and 9.
    'solid-11-regular': {2: [0, 1, 3, 5, 7, 9, 10], 7: [0, 1, 3, 5, 9, 10], 9: [0, 1, 2, 3, 5, 8, 9, 10]},
    'solid-11-bold': {2: [0, 3, 4, 5, 8, 9, 10], 7: [0, 3, 4, 5, 9, 10], 9: [0, 1, 3, 4, 5, 6, 9, 10]},
    # Upper diagonal: the slanted side of 4. Lower diagonal: the leg of 2 and tails
    # of 7 and 9. The middle bar stays off in 2 and 7.
    '9-segments-1': {2: [2, 3, 4, 7], 4: [1, 2, 6, 8], 7: [2, 3, 4], 9: [0, 2, 3, 4, 8]},
    '9-segments-2': {2: [2, 3, 7, 8], 4: [2, 4, 5, 6], 7: [2, 3, 8], 9: [0, 2, 3, 5, 8]},
    'sharp-traced': SHARP_DIGITS,
    'sharp-bold': SHARP_DIGITS,
    'sharp-5-1': {7: [1, 0]},
    # Two rings: the top one in three arcs, the bottom one in two. 0 and 8 match.
    'round-5-1': {0: [0, 1, 2, 3, 4], 1: [2, 3], 2: [0, 2, 4], 3: [0, 2, 3], 4: [1, 2, 3], 5: [0, 1, 3],
                  6: [0, 1, 3, 4], 7: [0, 2], 8: [0, 1, 2, 3, 4], 9: [0, 1, 2, 3]},
    # Match the reference's diagonal strokes: flagged 1, slashed 0, hourglass 8,
    # and diagonal stems in 6, 7 and 9. The outer side wedges belong only to 0, 1 and 4.
    'x13-1': {
        0: [0, 1, 2, 3, 5, 6, 8, 9, 10, 11, 12],
        1: [0, 2, 3, 8],
        2: [0, 1, 5, 6, 8, 10, 11],
        3: [0, 1, 3, 6, 7, 8, 11],
        4: [0, 2, 3, 4, 6, 7, 8, 12],
        5: [1, 3, 4, 6, 7, 11, 12],
        6: [0, 3, 5, 6, 7, 8, 10, 11],
        7: [0, 1, 5, 6, 8, 10],
        8: [0, 1, 3, 4, 5, 6, 7, 8, 10, 11, 12],
        9: [0, 1, 4, 5, 6, 8, 10, 12],
    },
    # The reference uses the X for every digit. Full-height sides frame the slashed
    # zero; only 1 also uses the right side, with an upper diagonal for its flag.
    'x-ugly-9-1': {0: [0, 1, 3, 4, 5, 6], 1: [0, 4], 2: [3, 4, 5, 6], 3: [4, 5, 6, 7],
                   4: [2, 4, 7], 5: [2, 5, 6, 7], 6: [3, 4, 6, 7], 7: [3, 4, 5],
                   8: [2, 3, 4, 5, 6, 7], 9: [2, 3, 4, 5]},
    # Reference 14-segment digits: slashed zero, half middle bars in 2, 3 and 5,
    # diagonal strokes in 2, 3, 5 and 7, and a centred lower stem in 7.
    # Segment 15 of the first variant is the decimal point and stays dark.
    '14-segment-1': {
        0: [2, 4, 5, 6, 7, 8, 10, 11], 1: [4, 5], 2: [0, 2, 4, 8, 10],
        3: [0, 2, 5, 6, 10], 4: [0, 1, 4, 5, 11, 12], 5: [0, 2, 5, 10, 13],
        6: [0, 1, 2, 5, 7, 10, 11, 12], 7: [6, 9, 10],
        8: [0, 1, 2, 4, 5, 7, 10, 11, 12], 9: [0, 1, 4, 5, 10, 11, 12],
    },
    '14-segment-2': {
        0: [2, 4, 5, 7, 8, 10, 12, 13], 1: [5, 10], 2: [2, 5, 7, 11, 13],
        3: [4, 7, 10, 11, 13], 4: [0, 5, 10, 11, 12], 5: [3, 7, 10, 11, 13],
        6: [0, 7, 8, 10, 11, 12, 13], 7: [4, 6, 13],
        8: [0, 5, 7, 8, 10, 11, 12, 13], 9: [0, 5, 10, 11, 12, 13],
    },
    # No Compromise's reference selects pieces independently of the 3×5 cells:
    # centred 1, diagonal stems, square corners on selected digits, and 4's side mark.
    'no-compromise-1': {
        0: [6, 7, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34],
        1: [8, 9, 14, 16, 18, 19, 23, 24, 29, 32],
        2: [2, 4, 6, 7, 10, 11, 12, 14, 15, 16, 19, 22, 23, 26, 27, 28, 32, 34],
        3: [0, 1, 6, 7, 10, 11, 14, 15, 17, 18, 19, 22, 23, 25, 27, 28, 30, 32, 34],
        4: [0, 4, 5, 6, 7, 8, 10, 11, 12, 14, 17, 21, 22, 23, 24, 27, 28, 29, 30, 31],
        5: [0, 1, 6, 7, 10, 13, 14, 15, 17, 19, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 34],
        6: [7, 8, 10, 14, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34],
        7: [0, 1, 2, 6, 7, 10, 11, 14, 15, 16, 18, 23, 26, 32, 34],
        8: [6, 7, 10, 11, 12, 13, 14, 15, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34],
        9: [6, 7, 9, 10, 11, 12, 13, 14, 15, 19, 21, 22, 23, 24, 28, 29, 30, 31],
    },
}

# Standard seven-segment table, a..g = 0..6.
SEVEN = {
    0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg',
    5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
}
# Where each standard segment sits in a unit glyph box.
SEVEN_AT = {
    'a': (0.5, 0.04), 'b': (0.92, 0.27), 'c': (0.92, 0.73), 'd': (0.5, 0.96),
    'e': (0.08, 0.73), 'f': (0.08, 0.27), 'g': (0.5, 0.5),
}
# Extra anchors for glyphs with more than seven pieces: split middle bars still count
# as g, and pieces in the two inner counters (diagonals, centre verticals) never light.
REGION_AT = list(SEVEN_AT.items()) + [
    ('g', (0.27, 0.5)), ('g', (0.73, 0.5)),
    ('-', (0.3, 0.27)), ('-', (0.5, 0.27)), ('-', (0.7, 0.27)),
    ('-', (0.3, 0.73)), ('-', (0.5, 0.73)), ('-', (0.7, 0.73)),
]

# Dot-matrix fonts, rows top to bottom.
FONT_3x5 = {
    0: ['111', '101', '101', '101', '111'], 1: ['001', '001', '001', '001', '001'],
    2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
    4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '001', '001'],
    8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
}
# Both 10-segment Fake 3×5 designs join the top-middle and top-right cells.
# Give 1 a short cap so the shared segment lights and its stem reaches the top.
FONT_FAKE_3x5_10 = {**FONT_3x5, 1: ['011', *FONT_3x5[1][1:]]}

# Fake 5×7's 18-segment reference: diagonal pairs, rounded counters and dotted zero.
FONT_5x7 = {
    0: ['01110', '10011', '10101', '10001', '10101', '11001', '01110'],
    1: ['00001', '00011', '00101', '00001', '00001', '00001', '00001'],
    2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    3: ['11111', '00010', '00100', '01110', '00001', '10001', '01110'],
    4: ['00001', '00011', '00101', '01111', '00001', '00001', '00001'],
    5: ['11111', '10000', '10000', '11110', '00001', '10001', '01110'],
    6: ['00001', '00010', '00100', '01110', '10001', '10001', '01110'],
    7: ['11111', '00001', '00001', '00010', '00100', '01000', '10000'],
    8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    9: ['01110', '10001', '10001', '01110', '00100', '01000', '10000'],
}


def load_boxes(svg_path, root):
    out = subprocess.run(['inkscape', '--query-all', svg_path],
                         capture_output=True, text=True, check=True).stdout
    rows = out.rstrip('\n').split('\n')
    els = [e for e in root.iter() if tag(e) not in ('defs', 'style')]
    if len(els) != len(rows):
        sys.exit(f'element/bbox count mismatch: {len(els)} vs {len(rows)}')
    boxes = {}
    for e, row in zip(els, rows):
        parts = row.split(',')
        # Inkscape prints an empty row for an element it can't measure.
        boxes[id(e)] = tuple(map(float, parts[1:])) if len(parts) == 5 else None
    return boxes


def visible(e):
    if tag(e) in SHAPES:
        return e.get('class') != 'aa'  # .aa is fill:none in the sheet's stylesheet
    if tag(e) == 'g':
        return any(visible(k) for k in e)
    return False


def union(boxes):
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[0] + b[2] for b in boxes)
    y1 = max(b[1] + b[3] for b in boxes)
    return (x0, y0, x1 - x0, y1 - y0)


def markup(e):
    e = ET.fromstring(ET.tostring(e))
    for k in e.iter():
        k.attrib.pop('class', None)
    if tag(e) == 'g':
        for k in list(e):
            if not visible(k):
                e.remove(k)
    s = ET.tostring(e, encoding='unicode')
    s = s.replace(' xmlns="%s"' % SVG_NS, '')
    return re.sub(r'\s+', ' ', s)


def split_glyphs(root, B):
    """Return lists of segment elements, one list per glyph."""
    glyphs = []
    loose = []
    for e in root:
        if tag(e) == 'ellipse':
            loose.append(e)
        if tag(e) != 'g':
            continue
        kids = [k for k in e if visible(k)]
        sub = [k for k in kids if tag(k) == 'g']
        if sub and len(sub) == len(kids) and all(len([s for s in k if visible(s)]) >= 4 for k in sub):
            glyphs += [[s for s in k if visible(s)] for k in sub]  # a row of whole glyphs
        elif B[id(e)][2] > 300:
            # One group holding several glyphs side by side: cluster children by x gaps.
            kids.sort(key=lambda k: B[id(k)][0])
            clusters, right = [], None
            for k in kids:
                x, _, w, _ = B[id(k)]
                if right is None or x - right > 15:
                    clusters.append([])
                    right = x + w
                clusters[-1].append(k)
                right = max(right, x + w)
            for c in clusters:
                if len(c) == 1 and tag(c[0]) == 'g':
                    c = [s for s in c[0] if visible(s)]
                glyphs.append(sorted(c, key=lambda k: list(e.iter()).index(k) if k in e else 0))
        elif len(kids) < 4:
            # X Ugly nests most of its pieces one level down.
            flat = []
            for k in kids:
                flat += [s for s in k if visible(s)] if tag(k) == 'g' else [k]
            glyphs.append(flat)
        else:
            glyphs.append(kids)
    # The 14-segment glyph's decimal point is a loose ellipse: hand it to the glyph on its left.
    for dot in loose:
        dx, dy, _, _ = B[id(dot)]
        host = min((g for g in glyphs if union([B[id(s)] for s in g])[0] < dx and
                    abs(union([B[id(s)] for s in g])[1] - dy) < 300),
                   key=lambda g: dx - union([B[id(s)] for s in g])[0])
        host.append(dot)
    return glyphs


def captions(root, B):
    out = []
    for e in root:
        if tag(e) != 'text':
            continue
        text = ''.join(e.itertext()).strip()
        if text in FAMILIES:
            x, y, _, _ = B[id(e)]
            out.append((x, y, text))
    return out


def caption_for(box, caps):
    x, y, _, _ = box
    near = [(cx, text) for cx, cy, text in caps if 0 < y - cy < 140 and cx <= x + 30]
    if not near:
        sys.exit(f'no caption for glyph at {box}')
    return max(near)[1]


def centres(segs, B, box):
    gx, gy, gw, gh = box
    out = []
    for s in segs:
        x, y, w, h = B[id(s)]
        out.append(((x + w / 2 - gx) / gw, (y + h / 2 - gy) / gh))
    return out


def dist2(p, q):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2


def map_seven(cs):
    names = list(SEVEN_AT)
    best = min(itertools.permutations(range(7)),
               key=lambda perm: sum(dist2(cs[i], SEVEN_AT[names[perm[i]]]) for i in range(7)))
    role = [names[best[i]] for i in range(7)]
    return [[i for i in range(7) if role[i] in SEVEN[d]] for d in range(10)]


def map_six(cs):
    # X Black and FreeForm 6 drop the middle bar: their diagonals meet in the centre,
    # so the a-f table still draws every digit, except that 0 and 8 look the same.
    names = list('abcdef')
    best = min(itertools.permutations(range(6)),
               key=lambda perm: sum(dist2(cs[i], SEVEN_AT[names[perm[i]]]) for i in range(6)))
    role = [names[best[i]] for i in range(6)]
    return [[i for i in range(6) if role[i] in SEVEN[d]] for d in range(10)]


def map_regions(cs):
    role = [min(REGION_AT, key=lambda r: dist2(c, r[1]))[0] for c in cs]
    if set('abcdefg') - set(role):
        return None
    return [[i for i, r in enumerate(role) if r in SEVEN[d]] for d in range(10)]


def map_matrix(segs, B, box, font, cols, rows):
    """Light a segment when every matrix cell it covers is on in the font."""
    gx, gy, gw, gh = box

    def cells(e):
        parts = [k for k in e.iter() if tag(k) in SHAPES and visible(k)]
        out = set()
        for p in parts:
            x, y, w, h = B[id(p)]
            col = min(cols - 1, int((x + w / 2 - gx) / gw * cols))
            row = min(rows - 1, int((y + h / 2 - gy) / gh * rows))
            out.add((col, row))
        return out

    covered = [cells(s) for s in segs]
    digits = []
    for d in range(10):
        on = {(c, r) for r, line in enumerate(font[d]) for c, ch in enumerate(line) if ch == '1'}
        digits.append([i for i, cs in enumerate(covered) if cs and cs <= on])
    return digits


def map_hand(slug):
    """A design's digits from its HAND roles, with HAND_DIGITS drawn over them."""
    def lit(role, d):
        if role.startswith('&'):
            return all(c in SEVEN[d] for c in role[1:])
        return any(c in SEVEN[d] for c in role)
    roles = HAND[slug]
    over = HAND_DIGITS.get(slug, {})
    return [sorted(over[d]) if d in over else [i for i, r in enumerate(roles) if lit(r, d)] for d in range(10)]


def main():
    svg_path = sys.argv[1]
    out_path = sys.argv[2]
    root = ET.parse(svg_path).getroot()
    B = load_boxes(svg_path, root)
    caps = captions(root, B)

    found = []
    for segs in split_glyphs(root, B):
        box = union([B[id(s)] for s in segs])
        found.append((caption_for(box, caps), box, segs))
    found.sort(key=lambda f: (round(f[1][1] / 220), f[1][0]))

    glyphs, seen = [], {}
    for caption, box, segs in found:
        family, variants = FAMILIES[caption]
        n = seen[family] = seen.get(family, 0) + 1
        variant = variants[n - 1] if variants else str(n)
        cs = centres(segs, B, box)
        slug = re.sub(r'[^a-z0-9]+', '-', f'{family} {variant}'.lower()).strip('-')
        if slug in HAND:
            digits, how = map_hand(slug), 'hand'
        elif family == '3×5 Matrix' or (family == 'Fake 3×5'):
            font = FONT_3x5
            if family == 'Fake 3×5' and len(segs) == 10:
                font = FONT_FAKE_3x5_10
            digits, how = map_matrix(segs, B, box, font, 3, 5), 'matrix'
        elif family == 'Fake 5×7' and len(segs) != 7:
            digits, how = map_matrix(segs, B, box, FONT_5x7, 5, 7), 'matrix'
        elif len(segs) == 7:
            digits, how = map_seven(cs), 'seven'
        elif len(segs) > 7:
            digits, how = map_regions(cs), 'regions'
        elif len(segs) == 6:
            digits, how = map_six(cs), 'six'
        else:
            digits, how = None, None
        if digits is None:
            how = None
        # Pad the frame to the common 240-unit glyph height so every style lines up.
        x, y, w, h = box
        if h < 236:
            y -= (240 - h) / 2
            h = 240
        glyphs.append({
            'id': slug, 'family': family, 'variant': variant, 'count': len(segs),
            'box': [round(v, 2) for v in (x, y, w, h)],
            'segments': [markup(s) for s in segs],
            'digits': digits, 'how': how,
        })

    with open(out_path, 'w') as f:
        if out_path.endswith('.json'):
            json.dump(glyphs, f, separators=(',', ':'), ensure_ascii=False)
            f.write('\n')
        else:
            f.write('// Generated by app/scripts/extract_glyphs.py from segment-designs.svg. Do not edit.\n')
            f.write('// Glyph art: Segmented Display Designs Sheet v1.1 by Posy (Michiel de Boer).\n')
            f.write('window.GLYPHS = ')
            json.dump(glyphs, f, separators=(',', ':'), ensure_ascii=False)
            f.write(';\n')

    mapped = sum(1 for g in glyphs if g['digits'])
    print(f'{len(glyphs)} glyphs, {mapped} with digit maps -> {out_path}')
    for g in glyphs:
        print(f"  {g['id']:28s} {g['count']:3d} segs  {g['how'] or '-'}")


if __name__ == '__main__':
    main()
