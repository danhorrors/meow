import https from 'https';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  sender: string;
  region?: 'us' | 'eu';
}

export interface MailgunPayload {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}

const buildForm = (payload: MailgunPayload, sender: string) => {
  const params = new URLSearchParams();
  params.append('from', sender);
  params.append('to', payload.to.join(','));
  params.append('subject', payload.subject);
  if (payload.html) {
    params.append('html', payload.html);
  }
  if (payload.text) {
    params.append('text', payload.text);
  }

  return params.toString();
};

export class MailgunService {
  async send(config: MailgunConfig, payload: MailgunPayload): Promise<void> {
    const region = config.region === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
    const body = buildForm(payload, config.sender);

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          method: 'POST',
          hostname: region,
          path: `/v3/${config.domain}/messages`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            Authorization:
              'Basic ' + Buffer.from(`api:${config.apiKey}`).toString('base64'),
          },
        },
        (res) => {
          const statusCode = res.statusCode || 500;
          if (statusCode >= 200 && statusCode < 300) {
            res.resume();
            resolve();
          } else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => reject(new Error(data || 'Mailgun request failed')));
          }
        }
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
