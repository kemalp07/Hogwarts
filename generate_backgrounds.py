"""
Hogwarts Arka Plan Üretici — Vertex AI Imagen
Kullanım:
  pip install google-cloud-aiplatform pillow python-dotenv
  python generate_backgrounds.py
  python generate_backgrounds.py --only great_hall
"""

import argparse
import os
import time
from pathlib import Path
from dotenv import load_dotenv

# .env yükle
script_dir = Path(__file__).parent
for env_path in [script_dir / ".env", script_dir / "backend" / ".env", script_dir.parent / ".env"]:
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ .env yüklendi: {env_path}")
        break

PROJECT_ID = os.getenv("VERTEX_AI_PROJECT_ID")
_env_location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
LOCATION = "us-central1" if _env_location == "global" else _env_location

LOCATIONS = {
    "gryffindor_tower": "Gryffindor common room interior, cozy fireplace with golden flames, red and gold tapestries, round windows showing starry night, worn leather armchairs, floating candles, stone walls, warm amber lighting",
    "great_hall": "Hogwarts Great Hall interior, four long dining tables, thousands of floating candles, enchanted ceiling showing night sky with stars, gothic stone arches, warm golden light, grand and majestic atmosphere",
    "library": "Hogwarts library, towering bookshelves reaching ceiling, floating books, dim candlelight, old wooden tables, dust particles in air, mysterious restricted section with chains, deep shadows",
    "dungeons": "Hogwarts dungeon corridor, stone walls with green torches, cold blue-green lighting, damp stone floor, ominous atmosphere",
    "quidditch_field": "Hogwarts Quidditch pitch, large stadium with wooden stands, green grass field, golden goal hoops, dramatic cloudy sky, late afternoon light, epic scale",
    "corridor": "Hogwarts castle corridor at night, moving portraits on stone walls, floating torches, shifting staircases visible in background, moonlight through tall windows, mysterious and eerie atmosphere",
    "classroom": "Hogwarts general classroom, rows of wooden desks, blackboard with magical diagrams, floating chalk, stone walls with hanging magical charts, warm candlelight",
    "owlery": "Hogwarts owlery tower interior, hundreds of owls perched on wooden beams, moonlight streaming through open arches, feathers floating in air, cold blue moonlight atmosphere",
    "hospital_wing": "Hogwarts hospital wing, rows of white beds with curtains, floating potions and bandages, large windows with soft daylight, clean stone walls, calm atmosphere",
    "forbidden_forest": "Hogwarts forbidden forest edge at night, ancient twisted trees, bioluminescent plants, moonlight filtering through dense canopy, mysterious fog, dark and magical atmosphere",
    "hogsmeade": "Hogsmeade village street, snow covered rooftops, warm glowing shop windows, Three Broomsticks inn sign, cobblestone street, winter atmosphere, cozy and magical",
    "astronomy_tower": "Hogwarts astronomy tower top, open battlements, large telescope, panoramic view of castle and lake below, star filled night sky, cold clear air, moonlight, epic scale",
    "potions_classroom": "Hogwarts potions classroom deep in dungeons, rows of cauldrons bubbling with colorful smoke, shelves packed with jars of strange ingredients, green torchlight, stone walls dripping with moisture",
    "transfiguration_classroom": "Hogwarts transfiguration classroom, desks with half-transformed objects, blackboard with complex diagrams, afternoon sunlight through tall windows, stone walls with tapestries",
    "charms_classroom": "Hogwarts charms classroom, objects floating mid-air throughout the room, sparkling magical energy, warm golden light, stacked books and cushions everywhere, cheerful and bright",
    "herbology_greenhouse": "Hogwarts herbology greenhouse, glass ceiling with tropical plants, exotic magical plants with glowing flowers, dirt covered wooden tables, warm humid misty atmosphere",
    "defense_classroom": "Hogwarts defense against dark arts classroom, strange artifacts and dark creature specimens in jars, dim flickering torchlight, unsettling atmosphere, eerie purple-grey lighting",
    "great_lake": "Hogwarts great lake shore at dusk, dark still water reflecting castle silhouette, giant tentacle barely visible beneath surface, autumn trees on shore, golden and purple sky",
    "slytherin_common_room": "Slytherin common room deep under Hogwarts lake, green glowing windows showing dark lake water outside, fish and creatures visible through glass, silver and green decor, cold and elegant atmosphere",
    "hufflepuff_common_room": "Hufflepuff common room near Hogwarts kitchens, round hobbit-like low ceiling, warm yellow and black decor, plants and flowers everywhere, cozy armchairs, warm earthy lighting",
    "ravenclaw_common_room": "Ravenclaw common room in Hogwarts tower, tall arched windows with panoramic mountain view, blue and bronze decor, domed ceiling painted with stars, bookshelves covering every wall",
    "gryffindor_dormitory": "Gryffindor boys dormitory, four-poster beds with deep red curtains, stone walls, narrow windows showing castle grounds, warm candlelight, cozy and lived-in atmosphere",
    "slytherin_dormitory": "Slytherin boys dormitory deep underwater, green glow from lake outside round portholes, cold stone walls, silver and green bed curtains, dim green lighting",
    "room_of_requirement": "Hogwarts room of requirement, vast room filled with centuries of hidden objects, towering piles of furniture and magical artifacts, dim golden light, labyrinthine passages between stacked items",
}

