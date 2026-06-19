export default async function handler(req, res) {
  /* CORS headers */
  res.setHeader('Access-Control-Allow-Origin', 'https://www.conor.cl');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, project_type, location, message } = req.body;

    /* Basic validation */
    if (!name || !email || !project_type) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    /* Honeypot check */
    if (req.body._honey) {
      return res.status(200).json({ success: true }); /* Silent reject for bots */
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    /* Send email via Resend */
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CONOR Web <onboarding@resend.dev>',
        to: ['proyectos@conor.cl'],
        reply_to: email,
        subject: `Nueva consulta web — ${project_type} — ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a1a1a; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #e63220; margin: 0; font-size: 20px;">CONOR</h1>
              <p style="color: #999; margin: 4px 0 0; font-size: 13px;">Nueva consulta desde conor.cl</p>
            </div>
            <div style="background: #f8f8f8; padding: 24px; border: 1px solid #eee;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 12px; font-weight: bold; color: #333; border-bottom: 1px solid #eee; width: 140px;">Nombre</td>
                  <td style="padding: 10px 12px; color: #555; border-bottom: 1px solid #eee;">${escapeHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Email</td>
                  <td style="padding: 10px 12px; color: #555; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Tipo de proyecto</td>
                  <td style="padding: 10px 12px; color: #555; border-bottom: 1px solid #eee;">${escapeHtml(project_type)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-weight: bold; color: #333; border-bottom: 1px solid #eee;">Ubicación</td>
                  <td style="padding: 10px 12px; color: #555; border-bottom: 1px solid #eee;">${escapeHtml(location || 'No especificada')}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 12px; font-weight: bold; color: #333; vertical-align: top;">Mensaje</td>
                  <td style="padding: 10px 12px; color: #555; white-space: pre-wrap;">${escapeHtml(message || 'Sin mensaje')}</td>
                </tr>
              </table>
            </div>
            <div style="background: #1a1a1a; padding: 16px 24px; border-radius: 0 0 8px 8px;">
              <p style="color: #666; font-size: 12px; margin: 0;">Enviado desde el formulario de contacto de conor.cl · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(500).json({ error: 'Error enviando email' });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
