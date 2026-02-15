"""
Script de migration des produits depuis l'ancien projet Supabase vers le nouveau.

Migre : product, pricing, category
Les images sont téléchargées puis re-uploadées sur Supabase Storage.

Usage :
  pip install supabase python-dotenv requests
  cd migration
  python migrate.py
"""

import os
import json
import re
import time
import hashlib
import unicodedata
import requests
from urllib.parse import urlparse
from dotenv import load_dotenv
from supabase import create_client

# Charger le .env du même dossier
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

OLD_SUPABASE_URL = os.environ["OLD_SUPABASE_URL"].rstrip("/")
OLD_SUPABASE_KEY = os.environ["OLD_SUPABASE_KEY"]
NEW_SUPABASE_URL = os.environ["NEW_SUPABASE_URL"].rstrip("/")
NEW_SUPABASE_SERVICE_KEY = os.environ["NEW_SUPABASE_SERVICE_KEY"]

old_sb = create_client(OLD_SUPABASE_URL, OLD_SUPABASE_KEY)
new_sb = create_client(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY)

# Mappings old id → new uuid
category_map = {}
brand_map = {}
product_map = {}
pricing_map = {}
used_references = set()  # Pour éviter les doublons de reference

stats = {
    "products_total": 0,
    "products_migrated": 0,
    "products_errors": 0,
    "categories_created": 0,
    "categories_mapped": 0,
    "brands_created": 0,
    "brands_mapped": 0,
    "images_uploaded": 0,
    "images_failed": 0,
    "specialties_linked": 0,
    "category_links": 0,
}


def reset_state():
    """Réinitialise tous les mappings et stats pour un relancement propre."""
    category_map.clear()
    brand_map.clear()
    product_map.clear()
    pricing_map.clear()
    used_references.clear()
    for key in stats:
        stats[key] = 0


def slugify(text):
    """Convertit un texte en slug ASCII safe pour Supabase Storage."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "unnamed"


def make_unique_reference(serial_number, old_id):
    """Génère une référence unique. Ajoute -oldID si doublon."""
    if not serial_number:
        return None
    ref = serial_number.strip()
    if not ref:
        return None
    if ref in used_references:
        ref = f"{ref}-{old_id}"
    used_references.add(ref)
    return ref


# Extensions connues par content-type
CONTENT_TYPE_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/svg+xml": "svg",
}


# ============================================================
# Upload d'image : télécharge depuis URL → upload sur Storage
# ============================================================
def upload_image_to_storage(image_url, bucket, storage_path):
    """
    Télécharge une image depuis une URL externe et l'uploade sur Supabase Storage.
    Retourne l'URL publique ou None en cas d'erreur.
    """
    if not image_url:
        return None

    # Corriger les URLs protocol-relative (//)
    if image_url.startswith("//"):
        image_url = "https:" + image_url
    elif not image_url.startswith("http"):
        return None

    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        file_bytes = response.content
        content_type = response.headers.get("Content-Type", "").split(";")[0].strip()

        ext = CONTENT_TYPE_EXT.get(content_type)
        if not ext:
            parsed = urlparse(image_url)
            path_ext = os.path.splitext(parsed.path)[1].lstrip(".")
            ext = path_ext if path_ext in ("jpg", "jpeg", "png", "webp", "avif", "gif", "svg") else "jpg"
        if not content_type:
            content_type = "image/jpeg"

        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        timestamp = int(time.time())
        filename = f"{timestamp}-{url_hash}.{ext}"
        full_path = f"{storage_path}/{filename}"

        new_sb.storage.from_(bucket).upload(
            full_path,
            file_bytes,
            file_options={"content-type": content_type, "cache-control": "3600", "upsert": "true"},
        )

        public_url = new_sb.storage.from_(bucket).get_public_url(full_path)
        return public_url

    except requests.RequestException as e:
        print(f"    ⚠️  Erreur téléchargement image: {e}")
        return None
    except Exception as e:
        print(f"    ⚠️  Erreur upload storage: {e}")
        return None


# ============================================================
# 1. Récupérer les données de l'ancien projet (pagination)
# ============================================================
def fetch_all_rows(client, table_name):
    """Récupère toutes les lignes d'une table avec pagination (max 1000 par requête)."""
    all_rows = []
    offset = 0
    page_size = 1000
    while True:
        batch = (
            client.table(table_name)
            .select("*")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
            .data
        )
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def fetch_old_data():
    print("\n📥 Récupération des données depuis l'ancien projet...")

    products = fetch_all_rows(old_sb, "product")
    print(f"  ✅ {len(products)} produits")

    pricing = fetch_all_rows(old_sb, "pricing")
    print(f"  ✅ {len(pricing)} pricing")

    categories = fetch_all_rows(old_sb, "category")
    print(f"  ✅ {len(categories)} catégories")

    return products, pricing, categories


