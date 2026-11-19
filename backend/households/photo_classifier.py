import base64
import io
import json
import math
import os
import threading
import urllib.error
import urllib.request
from pathlib import Path

from django.conf import settings
from django.db import close_old_connections
from PIL import Image, ImageStat

VALID_PHOTO_TYPES = {
    "dis",
    "salon",
    "oturma_odasi",
    "mutfak",
    "oda",
    "banyo",
    "diger",
}

FILENAME_KEYWORDS = {
    "dis": ("dis", "dış", "cephe", "bina", "bahce", "bahçe", "sokak", "ev_dis", "exterior"),
    "mutfak": ("mutfak", "kitchen", "tezgah", "ocak", "buzdolabi"),
    "banyo": ("banyo", "tuvalet", "wc", "dus", "duş", "lavabo", "bath"),
    "salon": ("salon", "living"),
    "oturma_odasi": ("oturma", "kanape", "kanepe", "koltuk"),
    "oda": ("oda", "yatak", "cocuk", "çocuk", "bedroom"),
}


def classify_household_photo(
    image_source,
    filename: str = "",
    use_cloud: bool = False,
) -> str:
    """
    Classifies a household visit photo into one of:
    'dis', 'salon', 'oturma_odasi', 'mutfak', 'oda', 'banyo', 'diger'.

    When use_cloud=False (default during upload), returns the instant (~5ms)
    local classification so uploads never block on external network calls.
    """
    try:
        image_bytes = _read_image_bytes(image_source)
    except Exception:
        return "diger"

    if not image_bytes:
        return "diger"

    if use_cloud:
        api_key = (
            getattr(settings, "GEMINI_API_KEY", None)
            or os.environ.get("GEMINI_API_KEY", "")
        ).strip()
        if api_key:
            gemini_label = _classify_with_gemini(image_bytes, api_key)
            if gemini_label in VALID_PHOTO_TYPES:
                return gemini_label

    # Check filename hints if the file has a descriptive name
    lower_name = Path(filename or "").stem.lower()
    if lower_name:
        for photo_type, keywords in FILENAME_KEYWORDS.items():
            if any(kw in lower_name for kw in keywords):
                return photo_type

    # Instant local visual analysis using Pillow (~5ms)
    try:
        return _classify_locally_with_pillow(image_bytes)
    except Exception:
        return "diger"


def refine_photo_label_in_background(photo_id: int) -> None:
    """
    Asynchronously refines a saved HouseholdPhoto's label using Gemini Vision API
    in a background thread if GEMINI_API_KEY is configured, without slowing down
    the HTTP upload response.
    """
    api_key = (
        getattr(settings, "GEMINI_API_KEY", None)
        or os.environ.get("GEMINI_API_KEY", "")
    ).strip()
    if not api_key:
        return

    def _worker():
        try:
            close_old_connections()
            from .models import HouseholdPhoto

            photo_obj = HouseholdPhoto.objects.filter(pk=photo_id).first()
            if not photo_obj or not photo_obj.photo:
                return
            image_bytes = Path(photo_obj.photo.path).read_bytes()
            gemini_label = _classify_with_gemini(image_bytes, api_key)
            if (
                gemini_label in VALID_PHOTO_TYPES
                and photo_obj.photo_type != gemini_label
            ):
                HouseholdPhoto.objects.filter(pk=photo_id).update(
                    photo_type=gemini_label
                )
        except Exception:
            pass
        finally:
            close_old_connections()

    threading.Thread(target=_worker, daemon=True).start()


def _read_image_bytes(image_source) -> bytes:
    if isinstance(image_source, (bytes, bytearray)):
        return bytes(image_source)
    if isinstance(image_source, (str, Path)):
        return Path(image_source).read_bytes()
    if hasattr(image_source, "seek"):
        try:
            image_source.seek(0)
        except Exception:
            pass
    data = image_source.read()
    if hasattr(image_source, "seek"):
        try:
            image_source.seek(0)
        except Exception:
            pass
    return data


def _classify_with_gemini(image_bytes: bytes, api_key: str) -> str | None:
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            rgb = img.convert("RGB")
            rgb.thumbnail((768, 768))
            buf = io.BytesIO()
            rgb.save(buf, format="JPEG", quality=82)
            resized_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        prompt = (
            "Bu fotoğraf bir sosyal yardımlaşma vakfı hane ziyaretinde çekilmiştir. "
            "Fotoğrafın evin hangi bölümüne ait olduğunu analiz et ve SADECE aşağıdaki "
            "etiket kodlarından en uygun olan TEK BİR kelimeyi döndür:\n"
            "- dis : Evin dış cephesi, bina dışı, bahçe, sokak, dış kapı veya çatı\n"
            "- mutfak : Mutfak, mutfak tezgahı, ocak, fırın, mutfak dolapları, bulaşık/buzdolabı alanı\n"
            "- banyo : Banyo, tuvalet, klozet, duşakabin, banyo lavabosu, fayanslı ıslak hacim\n"
            "- salon : Geniş salon, misafir odası, yemek masası ve geniş koltuk takımı, TV ünitesi\n"
            "- oturma_odasi : Günlük oturma odası, çekyat/kanepe, soba kurulu oturma alanı\n"
            "- oda : Yatak odası, çocuk odası, yatak, baza, gardırop bulunan oda\n"
            "- diger : Yukarıdakilerden hiçbiri değilse (evrak, kimlik, yakacak/kömür çuvalı vb.)\n\n"
            "Yanıt olarak başka hiçbir açıklama yazma, yalnızca tek bir kod yaz (örneğin: mutfak)."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": resized_b64,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 20,
            },
        }

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent"
        )
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            text = (
                body.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
                .lower()
            )
            cleaned = text.replace("`", "").replace(".", "").strip()
            if cleaned in VALID_PHOTO_TYPES:
                return cleaned
            for valid_code in VALID_PHOTO_TYPES:
                if valid_code in cleaned:
                    return valid_code
    except (urllib.error.URLError, TimeoutError, Exception):
        return None

    return None


