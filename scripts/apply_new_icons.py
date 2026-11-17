import os
from PIL import Image, ImageDraw

def generate_icons():
    source_path = r'C:\Users\pc\.gemini\antigravity\brain\5a70d741-659a-4753-b2f0-ba2f3c1de3a7\notebook_app_icon_fullbleed_1794312087562.jpg'
    src = Image.open(source_path).convert('RGB')
    w, h = src.size

    bg_color = src.getpixel((10, 10)) # (209, 238, 252)

    # 1. Scaled canvas (safe zone for adaptive / circular / squircle icons)
    scale = 0.82
    new_w, new_h = int(w * scale), int(h * scale)
    scaled_nb = src.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new('RGB', (w, h), bg_color)
    paste_x = (w - new_w) // 2
    paste_y = (h - new_h) // 2 - 15
    canvas.paste(scaled_nb, (paste_x, paste_y))

    # Round canvas for circular launchers
    round_canvas = canvas.copy().convert('RGBA')
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, w, h), fill=255)
    round_canvas.putalpha(mask)

    # Save to assets/images
    os.makedirs('assets/images', exist_ok=True)
    canvas.save('assets/images/icon.png', format='PNG')
    
    # Adaptive foreground (512x512)
    fg_512 = canvas.resize((512, 512), Image.Resampling.LANCZOS)
    fg_512.save('assets/images/android-icon-foreground.png', format='PNG')

    # Adaptive background (512x512)
    bg_512 = Image.new('RGB', (512, 512), bg_color)
    bg_512.save('assets/images/android-icon-background.png', format='PNG')

    # Favicon (48x48)
    fav_48 = canvas.resize((48, 48), Image.Resampling.LANCZOS)
    fav_48.save('assets/images/favicon.png', format='PNG')

    # Splash icon
    splash_icon = canvas.resize((256, 256), Image.Resampling.LANCZOS)
    splash_icon.save('assets/images/splash-icon.png', format='PNG')

    # Monochrome icon (for Android 13+ themed icons)
    mono_canvas = canvas.convert('L').convert('RGBA')
    mono_canvas.save('assets/images/android-icon-monochrome.png', format='PNG')

    print("Updated assets/images/* successfully!")

    # Android mipmaps
    res_base = 'android/app/src/main/res'
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432)
    }

    for folder, (launcher_sz, layer_sz) in densities.items():
        folder_path = os.path.join(res_base, folder)
        if not os.path.exists(folder_path):
            continue

        # ic_launcher.webp (launcher_sz x launcher_sz)
        ic = canvas.resize((launcher_sz, launcher_sz), Image.Resampling.LANCZOS)
        ic.save(os.path.join(folder_path, 'ic_launcher.webp'), format='PNG')

        # ic_launcher_round.webp (launcher_sz x launcher_sz)
        ic_round = round_canvas.resize((launcher_sz, launcher_sz), Image.Resampling.LANCZOS)
        ic_round.save(os.path.join(folder_path, 'ic_launcher_round.webp'), format='PNG')

        # ic_launcher_foreground.webp (layer_sz x layer_sz)
        fg = canvas.resize((layer_sz, layer_sz), Image.Resampling.LANCZOS)
        fg.save(os.path.join(folder_path, 'ic_launcher_foreground.webp'), format='PNG')

        # ic_launcher_background.webp (layer_sz x layer_sz)
        bg = Image.new('RGB', (layer_sz, layer_sz), bg_color)
        bg.save(os.path.join(folder_path, 'ic_launcher_background.webp'), format='PNG')

        # ic_launcher_monochrome.webp (layer_sz x layer_sz)
        mono = mono_canvas.resize((layer_sz, layer_sz), Image.Resampling.LANCZOS)
        mono.save(os.path.join(folder_path, 'ic_launcher_monochrome.webp'), format='PNG')

        print(f"Updated {folder} ({launcher_sz}px, {layer_sz}px)")

    print("All icons successfully generated and saved!")

if __name__ == '__main__':
    generate_icons()

