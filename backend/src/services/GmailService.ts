import { google } from 'googleapis';

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  fromEmail: string;
}

export interface GmailPayload {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}

const buildRawMessage = (from: string, to: string[], subject: string, html?: string, text?: string) => {
  const boundary = 'meow-boundary';
  const headers = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const parts = [];

  if (text) {
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/plain; charset="UTF-8"');
    parts.push('Content-Transfer-Encoding: 7bit');
    parts.push('');
    parts.push(text);
  }

  if (html) {
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/html; charset="UTF-8"');
    parts.push('Content-Transfer-Encoding: 7bit');
    parts.push('');
    parts.push(html);
  }

  parts.push(`--${boundary}--`);

  const message = [...headers, '', ...parts].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export class GmailService {
  async send(config: GmailConfig, payload: GmailPayload): Promise<void> {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: config.refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const raw = buildRawMessage(
      config.fromEmail,
      payload.to,
      payload.subject,
      payload.html,
      payload.text
    );

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
      },
    });
  }
}
