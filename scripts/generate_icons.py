import os
from PIL import Image, ImageDraw

src_path = r"C:\Users\pc\.gemini\antigravity\brain\260ed8f1-f8a9-4a77-b63c-8e3a96bc18e3\.user_uploaded\media_1794920518156_b74f229c.jpg"
im_src = Image.open(src_path).convert("RGBA")

# Create smooth gradient canvas
def make_gradient(width, height):
    base = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(base)
    # top: (59, 54, 108), bottom: (31, 28, 47)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(59 + (31 - 59) * t)
        g = int(54 + (28 - 54) * t)
        b = int(108 + (47 - 108) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    return base

def make_adaptive_icon(size):
    # Adaptive canvas size x size (e.g. 432x432)
    # The safe circle is 66% (e.g. 288x288)
    # User's image has notepad at ~80% of width.
    # So if we scale user image so that width is size * 0.75, the notepad is ~60% of size, safe from any masking!
    canvas = make_gradient(size, size)
    scale_w = int(size * 0.78)
    aspect = im_src.height / im_src.width
    scale_h = int(scale_w * aspect)
    resized_src = im_src.resize((scale_w, scale_h), Image.Resampling.LANCZOS)
    
    # Paste centered
    offset_x = (size - scale_w) // 2
    offset_y = (size - scale_h) // 2
    canvas.paste(resized_src, (offset_x, offset_y), resized_src)
    return canvas

def make_legacy_icon(size, round_shape=False):
    # size x size (e.g. 192x192)
    canvas = make_gradient(size, size)
    scale_w = int(size * 0.85)
    aspect = im_src.height / im_src.width
    scale_h = int(scale_w * aspect)
    resized_src = im_src.resize((scale_w, scale_h), Image.Resampling.LANCZOS)
    offset_x = (size - scale_w) // 2
    offset_y = (size - scale_h) // 2
    canvas.paste(resized_src, (offset_x, offset_y), resized_src)
    
    if round_shape:
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse([(0, 0), (size, size)], fill=255)
        rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        rounded.paste(canvas, (0, 0), mask)
        return rounded
    else:
        # Rounded rectangle for squircle
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        corner_radius = int(size * 0.22)
        draw.rounded_rectangle([(0, 0), (size, size)], radius=corner_radius, fill=255)
        rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        rounded.paste(canvas, (0, 0), mask)
        return rounded

# 1. Update project assets
assets_dir = r"c:\Users\pc\Desktop\your-project\assets\images"
os.makedirs(assets_dir, exist_ok=True)

icon_1024 = make_legacy_icon(1024, round_shape=False)
icon_1024.save(os.path.join(assets_dir, "icon.png"), "PNG")

fg_1024 = make_adaptive_icon(1024)
fg_1024.save(os.path.join(assets_dir, "android-icon-foreground.png"), "PNG")

bg_1024 = make_gradient(1024, 1024)
bg_1024.save(os.path.join(assets_dir, "android-icon-background.png"), "PNG")

favicon = make_legacy_icon(48, round_shape=False)
favicon.save(os.path.join(assets_dir, "favicon.png"), "PNG")
print("Saved assets/images/*")

# 2. Update Android mipmaps
mipmap_configs = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

res_dir = r"c:\Users\pc\Desktop\your-project\android\app\src\main\res"
for folder, (legacy_size, adapt_size) in mipmap_configs.items():
    folder_path = os.path.join(res_dir, folder)
    if not os.path.exists(folder_path):
        continue
    
    # Foreground
    fg = make_adaptive_icon(adapt_size)
    fg.save(os.path.join(folder_path, "ic_launcher_foreground.webp"), "WEBP")
    
    # Background
    bg = make_gradient(adapt_size, adapt_size)
    bg.save(os.path.join(folder_path, "ic_launcher_background.webp"), "WEBP")
    
    # Legacy Square/Rounded
    sq = make_legacy_icon(legacy_size, round_shape=False)
    sq.save(os.path.join(folder_path, "ic_launcher.webp"), "WEBP")
    
    # Legacy Round
    rd = make_legacy_icon(legacy_size, round_shape=True)
    rd.save(os.path.join(folder_path, "ic_launcher_round.webp"), "WEBP")
    
    print(f"Updated {folder}: legacy={legacy_size}px, adaptive={adapt_size}px")

print("All icons successfully generated and saved!")
