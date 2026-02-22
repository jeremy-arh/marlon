# Configuration Supabase pour les invitations

## Problème
Les liens d'invitation redirigent vers `/catalog` au lieu de `/complete-invitation` car la configuration Supabase n'est pas correcte.

## Solution : configurer les Redirect URLs

1. Allez dans **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Vérifiez que **Site URL** = `https://app.marlon.fr` (sans `/catalog`)
3. Dans **Redirect URLs**, ajoutez :
   - `https://app.marlon.fr/auth/callback`
   - `https://app.marlon.fr/complete-invitation`
   - `https://app.marlon.fr/catalog` (pour les anciens liens)

Ou utilisez un wildcard : `https://app.marlon.fr/**`

4. **Sauvegardez** les modifications

## Après configuration

- **Nouvelles invitations** : redirigeront vers `/auth/callback` puis `/complete-invitation`
- **Anciens liens** (vers `/catalog`) : le script inline redirige automatiquement vers `/auth/callback`
