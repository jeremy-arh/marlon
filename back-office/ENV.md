# Variables d'environnement

Ce fichier documente toutes les variables d'environnement nécessaires pour le back-office.

## Variables requises

### `NEXT_PUBLIC_SUPABASE_URL`
- **Description** : URL de votre projet Supabase
- **Exemple** : `https://xxxxxxxxxxxxx.supabase.co`
- **Où l'obtenir** : Dashboard Supabase > Settings > API > Project URL
- **Exposition** : Publique (accessible côté client)

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description** : Clé anonyme (anon key) de votre projet Supabase
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Où l'obtenir** : Dashboard Supabase > Settings > API > Project API keys > anon public
- **Exposition** : Publique (accessible côté client)

### `SUPABASE_SERVICE_ROLE_KEY`
- **Description** : Clé de service Supabase (contourne RLS)
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Où l'obtenir** : Dashboard Supabase > Settings > API > Project API keys > service_role
- **Exposition** : Privée (uniquement côté serveur)
- **⚠️ Sécurité** : Ne jamais exposer cette clé côté client. Elle permet de contourner toutes les politiques RLS.

### `NEXT_PUBLIC_APP_URL`
- **Description** : URL publique de l'application back-office
- **Exemple local** : `http://localhost:3001`
- **Exemple production** : `https://admin.votredomaine.com` ou `https://back-office.vercel.app`
- **Exposition** : Publique (accessible côté client)
- **Note** : Pour la production, utilisez l'URL Vercel après le premier déploiement

## Configuration locale

Créez un fichier `.env.local` dans le dossier `back-office` avec toutes les variables ci-dessus.

## Configuration Vercel

1. Allez dans les paramètres de votre projet Vercel
2. Section "Environment Variables"
3. Ajoutez toutes les variables ci-dessus
4. Sélectionnez les environnements appropriés (Production, Preview, Development)

## Vérification

Pour vérifier que toutes les variables sont correctement configurées, vous pouvez consulter les logs de build Vercel. Les erreurs de variables manquantes apparaîtront lors du build.
