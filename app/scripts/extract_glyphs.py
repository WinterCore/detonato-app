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
    # The middle bar is split in three; the top and bottom wrap a corner.
    'sports-black-9-1': ['e', 'g', 'g', 'f', 'g', 'd', 'c', 'a', 'b'],
    'sports-black-9-2': ['f', 'g', 'g', 'e', 'b', 'd', 'g', 'c', 'a'],
    'sports-black-9-3': ['e', 'f', 'g', 'b', 'g', 'g', 'c', 'd', 'a'],
    'sports-black-9-4': ['g', 'f', 'e', 'g', 'd', 'c', 'g', 'a', 'b'],
    # Square corners on the left, joints at the sides of the middle bar, slivers in the counters.
    'half-bubble-17-seg': ['b', 'f', 'a', 'af', 'e', 'de', 'c', 'd', 'g', 'ef', '&bg', 'g', '&cg', 'bc',
                           '&eg', '&fg', 'g'],
    # The middle runs as a slant; the piece at the right of it joins b and c too.
    'solid-11-bold': ['', 'f', 'e', 'bcg', 'g', 'a', 'g', 'c', 'd', 'b', '&de'],
    # The two centre strokes are a 1, and the stem of 7 and of 2; the small tick is the middle.
    'sharp-traced': ['b', 'a', '', 'f', 'g', 'e', 'c', '', 'd'],
    'sharp-bold': ['b', 'a', '', 'f', 'g', 'e', 'c', '', 'd'],
    # Five pieces: the lower two hook round to the bottom. 0 and 8 match; 7 is drawn short, apart from 3.
    'sharp-5-1': ['b', 'a', 'f', 'e', 'c'],
    # Four quarters, lit with their side: several digits share a shape.
    '4-segments-1': ['b', 'f', 'c', 'e'],
    # 15 is the decimal point, never lit.
    '14-segment-1': ['g', 'g', 'd', '', 'b', 'c', '', 'e', '', '', 'a', 'f', 'g', '', '', ''],
    # Drawn outright below.
    'round-5-1': [], 'x-ugly-9-1': [],
}
# Digits a role table can't draw, given outright: segment indexes, 0–9.
HAND_DIGITS = {
    'sharp-traced': {1: [2, 7], 2: [1, 0, 7, 8], 7: [1, 2, 7]},
    'sharp-bold': {1: [2, 7], 2: [1, 0, 7, 8], 7: [1, 2, 7]},
    'sharp-5-1': {7: [1, 0]},
    # Two rings: the top one in three arcs, the bottom one in two. 0 and 8 match.
    'round-5-1': {0: [0, 1, 2, 3, 4], 1: [2, 3], 2: [0, 2, 4], 3: [0, 2, 3], 4: [1, 2, 3], 5: [0, 1, 3],
                  6: [0, 1, 3, 4], 7: [0, 2], 8: [0, 1, 2, 3, 4], 9: [0, 1, 2, 3]},
    # Two full-height sides around an X: 2 is a Z, 5 an S, 3 a Ʒ, 8 the box with its X.
    'x-ugly-9-1': {0: [1, 0, 5, 6], 1: [0], 2: [5, 4, 3, 6], 3: [5, 4, 7, 6], 4: [2, 0], 5: [5, 2, 7, 6],
                   6: [5, 1, 3, 7, 6], 7: [5, 4, 3], 8: [0, 1, 2, 3, 4, 5, 6, 7], 9: [5, 2, 4, 0, 6]},
}
# No Compromise is a 3×5 grid whose cells are cut by a slant and rounded off at the corners.
# Each cell's pieces inside the outline light with the 3×5 font; the corner pieces outside
# it (0, 1, 2, 3, 4) never do, so corners stay round; the slivers at the middle of each side
# (33, 21) light where a side runs straight through; 5, beside the grid, never lights.
NO_COMPROMISE_CELLS = {
    (0, 0): [15], (1, 0): [14], (2, 0): [7, 6],
    (0, 1): [13, 24], (1, 1): [8, 18], (2, 1): [11, 12],
    (0, 2): [31], (1, 2): [29, 23], (2, 2): [10, 22],
    (0, 3): [20, 26], (1, 3): [16, 9], (2, 3): [30, 17],
    (0, 4): [25, 34], (1, 4): [32, 19], (2, 4): [28, 27],
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
FONT_5x7 = {
    0: ['11111', '10001', '10001', '10001', '10001', '10001', '11111'],
    1: ['00001', '00001', '00001', '00001', '00001', '00001', '00001'],
    2: ['11111', '00001', '00001', '11111', '10000', '10000', '11111'],
    3: ['11111', '00001', '00001', '11111', '00001', '00001', '11111'],
    4: ['10001', '10001', '10001', '11111', '00001', '00001', '00001'],
    5: ['11111', '10000', '10000', '11111', '00001', '00001', '11111'],
    6: ['11111', '10000', '10000', '11111', '10001', '10001', '11111'],
    7: ['11111', '00001', '00001', '00001', '00001', '00001', '00001'],
    8: ['11111', '10001', '10001', '11111', '10001', '10001', '11111'],
    9: ['11111', '10001', '10001', '11111', '00001', '00001', '11111'],
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


def map_no_compromise():
    digits = []
    for d in range(10):
        on = lambda c, r: FONT_3x5[d][r][c] == '1'
        lit = [i for (c, r), pieces in NO_COMPROMISE_CELLS.items() if on(c, r) for i in pieces]
        if on(0, 1) and on(0, 2) and on(0, 3):
            lit.append(33)
        if on(2, 1) and on(2, 2) and on(2, 3):
            lit.append(21)
        digits.append(sorted(lit))
    return digits


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
        elif slug == 'no-compromise-1':
            digits, how = map_no_compromise(), 'hand'
        elif family == '3×5 Matrix' or (family == 'Fake 3×5'):
            digits, how = map_matrix(segs, B, box, FONT_3x5, 3, 5), 'matrix'
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
