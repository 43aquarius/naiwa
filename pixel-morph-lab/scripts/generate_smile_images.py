"""Generate two default smile face images for pixel transformation demo.
- smile_01.png : a subtle, calm smile (mild expression)
- smile_06.png : an extreme, exaggerated smile (dramatic expression)

Both images are 512x512 with vivid colors so the pixel-sort + morph
algorithm has rich data to work with.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

OUT_DIR = "/home/z/my-project/public/demo"
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 512, 512


def draw_face(draw, expression: str, accent: tuple, bg_top: tuple, bg_bot: tuple):
    # Background vertical gradient
    for y in range(H):
        t = y / (H - 1)
        r = int(bg_top[0] * (1 - t) + bg_bot[0] * t)
        g = int(bg_top[1] * (1 - t) + bg_bot[1] * t)
        b = int(bg_top[2] * (1 - t) + bg_bot[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    cx, cy = W // 2, H // 2 + 20

    # Sun rays around the face (adds color richness for sorting)
    n_rays = 24
    ray_r1, ray_r2 = 220, 250
    for i in range(n_rays):
        a0 = (i / n_rays) * 2 * math.pi
        a1 = ((i + 0.4) / n_rays) * 2 * math.pi
        poly = [
            (cx + ray_r1 * math.cos(a0), cy + ray_r1 * math.sin(a0)),
            (cx + ray_r2 * math.cos(a0), cy + ray_r2 * math.sin(a0)),
            (cx + ray_r2 * math.cos(a1), cy + ray_r2 * math.sin(a1)),
            (cx + ray_r1 * math.cos(a1), cy + ray_r1 * math.sin(a1)),
        ]
        # alternate warm/cool accent
        c = accent if i % 2 == 0 else (255, 220, 90)
        draw.polygon(poly, fill=c)

    # Face circle with radial shading
    face_r = 180
    for r in range(face_r, 0, -1):
        t = 1 - r / face_r
        col = (
            int(255 * (1 - t) + 255 * t * 0.95),
            int(225 * (1 - t) + 200 * t * 0.95),
            int(170 * (1 - t) + 140 * t * 0.95),
        )
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

    # Blush
    draw.ellipse([cx - 110, cy + 10, cx - 60, cy + 50], fill=(255, 160, 160))
    draw.ellipse([cx + 60, cy + 10, cx + 110, cy + 50], fill=(255, 160, 160))

    # Eyes
    if expression == "calm":
        # closed/relaxed eyes (downward arcs)
        for sign in (-1, 1):
            ex = cx + sign * 55
            ey = cy - 30
            draw.arc([ex - 30, ey - 12, ex + 30, ey + 18], 200, 340, fill=(40, 40, 60), width=8)
    else:
        # wide-open eyes
        for sign in (-1, 1):
            ex = cx + sign * 55
            ey = cy - 40
            # white
            draw.ellipse([ex - 28, ey - 22, ex + 28, ey + 22], fill=(255, 255, 255))
            # iris
            draw.ellipse([ex - 14, ey - 14, ex + 14, ey + 14], fill=(40, 80, 160))
            # pupil
            draw.ellipse([ex - 7, ey - 7, ex + 7, ey + 7], fill=(20, 20, 30))
            # sparkle
            draw.ellipse([ex - 12, ey - 12, ex - 4, ey - 4], fill=(255, 255, 255))

    # Brows
    if expression == "calm":
        for sign in (-1, 1):
            ex = cx + sign * 55
            ey = cy - 70
            draw.line([(ex - 28, ey + 4), (ex + 28, ey)], fill=(80, 50, 30), width=8)
    else:
        # raised eyebrows
        for sign in (-1, 1):
            ex = cx + sign * 55
            ey = cy - 85
            draw.arc([ex - 30, ey - 12, ex + 30, ey + 12], 0, 180, fill=(80, 50, 30), width=8)

    # Mouth
    if expression == "calm":
        # small subtle smile
        draw.arc([cx - 50, cy + 20, cx + 50, cy + 80], 20, 160, fill=(180, 60, 80), width=10)
    else:
        # big open laughing mouth
        draw.ellipse([cx - 90, cy + 10, cx + 90, cy + 110], fill=(120, 30, 50))
        draw.ellipse([cx - 80, cy + 20, cx + 80, cy + 100], fill=(255, 220, 220))
        # tongue
        draw.ellipse([cx - 30, cy + 70, cx + 30, cy + 105], fill=(255, 100, 130))
        # teeth highlight
        draw.rectangle([cx - 70, cy + 20, cx + 70, cy + 35], fill=(255, 255, 255))

    # Nose
    draw.polygon([(cx - 6, cy - 5), (cx + 6, cy - 5), (cx, cy + 15)], fill=(220, 160, 120))


def make_image(expression: str, accent: tuple, bg_top: tuple, bg_bot: tuple, out_path: str):
    img = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_face(d, expression, accent, bg_top, bg_bot)
    img = img.filter(ImageFilter.SMOOTH_MORE)
    img.save(out_path, "PNG", optimize=True)
    print(f"Saved: {out_path}")


# smile_01 : calm / muted palette (cool, dim) -> makes "calm" reference image
make_image(
    expression="calm",
    accent=(120, 180, 230),
    bg_top=(35, 45, 80),
    bg_bot=(15, 20, 40),
    out_path=os.path.join(OUT_DIR, "smile_01.png"),
)

# smile_06 : extreme / warm vibrant palette -> "extreme" target image
make_image(
    expression="extreme",
    accent=(255, 110, 60),
    bg_top=(255, 200, 90),
    bg_bot=(220, 80, 40),
    out_path=os.path.join(OUT_DIR, "smile_06.png"),
)

# also write copies to /home/z/my-project/upload for traceability
os.makedirs("/home/z/my-project/upload", exist_ok=True)
for name in ("smile_01.png", "smile_06.png"):
    src = os.path.join(OUT_DIR, name)
    dst = os.path.join("/home/z/my-project/upload", name)
    Image.open(src).save(dst, "PNG")
    print(f"Mirrored: {dst}")

print("Done.")