def _classify_locally_with_pillow(image_bytes: bytes) -> str:
    """
    Lightweight local visual heuristic classifier using Pillow when offline or
    no cloud API key is configured. Analyzes spatial color distribution,
    sky/foliage ratios, ceramic/white tile uniformity, cabinet/appliance contrast,
    and warm indoor room characteristics.
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        rgb = img.convert("RGB").resize((96, 96))

    width, height = rgb.size
    pixels = list(rgb.getdata())

    top_sky_like = 0
    top_bright = 0
    top_count = 0

    green_foliage = 0
    white_cool_tile = 0
    metallic_neutral = 0
    warm_wood_fabric = 0
    vivid_bedding_fabric = 0

    total_pixels = len(pixels)

    for idx, (r, g, b) in enumerate(pixels):
        y = idx // width
        max_c = max(r, g, b)
        min_c = min(r, g, b)
        diff = max_c - min_c
        sat = (diff / max_c) if max_c > 0 else 0.0
        lum = 0.299 * r + 0.587 * g + 0.114 * b

        # Top 35% of image (sky or ceiling check)
        if y < height * 0.35:
            top_count += 1
            if lum > 175:
                top_bright += 1
            if b > 135 and b > r + 18 and b >= g - 10:
                top_sky_like += 1

        # Green vegetation / trees / grass (exterior)
        if g > 75 and g > r * 1.14 and g > b * 1.16:
            green_foliage += 1

        # White / cool ceramic / porcelain / tiles (bathroom / kitchen)
        if lum > 165 and sat < 0.16 and b >= r - 12:
            white_cool_tile += 1
        elif 115 <= lum <= 185 and sat < 0.12:
            metallic_neutral += 1

        # Warm wood / carpet / sofa tones (living room / sitting room)
        if r > g > b and r > 85 and 0.15 <= sat <= 0.65:
            warm_wood_fabric += 1

        # Distinct fabric/bedding colors in lower half
        if y > height * 0.40 and 0.22 <= sat <= 0.75:
            vivid_bedding_fabric += 1

    sky_ratio = top_sky_like / max(1, top_count)
    top_bright_ratio = top_bright / max(1, top_count)
    green_ratio = green_foliage / total_pixels
    white_tile_ratio = white_cool_tile / total_pixels
    metallic_ratio = metallic_neutral / total_pixels
    warm_ratio = warm_wood_fabric / total_pixels
    fabric_ratio = vivid_bedding_fabric / total_pixels

    # Measure horizontal vs vertical edge structure in middle band
    gray = rgb.convert("L")
    g_pixels = list(gray.getdata())
    horiz_edges = 0
    vert_edges = 0
    mid_start = int(height * 0.2)
    mid_end = int(height * 0.8)
    for y in range(mid_start, mid_end):
        row_offset = y * width
        for x in range(1, width - 1):
            gx = abs(g_pixels[row_offset + x + 1] - g_pixels[row_offset + x - 1])
            gy = abs(g_pixels[(y + 1) * width + x] - g_pixels[(y - 1) * width + x])
            if gx > 28:
                vert_edges += 1
            if gy > 28:
                horiz_edges += 1

    mid_area = max(1, (mid_end - mid_start) * (width - 2))
    edge_density = (horiz_edges + vert_edges) / (2.0 * mid_area)
    overall_std = ImageStat.Stat(gray).stddev[0]

    # 1. Exterior (Dış Cephe): Sky in upper region or noticeable foliage/outdoor lighting
    if sky_ratio > 0.14 or green_ratio > 0.06 or (top_bright_ratio > 0.55 and warm_ratio < 0.15):
        return "dis"

    # 2. Bathroom (Banyo): High white/cool tile & porcelain ratio with low warm wood/fabric
    if white_tile_ratio > 0.34 and warm_ratio < 0.16:
        return "banyo"

    # 3. Kitchen (Mutfak): Combination of white/metallic appliances + high cabinet edge density
    if (white_tile_ratio + metallic_ratio) > 0.38 and edge_density > 0.14:
        return "mutfak"

    # 4. Indoor rooms: distinguish Salon, Oturma Odası, Oda (Bedroom)
    if warm_ratio > 0.22 and edge_density > 0.13 and overall_std > 48:
        return "salon"

    if warm_ratio > 0.16 and fabric_ratio > 0.18:
        return "oturma_odasi"

    if fabric_ratio > 0.14 or warm_ratio > 0.10:
        return "oda"

    if white_tile_ratio > 0.22:
        return "mutfak"

    return "oturma_odasi"