# ============================================================
# 2. Nettoyer TOUTES les données migrées du nouveau projet
# ============================================================
def clean_existing_data():
    print("\n🧹 Suppression des données existantes...")

    # 1. Tables de jonction et dépendantes (enfants d'abord)
    junction_tables = [
        "product_variant_filters_junction",
        "product_variants",
        "product_documents",
        "cart_items",
        "product_images",
        "product_specialties",
        "product_categories",
    ]
    for table in junction_tables:
        try:
            new_sb.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        except Exception as e:
            print(f"  ⚠️  Erreur nettoyage {table}: {e}")

    # 2. Supprimer tous les produits (garder ceux liés à des commandes existantes)
    try:
        referenced = new_sb.table("order_items").select("product_id").execute().data
        referenced_ids = set(r["product_id"] for r in referenced) if referenced else set()
    except Exception:
        referenced_ids = set()

    all_products = new_sb.table("products").select("id").execute().data or []
    to_delete = [p["id"] for p in all_products if p["id"] not in referenced_ids]
    for pid in to_delete:
        new_sb.table("products").delete().eq("id", pid).execute()
    print(f"  ✅ {len(to_delete)} produits supprimés")

    # 3. Catégories (liaisons d'abord, puis catégories)
    try:
        new_sb.table("category_specialties").delete().neq("category_id", "00000000-0000-0000-0000-000000000000").execute()
        # Aussi nettoyer category_it_types si existe
        new_sb.table("category_it_types").delete().neq("category_id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception:
        pass
    try:
        new_sb.table("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  ✅ Catégories nettoyées")
    except Exception as e:
        print(f"  ⚠️  Erreur nettoyage catégories: {e}")

    # 4. Marques
    try:
        new_sb.table("brands").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  ✅ Marques nettoyées")
    except Exception as e:
        print(f"  ⚠️  Erreur nettoyage marques: {e}")

    # 5. Vider les buckets storage (images uploadées précédemment)
    for bucket in ["product-images", "category-images"]:
        try:
            files = new_sb.storage.from_(bucket).list()
            if files:
                # Lister récursivement les dossiers
                for folder in files:
                    folder_name = folder.get("name") if isinstance(folder, dict) else str(folder)
                    try:
                        sub_files = new_sb.storage.from_(bucket).list(folder_name)
                        if sub_files:
                            paths = [f"{folder_name}/{f['name']}" for f in sub_files if isinstance(f, dict) and f.get("name")]
                            if paths:
                                new_sb.storage.from_(bucket).remove(paths)
                    except Exception:
                        pass
            print(f"  ✅ Bucket {bucket} nettoyé")
        except Exception as e:
            print(f"  ⚠️  Erreur nettoyage bucket {bucket}: {e}")


# ============================================================
# 3. Migrer les catégories (avec upload d'images)
# ============================================================
def migrate_categories(old_categories):
    print("\n📂 Migration des catégories...")

    existing = new_sb.table("categories").select("id, name").execute().data or []

    for old_cat in old_categories:
        name = (old_cat.get("name") or "").strip()
        if not name:
            continue

        material = (old_cat.get("material_type") or "").lower()
        if "it" in material or "info" in material:
            product_type = "it_equipment"
        elif "mobil" in material or "meuble" in material or "furni" in material:
            product_type = "furniture"
        else:
            product_type = "medical_equipment"

        # Upload image de catégorie
        image_url = None
        old_image = old_cat.get("image")
        if old_image:
            safe_name = slugify(name)
            image_url = upload_image_to_storage(
                old_image, "category-images", f"categories/{safe_name}"
            )
            if image_url:
                print(f"    🖼️  Image catégorie uploadée")

        match = next((c for c in existing if c["name"].lower() == name.lower()), None)

        if match:
            category_map[old_cat["id"]] = match["id"]
            stats["categories_mapped"] += 1
            if image_url:
                new_sb.table("categories").update({"image_url": image_url}).eq("id", match["id"]).execute()
            print(f"  📁 \"{name}\" → mappée ({match['id'][:8]}...)")
        else:
            result = new_sb.table("categories").insert({
                "name": name,
                "description": old_cat.get("product_family") or None,
                "image_url": image_url,
                "product_type": product_type,
            }).execute()

            if result.data:
                new_cat = result.data[0]
                category_map[old_cat["id"]] = new_cat["id"]
                existing.append(new_cat)
                stats["categories_created"] += 1
                print(f"  ✅ \"{name}\" → créée ({new_cat['id'][:8]}...)")

        # Lier les spécialités
        spec_data = old_cat.get("speciality")
        if spec_data and old_cat["id"] in category_map:
            migrate_category_specialties(category_map[old_cat["id"]], spec_data)


# ============================================================
# 3b. Lier les spécialités aux catégories
# ============================================================
def migrate_category_specialties(new_category_id, spec_data):
    existing_specs = new_sb.table("specialties").select("id, name").execute().data or []
    existing_links = (
        new_sb.table("category_specialties")
        .select("specialty_id")
        .eq("category_id", new_category_id)
        .execute().data or []
    )
    linked_ids = set(l["specialty_id"] for l in existing_links)

    if isinstance(spec_data, str):
        try:
            spec_data = json.loads(spec_data)
        except Exception:
            return

    specs = spec_data if isinstance(spec_data, list) else [spec_data]

    for spec in specs:
        if isinstance(spec, dict):
            spec_name = (spec.get("name") or spec.get("label") or "").strip()
        else:
            spec_name = str(spec).strip()
        if not spec_name:
            continue

        match = next((s for s in existing_specs if s["name"].lower() == spec_name.lower()), None)

        if not match:
            res = new_sb.table("specialties").insert({"name": spec_name}).execute()
            if res.data:
                match = res.data[0]
                existing_specs.append(match)

        if match and match["id"] not in linked_ids:
            new_sb.table("category_specialties").insert({
                "category_id": new_category_id,
                "specialty_id": match["id"],
            }).execute()
            linked_ids.add(match["id"])


# ============================================================
# 4. Migrer les marques
# ============================================================
def migrate_brands(old_products):
    print("\n🏷️  Migration des marques...")

    existing = new_sb.table("brands").select("id, name").execute().data or []
    unique_brands = sorted(set(
        p["brand"].strip()
        for p in old_products
        if p.get("brand") and p["brand"].strip()
    ))

    for brand_name in unique_brands:
        match = next((b for b in existing if b["name"].lower() == brand_name.lower()), None)

        if match:
            brand_map[brand_name.lower()] = match["id"]
            stats["brands_mapped"] += 1
            print(f"  🏷️  \"{brand_name}\" → mappée ({match['id'][:8]}...)")
        else:
            result = new_sb.table("brands").insert({"name": brand_name}).execute()
            if result.data:
                new_brand = result.data[0]
                brand_map[brand_name.lower()] = new_brand["id"]
                existing.append(new_brand)
                stats["brands_created"] += 1
                print(f"  ✅ \"{brand_name}\" → créée ({new_brand['id'][:8]}...)")


# ============================================================
# 5. Mapper product_type
# ============================================================
def map_product_type(old_type):
    if not old_type:
        return "medical_equipment"
    t = old_type.lower().strip()
    if "it" in t or "info" in t or "computer" in t:
        return "it_equipment"
    if "mobil" in t or "furni" in t or "meuble" in t:
        return "furniture"
    return "medical_equipment"


# ============================================================
# 6. Migrer les produits (avec upload d'images sur Storage)
# ============================================================
def migrate_products(old_products, pricing_data):
    print("\n📦 Migration des produits...")

    for p in pricing_data:
        pricing_map[p["id"]] = p

    existing_specs = new_sb.table("specialties").select("id, name").execute().data or []

    # Grouper les variantes
    group_map = {}
    for p in old_products:
        gid = p.get("product_group_uid")
        if gid:
            group_map.setdefault(gid, []).append(p)

    # is_cheapest_in_group d'abord (parents)
    sorted_products = sorted(old_products, key=lambda p: (
        not p.get("is_cheapest_in_group", False),
        p["id"],
    ))

    for old_p in sorted_products:
        stats["products_total"] += 1
        old_id = old_p["id"]

        # Pricing
        pricing = pricing_map.get(old_p.get("pricing")) if old_p.get("pricing") else None
        marlon_margin = pricing["marlon_margin"] if pricing and pricing.get("marlon_margin") is not None else 30
        purchase_price = old_p.get("provider_price") or (pricing["provider_price"] if pricing else None) or 0

        # Brand
        brand_id = None
        if old_p.get("brand"):
            brand_id = brand_map.get(old_p["brand"].strip().lower())

        # Product type
        product_type = map_product_type(old_p.get("product_type"))

        # Variant data (filtres IT)
        variant_data = {}
        if old_p.get("filter_color"):
            variant_data["color"] = old_p["filter_color"]
        if old_p.get("filter_processor"):
            variant_data["processor"] = old_p["filter_processor"]
        if old_p.get("filter_storage"):
            variant_data["storage"] = old_p["filter_storage"]
        if old_p.get("filter_screenSize"):
            variant_data["screenSize"] = old_p["filter_screenSize"]
        if old_p.get("product_family"):
            variant_data["product_family"] = old_p["product_family"]

        # Parent product (variantes groupées)
        parent_product_id = None
        gid = old_p.get("product_group_uid")
        if gid and not old_p.get("is_cheapest_in_group"):
            group = group_map.get(gid, [])
            parent = next((g for g in group if g.get("is_cheapest_in_group")), None)
            if parent and parent["id"] in product_map:
                parent_product_id = product_map[parent["id"]]

        # Générer une référence unique (éviter les doublons)
        unique_ref = make_unique_reference(old_p.get("serial_number"), old_id)

        # Insert produit
        try:
            result = new_sb.table("products").insert({
                "name": old_p.get("name") or f"Produit #{old_id}",
                "reference": unique_ref,
                "description": old_p.get("description") or None,
                "purchase_price_ht": float(purchase_price),
                "marlon_margin_percent": float(marlon_margin),
                "supplier_id": None,
                "brand_id": brand_id,
                "default_leaser_id": None,
                "product_type": product_type,
                "serial_number": old_p.get("serial_number") or None,
                "technical_info": old_p.get("technicals_informations") or None,
                "variant_data": variant_data if variant_data else {},
                "parent_product_id": parent_product_id,
                "created_at": old_p.get("created_at"),
            }).execute()
        except Exception as e:
            print(f"  ❌ \"{old_p.get('name')}\" (old #{old_id}) — {e}")
            stats["products_errors"] += 1
            continue

        if not result.data:
            print(f"  ❌ \"{old_p.get('name')}\" (old #{old_id}) — erreur insertion")
            stats["products_errors"] += 1
            continue

        new_product = result.data[0]
        new_product_id = new_product["id"]
        product_map[old_id] = new_product_id
        stats["products_migrated"] += 1
        print(f"  ✅ \"{old_p.get('name')}\" (old #{old_id}) → {new_product_id[:8]}...")

        # --- Image : télécharger et uploader sur Storage ---
        old_image = old_p.get("image")
        if old_image:
            storage_url = upload_image_to_storage(
                old_image,
                "product-images",
                f"products/{new_product_id}",
            )
            if storage_url:
                new_sb.table("product_images").insert({
                    "product_id": new_product_id,
                    "image_url": storage_url,
                    "order_index": 0,
                }).execute()
                stats["images_uploaded"] += 1
                print(f"    🖼️  Image uploadée")
            else:
                stats["images_failed"] += 1

        # --- Lien catégorie ---
        cat_id = old_p.get("category")
        if cat_id and cat_id in category_map:
            new_sb.table("product_categories").insert({
                "product_id": new_product_id,
                "category_id": category_map[cat_id],
            }).execute()
            stats["category_links"] += 1

        # --- Spécialités du produit ---
        spec_data = old_p.get("speciality")
        if spec_data:
            if isinstance(spec_data, str):
                try:
                    spec_data = json.loads(spec_data)
                except Exception:
                    spec_data = None

            if spec_data:
                specs = spec_data if isinstance(spec_data, list) else [spec_data]
                for spec in specs:
                    if isinstance(spec, dict):
                        spec_name = (spec.get("name") or spec.get("label") or "").strip()
                    else:
                        spec_name = str(spec).strip()
                    if not spec_name:
                        continue

                    match = next((s for s in existing_specs if s["name"].lower() == spec_name.lower()), None)

                    if not match:
                        res = new_sb.table("specialties").insert({"name": spec_name}).execute()
                        if res.data:
                            match = res.data[0]
                            existing_specs.append(match)

                    if match:
                        new_sb.table("product_specialties").insert({
                            "product_id": new_product_id,
                            "specialty_id": match["id"],
                        }).execute()
                        stats["specialties_linked"] += 1


# ============================================================
# MAIN
# ============================================================
def main():
    print("🚀 ═══════════════════════════════════════════════════")
    print("   MIGRATION PRODUITS : Ancien → Nouveau Supabase")
    print("   (avec upload des images sur Supabase Storage)")
    print("═══════════════════════════════════════════════════════")

    if "XXXXXXXX" in OLD_SUPABASE_URL:
        print("\n❌ ERREUR : Renseigner les variables dans migration/.env !")
        return
    if "REMPLACER" in NEW_SUPABASE_SERVICE_KEY:
        print("\n❌ ERREUR : Renseigner NEW_SUPABASE_SERVICE_KEY dans migration/.env !")
        return

    # Réinitialiser l'état pour permettre des relances propres
    reset_state()

    products, pricing, categories = fetch_old_data()
    clean_existing_data()
    migrate_categories(categories)
    migrate_brands(products)
    migrate_products(products, pricing)

    print("\n═══════════════════════════════════════════════════")
    print("📊 RÉSUMÉ DE LA MIGRATION")
    print("═══════════════════════════════════════════════════")
    print(f"  📦 Produits     : {stats['products_migrated']}/{stats['products_total']} migrés ({stats['products_errors']} erreurs)")
    print(f"  📂 Catégories   : {stats['categories_created']} créées, {stats['categories_mapped']} mappées")
    print(f"  🏷️  Marques      : {stats['brands_created']} créées, {stats['brands_mapped']} mappées")
    print(f"  🖼️  Images       : {stats['images_uploaded']} uploadées, {stats['images_failed']} échouées")
    print(f"  🔗 Liens catég. : {stats['category_links']} créés")
    print(f"  🏥 Spécialités  : {stats['specialties_linked']} liées")
    print("═══════════════════════════════════════════════════")
    print("✅ Migration terminée !")


if __name__ == "__main__":
    main()