STYLE_PREFIX = (
    "Anime art style, Studio Ghibli inspired dark fantasy illustration, "
    "detailed architectural background, no characters, no people, no text, no watermark, no logo, "
)

MODELS_TO_TRY = [
    "imagen-3.0-generate-002",
    "imagen-3.0-generate-001",
    "imagegeneration@006",
    "imagegeneration@005",
]

def generate_image(project_id, location, location_key, prompt, output_dir):
    output_path = output_dir / f"{location_key}.png"

    if output_path.exists():
        print(f"  ⏭ Zaten var, atlandı: {location_key}.png")
        return True

    import vertexai
    from vertexai.preview.vision_models import ImageGenerationModel
    vertexai.init(project=project_id, location=location)

    full_prompt = STYLE_PREFIX + prompt

    for model_name in MODELS_TO_TRY:
        try:
            model = ImageGenerationModel.from_pretrained(model_name)
            response = model.generate_images(
                prompt=full_prompt,
                number_of_images=1,
                aspect_ratio="16:9",
            )
            if response.images:
                response.images[0].save(str(output_path))
                print(f"  ✅ Kaydedildi: {location_key}.png ({model_name})")
                return True
        except Exception as e:
            print(f"  ⚠ {model_name}: {e}")
            continue

    print(f"  ❌ Tüm modeller başarısız: {location_key}")
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="./frontend/assets/backgrounds")
    parser.add_argument("--only", default=None)
    parser.add_argument("--delay", type=float, default=3.0)
    args = parser.parse_args()

    if not PROJECT_ID:
        print("❌ VERTEX_AI_PROJECT_ID .env'de bulunamadı!")
        return

    print(f"\n🏰 Hogwarts Arka Plan Üretici — Vertex AI Imagen")
    print(f"📋 Project: {PROJECT_ID} | Location: {LOCATION}")

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"📁 Çıktı: {output_dir.absolute()}")

    locations = LOCATIONS
    if args.only:
        if args.only not in LOCATIONS:
            print(f"❌ Bilinmeyen mekan: {args.only}")
            return
        locations = {args.only: LOCATIONS[args.only]}

    print(f"🖼  Toplam mekan: {len(locations)}\n")

    success = 0
    fail = 0

    for i, (key, prompt) in enumerate(locations.items(), 1):
        print(f"[{i}/{len(locations)}] {key}")
        ok = generate_image(PROJECT_ID, LOCATION, key, prompt, output_dir)
        if ok:
            success += 1
        else:
            fail += 1
        if i < len(locations):
            time.sleep(args.delay)

    print(f"\n✅ Başarılı: {success} | ❌ Başarısız: {fail}")
    print(f"📁 Görseller: {output_dir.absolute()}")

if __name__ == "__main__":
    main()
