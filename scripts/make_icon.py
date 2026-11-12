import sys
from PIL import Image, ImageDraw

OUT = sys.argv[1]
SS = 4  # supersampling
TOP, BOTTOM = (0x5B, 0x4C, 0xF0), (0x3A, 0x1F, 0x8F)
ACCENT = (0xFF, 0xC9, 0x4A)

def gradient(size):
    img = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        d.line([(0, y), (size, y)], fill=c + (255,))
    return img

def shield_points(cx, cy, w, h):
    # Rounded-top shield with a pointed bottom, as a smooth polygon.
    import math
    pts = []
    top = cy - h / 2
    left, right = cx - w / 2, cx + w / 2
    r = w * 0.12
    # top edge with slight dip in the middle
    for i in range(0, 41):
        t = i / 40
        x = left + r + (right - left - 2 * r) * t
        y = top + math.sin(t * math.pi) * h * 0.035
        pts.append((x, y))
    # right top corner
    for a in range(-90, 1, 10):
        pts.append((right - r + r * math.cos(math.radians(a)), top + r + r * math.sin(math.radians(a))))
    # right side curving to the point
    for i in range(1, 41):
        t = i / 40
        x = right - (w / 2) * (t ** 1.9)
        y = top + r + (h - r) * (0.45 * t + 0.55 * math.sin(t * math.pi / 2))
        pts.append((x, y))
    # left side back up (mirror)
    for i in range(39, 0, -1):
        t = i / 40
        x = left + (w / 2) * (t ** 1.9)
        y = top + r + (h - r) * (0.45 * t + 0.55 * math.sin(t * math.pi / 2))
        pts.append((x, y))
    for a in range(180, 271, 10):
        pts.append((left + r + r * math.cos(math.radians(a)), top + r + r * math.sin(math.radians(a))))
    return pts

def draw_mark(img, cx, cy, scale, shield_fill, lock_fill, keyhole_fill):
    d = ImageDraw.Draw(img)
    w, h = 560 * scale, 640 * scale
    d.polygon(shield_points(cx, cy, w, h), fill=shield_fill)
    if lock_fill is None:
        return
    # padlock
    bw, bh = 250 * scale, 190 * scale
    by = cy + 10 * scale
    body = [cx - bw / 2, by - bh / 2 + 30 * scale, cx + bw / 2, by + bh / 2 + 30 * scale]
    sw = 34 * scale  # shackle thickness
    sr = 82 * scale  # shackle radius
    sy = body[1]
    d.rounded_rectangle([cx - sr, sy - sr * 1.55, cx + sr, sy + sr * 0.6], radius=sr, outline=lock_fill, width=int(sw))
    d.rounded_rectangle(body, radius=36 * scale, fill=lock_fill)
    kc = (body[1] + body[3]) / 2 - 12 * scale
    kr = 26 * scale
    d.ellipse([cx - kr, kc - kr, cx + kr, kc + kr], fill=keyhole_fill)
    d.polygon([(cx - 13 * scale, kc), (cx + 13 * scale, kc), (cx + 18 * scale, kc + 62 * scale), (cx - 18 * scale, kc + 62 * scale)], fill=keyhole_fill)

def render(size, kind):
    big = size * SS
    if kind in ('icon', 'background'):
        img = gradient(big)
    else:
        img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    c = big / 2
    if kind == 'icon':
        draw_mark(img, c, c + big * 0.01, big / 1024 * 1.05, (255, 255, 255, 255), TOP + (255,), ACCENT + (255,))
    elif kind == 'foreground':
        # Adaptive icons keep the inner ~66 % visible.
        draw_mark(img, c, c + big * 0.01, big / 1024 * 0.78, (255, 255, 255, 255), TOP + (255,), ACCENT + (255,))
    elif kind == 'monochrome':
        draw_mark(img, c, c + big * 0.01, big / 1024 * 0.78, (255, 255, 255, 255), (0, 0, 0, 0), (255, 255, 255, 255))
    elif kind == 'splash':
        draw_mark(img, c, c, big / 1024 * 1.4, TOP + (255,), (255, 255, 255, 255), ACCENT + (255,))
    return img.resize((size, size), Image.LANCZOS)

if kind := (sys.argv[2] if len(sys.argv) > 2 else None):
    pass

render(1024, 'icon').convert('RGB').save(f'{OUT}/icon.png')
render(1024, 'foreground').save(f'{OUT}/android-icon-foreground.png')
render(1024, 'background').convert('RGB').save(f'{OUT}/android-icon-background.png')
render(1024, 'monochrome').save(f'{OUT}/android-icon-monochrome.png')
render(1024, 'splash').save(f'{OUT}/splash-icon.png')
render(48, 'icon').save(f'{OUT}/favicon.png')
print('ok')
