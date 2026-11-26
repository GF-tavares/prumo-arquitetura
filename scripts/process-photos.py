"""Trata as fotos de assets-src/photos/ e as texturas de assets-src/textures/ e
grava as versões usadas pelo site.

  fotos     -> src/assets/photos/<nome>.jpg   (o Astro gera AVIF/WebP no build)
  fundos    -> src/assets/textures/<nome>.jpg (fundos do Material Lab, 2048 px)
  concreto  -> public/tex/concrete/{color,normal}.jpg (1K, paredes da abertura em WebGL)

O tratamento é único para todas as fotos (dessaturação leve, sombras frias,
luzes quentes, curva em S, preto levantado até a cor do fundo do site e vinheta),
para que imagens de origens diferentes leiam como uma série só.

Uso: python scripts/process-photos.py
Requer Pillow e numpy. Origem e licença de cada arquivo: CREDITOS.md.
"""
from __future__ import annotations

import os
import shutil

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets-src")
OUT_PHOTOS = os.path.join(ROOT, "src", "assets", "photos")
OUT_TEX = os.path.join(ROOT, "src", "assets", "textures")
OUT_MAPS = os.path.join(ROOT, "public", "tex")

# nome final: (arquivo de origem, lado maior em px, ajustes)
PHOTOS = {
    "hero-tunnel": ("hero-tunnel", 3000, {"exposure": 0.10, "sat": 0.70, "contrast": 0.22, "vignette": 0.20}),
    "feature-hall-tree": ("feature-hall-tree", 3000, {"exposure": 0.06, "sat": 0.80, "contrast": 0.18}),
    "courtyard-tree": ("courtyard-tree", 2600, {"exposure": -0.05, "sat": 0.78, "contrast": 0.20}),
    "atlantico-ribbon-window": ("atlantico-ribbon-window", 2600, {"exposure": 0.12, "sat": 0.85, "contrast": 0.16}),
    "atlantico-sunset": ("atlantico-sunset", 2600, {"exposure": 0.30, "sat": 0.85, "contrast": 0.16, "warm": 0.30}),
    "bruma-forest": ("bruma-forest", 2400, {"exposure": -0.28, "sat": 0.62, "contrast": 0.24, "vignette": 0.18}),
    "bruma-hillside": ("bruma-hillside", 2600, {"exposure": 0.12, "sat": 0.72, "contrast": 0.22, "vignette": 0.14}),
    "mirante-dusk": ("mirante-dusk", 2600, {"exposure": -0.12, "sat": 0.66, "contrast": 0.22, "warm": 0.35}),
    "studio-hands": ("studio-hands", 2600, {"exposure": -0.18, "sat": 0.5, "contrast": 0.22, "warm": 0.05, "cool_shadows": 0.5}),
    "corridor-slits": ("corridor-slits", 2400, {"exposure": 0.28, "sat": 0.75, "contrast": 0.18}),
    "light-patches": ("light-patches", 2200, {"exposure": 0.18, "sat": 0.70, "contrast": 0.20}),
    "concrete-shadow": ("concrete-shadow", 2200, {"exposure": 0.55, "sat": 0.60, "contrast": 0.14}),
    "stair-oak-light": ("stair-oak-light", 2200, {"exposure": -0.05, "sat": 0.78, "contrast": 0.18}),
    "travertine-columns": ("travertine-columns", 2400, {"exposure": 0.10, "sat": 0.70, "contrast": 0.20}),
    "oak-slats-dark": ("oak-slats-dark", 2400, {"exposure": 0.35, "sat": 0.80, "contrast": 0.14}),
    # Material Lab: cada material aplicado em um ambiente
    "mat-travertine": ("mat-travertine", 2400, {"exposure": -0.10, "sat": 0.80, "contrast": 0.20, "warm": 0.20}),
    "mat-concrete": ("mat-concrete", 2600, {"exposure": 0.0, "sat": 0.60, "contrast": 0.20}),
    "mat-oak": ("mat-oak", 2600, {"exposure": -0.15, "sat": 0.75, "contrast": 0.20, "warm": 0.15}),
    "mat-steel": ("mat-steel", 2600, {"exposure": -0.20, "sat": 0.85, "contrast": 0.22, "warm": 0.05}),
    "mat-glass": ("mat-glass", 2400, {"exposure": -0.10, "sat": 0.70, "contrast": 0.22}),
}

