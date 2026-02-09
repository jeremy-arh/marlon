# MARLON Back-Office

Application d'administration pour la plateforme MARLON.

## Installation

```bash
npm install
```

## Configuration

Créez un fichier `.env.local` avec :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Important** : La clé `SUPABASE_SERVICE_ROLE_KEY` est nécessaire pour créer le super admin lors du setup initial. Cette clé permet de contourner les politiques RLS (Row Level Security).

## Première configuration - Création du Super Admin

Lors du premier lancement, si aucun super admin n'existe, vous serez redirigé vers la page `/setup` pour créer le premier compte administrateur.

Vous pouvez aussi y accéder directement : http://localhost:3001/setup

Cette page permet de :
- Créer le premier compte super admin
- Créer l'organisation d'administration
- Configurer les permissions initiales

⚠️ **Important** : Après la création du premier super admin, cette page ne sera plus accessible.

## Démarrage

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3001

## Structure

- `/app/(auth)` - Pages d'authentification
- `/app/(admin)/admin` - Pages d'administration (accessibles uniquement aux super admins)
- `/lib/supabase` - Configuration Supabase
- `/lib/utils/super-admin.ts` - Utilitaires pour vérifier les super admins

## Sécurité

- Seuls les utilisateurs avec le flag `is_super_admin = true` dans la table `user_roles` peuvent accéder au back-office
- La page de setup n'est accessible qu'en l'absence de super admin existant
- Toutes les routes admin sont protégées par middleware

## Déploiement sur Vercel

Le back-office peut être déployé sur Vercel en tant que projet indépendant avec son propre domaine.

### Prérequis

- Un compte Vercel
- Un projet Git (GitHub, GitLab, ou Bitbucket)
- Les variables d'environnement Supabase configurées

### Configuration Vercel

1. **Connecter le repository Git à Vercel** :
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "Add New Project"
   - Importez votre repository Git

2. **Configurer le projet** :
   - **Root Directory** : Sélectionnez `back-office` comme répertoire racine
   - **Framework Preset** : Next.js (détecté automatiquement)
   - **Build Command** : `npm run build` (par défaut)
   - **Output Directory** : `.next` (par défaut)
   - **Install Command** : `npm install` (par défaut)

3. **Configurer les variables d'environnement** :
   Dans les paramètres du projet Vercel, ajoutez les variables suivantes :
   
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
   NEXT_PUBLIC_APP_URL=https://votre-domaine-back-office.vercel.app
   ```
   
   ⚠️ **Important** : 
   - Remplacez `NEXT_PUBLIC_APP_URL` par l'URL Vercel de votre déploiement après le premier déploiement
   - La variable `SUPABASE_SERVICE_ROLE_KEY` est sensible et ne doit jamais être exposée côté client

4. **Déployer** :
   - Vercel détectera automatiquement le fichier `vercel.json` dans le dossier `back-office`
   - Le déploiement se lancera automatiquement à chaque push sur la branche principale
   - Vous pouvez aussi déclencher un déploiement manuel depuis le dashboard Vercel

### Configuration du domaine personnalisé

1. Dans les paramètres du projet Vercel, allez dans "Domains"
2. Ajoutez votre domaine personnalisé (ex: `admin.votredomaine.com`)
3. Suivez les instructions pour configurer les enregistrements DNS
4. Mettez à jour la variable `NEXT_PUBLIC_APP_URL` avec votre nouveau domaine

### Première configuration après déploiement

Après le premier déploiement, accédez à :
```
https://votre-domaine-back-office.vercel.app/setup
```

Cette page vous permettra de créer le premier compte super admin.

### Notes importantes

- Le fichier `vercel.json` configure automatiquement le projet pour utiliser le dossier `back-office` comme racine
- Les variables d'environnement commençant par `NEXT_PUBLIC_` sont exposées côté client
- La variable `SUPABASE_SERVICE_ROLE_KEY` est uniquement disponible côté serveur (API routes)
- Assurez-vous que votre base de données Supabase autorise les requêtes depuis le domaine Vercel