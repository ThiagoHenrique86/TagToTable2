import WebSocket from 'ws';

// Shim WebSocket for Node.js < 22 (required by Supabase Realtime)
if (typeof global !== 'undefined' && !global.WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).WebSocket = WebSocket;
}

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
// import {Resend} from 'resend';
import {createClient} from '@supabase/supabase-js';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json()); // Enable JSON body parsing

const angularApp = new AngularNodeAppEngine();

/**
 * API endpoint to resend password via email (COMMENTED OUT FOR LATER USE)
 */
/*
app.post('/api/resend-password', async (req, res) => {
  const { email: rawEmail } = req.body;
  const email = rawEmail?.toString().trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail inválido ou não fornecido.' });
  }

  const supabaseUrl = process.env['SUPABASE_URL']?.trim();
  const supabaseKey = process.env['SUPABASE_ANON_KEY']?.trim();
  const resendApiKey = process.env['RESEND_API_KEY']?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente no servidor.' });
  }

  if (!resendApiKey) {
    return res.status(500).json({ error: 'Configuração do Resend (E-mail) ausente no servidor.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    // 1. Fetch user by email
    const { data: user, error: userError } = await supabase
      .from('xml_users')
      .select('name, password')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'E-mail não encontrado em nossa base.' });
    }

    // 2. Send email using Resend
    // Note: Using 'onboarding@resend.dev' is required for free/test accounts.
    // If the user has a verified domain, they should use an email from that domain.
    const { error: emailError } = await resend.emails.send({
      from: 'TagToTable <onboarding@resend.dev>',
      to: [email],
      subject: 'Recuperação de Senha - TagToTable',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #6750A4; text-align: center;">Recuperação de Senha</h2>
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Você solicitou a recuperação de sua senha para o sistema <strong>TagToTable</strong>.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed #6750A4;">
            <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Sua senha atual é:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #6750A4; letter-spacing: 2px;">${user.password}</p>
          </div>
          <p>Por segurança, recomendamos que você altere sua senha logo após realizar o login.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 11px; color: #999; text-align: center;">Este é um e-mail automático enviado pelo sistema TagToTable. Por favor, não responda a este e-mail.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend Error:', emailError);
      // If it's a validation error, it might be because the 'from' address is not allowed for this API key
      // or the 'to' address is not allowed in sandbox mode.
      return res.status(400).json({ 
        error: 'Erro ao enviar e-mail (Resend).', 
        message: emailError.message,
        name: emailError.name
      });
    }

    return res.json({ success: true, message: 'E-mail enviado com sucesso!' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});
*/

/**
 * API endpoint to notify admin about forgot password
 */
app.post('/api/notify-admin-forgot-password', async (req, res) => {
  const { email: rawEmail } = req.body;
  const email = rawEmail?.toString().trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail inválido ou não fornecido.' });
  }

  const supabaseUrl = process.env['SUPABASE_URL']?.trim();
  const supabaseKey = process.env['SUPABASE_ANON_KEY']?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente no servidor.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch user by email to verify existence
    const { data: user, error: userError } = await supabase
      .from('xml_users')
      .select('name, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'E-mail não encontrado em nossa base.' });
    }

    // 2. Fetch all admins and managers to get their emails
    const { data: staff, error: staffError } = await supabase
      .from('xml_users')
      .select('email')
      .in('role', ['admin', 'manager']);

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return res.status(500).json({ error: 'Erro ao buscar administradores/gerentes.' });
    }

    const staffEmails = (staff as { email: string }[] | null)?.map(s => s.email) || [];

    if (staffEmails.length === 0) {
      return res.status(500).json({ error: 'Nenhum administrador ou gerente encontrado no sistema.' });
    }

    // 3. Create notification for staff
    const { error: notifyError } = await supabase
      .from('xml_notifications')
      .insert({
        title: 'Solicitação de Recuperação de Senha',
        message: `O usuário ${user.name} (${user.email}) solicitou a recuperação de senha. Favor entrar em contato ou resetar manualmente.`,
        created_by: 'Sistema',
        target_type: 'specific',
        target_users: staffEmails
      });

    if (notifyError) {
      console.error('Error creating notification:', notifyError);
      return res.status(500).json({ error: 'Erro ao criar notificação para o administrador.' });
    }

    return res.json({ success: true, message: 'Administrador notificado com sucesso!' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
