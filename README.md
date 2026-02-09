# MARLON - Plateforme de Leasing Médical

Plateforme e-commerce B2B pour le leasing de matériel médical.

## Structure du projet

Ce projet contient deux applications séparées :

### 1. Application Client (`/`)

Application principale pour les clients.

- **URL** : http://localhost:3000
- **Port** : 3000
- **Dossier** : Racine du projet

### 2. Application Back-Office (`/back-office`)

Application d'administration.

- **URL** : http://localhost:3001
- **Port** : 3001
- **Dossier** : `back-office/`

## Installation

### Application Client

```bash
npm install
```

### Back-Office

```bash
cd back-office
npm install
```

## Configuration

### Application Client

Créez un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Back-Office

Créez un fichier `back-office/.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Démarrage

### Application Client

```bash
npm run dev
```

Accédez à http://localhost:3000

### Back-Office

```bash
cd back-office
npm run dev
```

Accédez à http://localhost:3001

## Technologies

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- Framer Motion (Animations)
- Iconify (Icônes)

## Migrations

Les migrations SQL se trouvent dans `supabase/migrations/`.

Appliquez-les via le client Supabase ou la CLI Supabase.
