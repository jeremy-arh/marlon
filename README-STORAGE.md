# Supabase Storage Buckets

Ce document décrit les buckets Supabase Storage nécessaires pour la plateforme MARLON.

## Buckets à créer

### 1. `product-images` (Public)
- **Description** : Images des produits
- **Visibilité** : Public (lecture publique)
- **Taille max** : 5MB
- **Types MIME autorisés** : `image/jpeg`, `image/png`, `image/webp`
- **Accès** : 
  - Lecture : Public
  - Écriture : Admins uniquement

### 2. `category-images` (Public)
- **Description** : Images des catégories
- **Visibilité** : Public (lecture publique)
- **Taille max** : 5MB
- **Types MIME autorisés** : `image/jpeg`, `image/png`, `image/webp`
- **Accès** : 
  - Lecture : Public
  - Écriture : Admins uniquement

### 3. `contracts` (Private)
- **Description** : Contrats de leasing
- **Visibilité** : Privé
- **Taille max** : 10MB
- **Types MIME autorisés** : `application/pdf`
- **Accès** : 
  - Lecture : Membres de l'organisation concernée
  - Écriture : Admins uniquement

### 4. `invoices` (Private)
- **Description** : Factures des organisations
- **Visibilité** : Privé
- **Taille max** : 10MB
- **Types MIME autorisés** : `application/pdf`, `image/jpeg`, `image/png`
- **Accès** : 
  - Lecture : Membres de l'organisation concernée
  - Écriture : Admins uniquement

### 5. `static-assets` (Public)
- **Description** : Assets statiques (logo, favicon, etc.)
- **Visibilité** : Public (lecture publique)
- **Taille max** : 2MB
- **Types MIME autorisés** : `image/svg+xml`, `image/png`, `image/x-icon`, `image/jpeg`
- **Accès** : 
  - Lecture : Public
  - Écriture : Super admins uniquement

## Création des buckets

### Méthode 1 : Via l'API (Recommandé)

1. Assurez-vous d'être connecté en tant que super admin dans le back-office
2. Accédez à : `http://localhost:3001/api/admin/create-buckets`
3. Faites un POST vers cette route (utilisez Postman, curl, ou le navigateur avec une extension)

**Avec curl :**
```bash
curl -X POST http://localhost:3001/api/admin/create-buckets
```

### Méthode 2 : Via le Dashboard Supabase

1. Connectez-vous au dashboard Supabase
2. Allez dans **Storage**
3. Cliquez sur **New bucket**
4. Créez chaque bucket avec les paramètres ci-dessus

### Méthode 3 : Via le script Node.js

```bash
# Depuis la racine du projet
node scripts/create-storage-buckets.js
```

**Note** : Assurez-vous d'avoir les variables d'environnement configurées :
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Application des politiques de sécurité

Après avoir créé les buckets, appliquez la migration des politiques de stockage :

```sql
-- Exécutez le fichier :
supabase/migrations/008_storage_policies.sql
```

Cette migration définit les politiques RLS pour contrôler l'accès aux fichiers dans chaque bucket.

## Structure des dossiers recommandée

### `product-images`
```
product-images/
  ├── {product_id}/
  │   ├── image-1.jpg
  │   ├── image-2.jpg
  │   └── ...
```

### `category-images`
```
category-images/
  ├── {category_id}.jpg
```

### `contracts`
```
contracts/
  ├── {order_id}/
  │   ├── contract-{leaser_id}.pdf
```

### `invoices`
```
invoices/
  ├── {organization_id}/
  │   ├── invoice-{date}.pdf
```

### `static-assets`
```
static-assets/
  ├── logo.svg
  ├── favicon.ico
  └── ...
```

## Vérification

Pour vérifier que les buckets ont été créés correctement :

1. Allez dans le dashboard Supabase > Storage
2. Vérifiez que les 5 buckets sont présents
3. Testez l'upload d'un fichier dans chaque bucket
