const MAILPIT_API = 'http://localhost:8025/api/v1';
const POLL_INTERVAL_MS = 100;
const TIMEOUT_MS = 5000;

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

export interface ReceivedEmail {
  subject: string;
  html: string;
}

async function search(to: string): Promise<MailpitSummary[]> {
  const response = await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const body = (await response.json()) as { messages: MailpitSummary[] };
  return body.messages;
}

/** Waits until Mailpit has `count` messages for the address and returns the newest one. */
export async function waitForEmail(to: string, count = 1): Promise<ReceivedEmail> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const messages = await search(to);
    const newest = messages[0];
    if (messages.length >= count && newest) {
      const message = (await (await fetch(`${MAILPIT_API}/message/${newest.ID}`)).json()) as { HTML: string };
      return { subject: newest.Subject, html: message.HTML };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`No email for ${to} within ${TIMEOUT_MS} ms`);
}

export async function countEmails(to: string): Promise<number> {
  return (await search(to)).length;
}

/** Extracts the token from a link like `/verify-email?token=...` in the email body. */
export function tokenFrom(email: ReceivedEmail, path: string): string {
  const match = new RegExp(`${path}\\?token=([\\w-]+)`).exec(email.html);
  if (!match?.[1]) throw new Error(`No ${path} link in the email`);
  return match[1];
}