# material: (pasta ambientCG do fundo, brilho do fundo, saturação do fundo)
MATERIALS = {
    "travertine": ("Travertine009", 0.46, 0.80),
    "concrete": ("Concrete034", 0.40, 0.85),
    "oak": ("Wood095", 0.40, 0.85),
    "steel": ("CorrugatedSteel009", 0.62, 0.70),
    "glass": ("Facade001", 0.78, 0.70),
}


def to_arr(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0


def to_img(a: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def luminance(a: np.ndarray) -> np.ndarray:
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def grade(
    a: np.ndarray,
    exposure: float = 0.0,
    sat: float = 0.75,
    contrast: float = 0.18,
    warm: float = 0.12,
    cool_shadows: float = 0.35,
    lift: float = 0.028,
    vignette: float = 0.16,
) -> np.ndarray:
    a = np.clip(a * (2.0 ** exposure), 0, 1)
    lum = luminance(a)[..., None]
    a = lum + (a - lum) * sat
    s = a * a * (3 - 2 * a)
    a = a * (1 - contrast) + s * contrast
    lum = luminance(a)[..., None]
    sh = ((1 - smoothstep(0.0, 0.5, lum)) * cool_shadows)
    a = a * (1 - sh) + a * np.array([0.90, 0.96, 1.05], dtype=np.float32) * sh
    hi = smoothstep(0.55, 1.0, lum) * warm
    a = a * (1 - hi) + a * np.array([1.05, 1.0, 0.92], dtype=np.float32) * hi
    a = lift + a * (1 - lift)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - 0.5) * 1.15) ** 2 + ((yy / h - 0.5) * 1.15) ** 2)
    v = 1 - vignette * smoothstep(0.30, 0.82, d)
    return np.clip(a * v[..., None], 0, 1)


def fit(im: Image.Image, long_side: int) -> Image.Image:
    w, h = im.size
    k = long_side / max(w, h)
    if k >= 1:
        return im
    return im.resize((round(w * k), round(h * k)), Image.LANCZOS)


def process_photos() -> None:
    os.makedirs(OUT_PHOTOS, exist_ok=True)
    for name, (src, long_side, opts) in PHOTOS.items():
        path = os.path.join(SRC, "photos", f"{src}.jpg")
        if not os.path.exists(path):
            print("falta", path)
            continue
        im = fit(Image.open(path).convert("RGB"), long_side)
        out = to_img(grade(to_arr(im), **opts))
        out.save(os.path.join(OUT_PHOTOS, f"{name}.jpg"), quality=88, optimize=True, progressive=True)
        print("foto", name, out.size)


def process_textures() -> None:
    os.makedirs(OUT_TEX, exist_ok=True)
    for name, (folder, brightness, sat) in MATERIALS.items():
        base = os.path.join(SRC, "textures", folder)
        color = os.path.join(base, f"{folder}_1K-JPG_Color.jpg")
        if not os.path.exists(color):
            print("falta", color)
            continue
        # fundo: cor 1K ladrilhada 2x2 (as texturas do ambientCG são contínuas), tratada e mais escura
        tile = to_arr(Image.open(color))
        big = np.tile(tile, (2, 2, 1))
        lum = float(luminance(big).mean())
        big = np.clip(big * (brightness / max(lum, 1e-3)), 0, 1)
        g = luminance(big)[..., None]
        big = g + (big - g) * sat
        to_img(big).save(os.path.join(OUT_TEX, f"{name}.jpg"), quality=86, optimize=True, progressive=True)
        print("textura", name)


def copy_wall_maps() -> None:
    """Cor e normais do concreto usados pelas paredes da abertura (carregados pelo WebGL)."""
    src = os.path.join(SRC, "textures", "Concrete034")
    dest = os.path.join(OUT_MAPS, "concrete")
    os.makedirs(dest, exist_ok=True)
    for key, suffix in (("color", "Color"), ("normal", "NormalGL")):
        p = os.path.join(src, f"Concrete034_1K-JPG_{suffix}.jpg")
        if os.path.exists(p):
            # recomprime (o mapa de normais original tem ~800 KB): o WebGL não precisa da qualidade máxima
            Image.open(p).convert("RGB").save(os.path.join(dest, f"{key}.jpg"), quality=80, optimize=True, progressive=True)
            print("mapa", key)


if __name__ == "__main__":
    process_photos()
    process_textures()
    copy_wall_maps()
