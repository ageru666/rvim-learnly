const MAILPIT_API = 'http://localhost:8025/api/v1';
const POLL_INTERVAL_MS = 250;
const TIMEOUT_MS = 15_000;

interface MailpitSummary {
  ID: string;
  Subject: string;
}

export interface ReceivedEmail {
  subject: string;
  html: string;
}

async function search(to: string): Promise<MailpitSummary[]> {
  const response = await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  return ((await response.json()) as { messages: MailpitSummary[] }).messages;
}

/** The newest email to the address, waiting for it to arrive. */
export async function latestEmail(to: string): Promise<ReceivedEmail> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const [newest] = await search(to);
    if (newest) {
      const message = (await (await fetch(`${MAILPIT_API}/message/${newest.ID}`)).json()) as { HTML: string };
      return { subject: newest.Subject, html: message.HTML };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`No email for ${to} within ${TIMEOUT_MS} ms`);
}

/** The path of the first link in the email that starts with `path`, e.g. `/verify-email?token=…`. */
export function linkFrom(email: ReceivedEmail, path: string): string {
  const start = email.html.indexOf(path);
  if (start === -1) throw new Error(`No ${path} link in "${email.subject}"`);
  return email.html.slice(start, email.html.indexOf('"', start)).replaceAll('&amp;', '&');
}
