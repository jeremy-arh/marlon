import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const ADMIN_EMAILS = ['thomas@marlon.fr', 'sales@marlon.fr'];
const FROM_EMAIL = process.env.EMAIL_FROM || 'Marlon <noreply@marlon.fr>';

export type SignupNotificationData = {
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  organizationId?: string;
  source: 'register' | 'invitation';
};

function getAdminNotificationHtml(data: SignupNotificationData): string {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Non renseigné';
  const org = data.organizationName || 'Non renseigné';
  const sourceLabel = data.source === 'register' ? 'Inscription directe' : 'Acceptation d\'invitation';
  const boUrl = process.env.NEXT_PUBLIC_BO_URL || 'https://bo.marlon.fr';
  const customerLink = data.organizationId
    ? `${boUrl}/admin/customers/${data.organizationId}`
    : `${boUrl}/admin/customers`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle inscription</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Poppins', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px;">
              <img src="https://qdnwppnrqpiquxboskos.supabase.co/storage/v1/object/public/static-assets/marlon-logo.svg" alt="Logo" style="height: 50px; display: block;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0; text-align: center; font-family: 'Poppins', Arial, sans-serif; font-weight: 600;">Nouvelle inscription sur Marlon</h2>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0; text-align: center; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                Bonjour,
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 20px 0; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                Un nouvel utilisateur s'est inscrit sur la plateforme.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 10px 0; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                <strong>Email :</strong> ${data.email}
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 10px 0; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                <strong>Nom :</strong> ${fullName}
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 10px 0; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                <strong>Organisation :</strong> ${org}
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 30px 0; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                <strong>Source :</strong> ${sourceLabel}
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="${customerLink}" style="display: inline-block; background-color: #00BD82; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-family: 'Poppins', Arial, sans-serif;">
                      Voir le client dans le back-office
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 14px; line-height: 20px; margin: 0; text-align: center; font-family: 'Poppins', Arial, sans-serif; font-weight: 400;">
                Notification automatique Marlon
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Envoie une notification aux admins lorsqu'un nouvel utilisateur s'inscrit.
 * Ne bloque pas en cas d'erreur (log uniquement).
 */
export async function sendSignupNotificationToAdmins(data: SignupNotificationData): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY non configuré - notification admins non envoyée');
    return;
  }

  try {
    await sgMail.send({
      to: ADMIN_EMAILS,
      from: FROM_EMAIL,
      subject: `[Marlon] Nouvelle inscription : ${data.email}`,
      html: getAdminNotificationHtml(data),
    });
  } catch (err) {
    console.error('[email] Erreur envoi notification admins:', err);
  }
}
