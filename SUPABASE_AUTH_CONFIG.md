# Configuration Supabase pour les invitations

## Problème
Les liens d'invitation redirigent vers `/catalog` au lieu de `/complete-invitation` car la configuration Supabase n'est pas correcte.

## Solution : configurer les Redirect URLs

1. Allez dans **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Vérifiez que **Site URL** = `https://app.marlon.fr` (sans `/catalog`)
3. Dans **Redirect URLs**, ajoutez :
   - `https://app.marlon.fr/auth/callback` (obligatoire : invitations, reset password, magic link)
   - `https://app.marlon.fr/complete-invitation`
   - `https://app.marlon.fr/reset-password`
   - `https://app.marlon.fr/catalog` (pour les anciens liens)

Ou utilisez un wildcard : `https://app.marlon.fr/**`

4. **Sauvegardez** les modifications

## Après configuration

- **Nouvelles invitations** : redirigeront vers `/auth/callback` puis `/complete-invitation`
- **Réinitialisation mot de passe** : Supabase redirige vers `/auth/callback` qui établit la session puis envoie vers `/reset-password`
- **Anciens liens** (vers `/catalog`) : le script inline redirige automatiquement vers `/auth/callback`

## Notifications admins à l'inscription

Lorsqu'un utilisateur s'inscrit (inscription directe ou acceptation d'invitation), un email est envoyé aux admins : **thomas@marlon.fr** et **sales@marlon.fr**.

Les emails sont envoyés depuis les API routes Next.js via **SendGrid**.

### Configuration SendGrid

Ajoutez dans `.env.local` (app et back-office) :

```
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=Marlon <noreply@marlon.fr>
```

1. Créez un compte sur [SendGrid](https://sendgrid.com)
2. Vérifiez votre domaine ou expéditeur
3. Créez une clé API et ajoutez-la dans les variables d'environnement
