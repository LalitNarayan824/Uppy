import 'dotenv/config';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendDiscordAlert(monitorName: string, status: 'down' | 'up', url: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color = status === 'down' ? 0xff0000 : 0x00ff00;
  const emoji = status === 'down' ? '\u{1F534}' : '\u{1F7E2}';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: `${emoji} Monitor ${status === 'down' ? 'Down' : 'Up'}`,
          description: `**${monitorName}** is now ${status}`,
          color,
          fields: [
            { name: 'URL', value: url, inline: true },
            { name: 'Time', value: new Date().toISOString(), inline: true },
          ],
        },
      ],
    }),
  });
}

export async function sendEmailAlert(
  monitorName: string,
  status: 'down' | 'up',
  url: string,
  recipientEmail: string
) {
  if (!resend || !process.env.EMAIL_FROM) return;

  const emoji = status === 'down' ? '\u{1F534}' : '\u{1F7E2}';
  const subject = `${emoji} ${monitorName} is ${status === 'down' ? 'Down' : 'Back Up'}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: recipientEmail,
    subject,
    html: `
      <h2>${monitorName} is ${status === 'down' ? 'Down' : 'Back Up'}</h2>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `,
  });
}