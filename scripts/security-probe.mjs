// Manual security checks of lab 5 (docs/security-notes.md), run against a seeded deployment that the demo accounts
// of the README can log into. Each check sends the attack and states what a safe server answers.
//   npm run security:probe -- --url http://localhost:8091                 (rate limits raised on that server)
//   npm run security:probe -- --url … --limits-url http://localhost:8080  (also checks the auth rate limit there)
// It changes data: a new account per run (locked by the brute-force check) and, for a moment, the author bio.
// Point it at a local or disposable database only.
import { createHmac, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:8080' },
    'limits-url': { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});
const BASE = args.url.replace(/\/$/, '');
const PASSWORD = 'Learnly2026!';
const EVIL_ORIGIN = 'https://evil.example';
const results = [];

function check(area, name, ok, detail) {
  results.push({ area, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${area}] ${name}${detail ? `: ${detail}` : ''}`);
}

async function http(path, { method = 'GET', token, body, headers = {}, cookie, form } = {}) {
  const init = { method, redirect: 'manual', headers: { ...headers } };
  if (token) init.headers.authorization = `Bearer ${token}`;
  if (cookie) init.headers.cookie = cookie;
  if (form) {
    init.headers['content-type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(form).toString();
  } else if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, text, json };
}

async function login(email) {
  const response = await http('/api/v1/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  if (!response.json?.accessToken) throw new Error(`cannot log in as ${email}: ${response.status}`);
  return response.json.accessToken;
}

const denied = (status) => status === 401 || status === 403 || status === 404;
const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

// ---------- setup ----------
const student = await login('student2@learnly.local');
const otherStudent = await login('student3@learnly.local');
const olena = await login('olena.teacher@learnly.local');
const taras = await login('taras.teacher@learnly.local');
// Her course with the most students: it has reviews and lessons that need an enrollment.
const olenaCourse = (await http('/api/v1/instructor/courses', { token: olena })).json.sort((a, b) => b.studentCount - a.studentCount)[0];
const olenaMe = (await http('/api/v1/me', { token: olena })).json;

// ---------- 1. Access control ----------
{
  const anonymous = await http('/api/v1/me');
  check('access', 'anonymous request to /api/v1/me', anonymous.status === 401, `status ${anonymous.status}`);
  const admin = await http('/api/v1/admin/users', { token: student });
  check('access', 'student calls the admin API', admin.status === 403, `status ${admin.status}`);
  const adminPage = await http('/admin', { token: student });
  check('access', 'student opens /admin', denied(adminPage.status) || adminPage.status === 302, `status ${adminPage.status}`);
  const create = await http('/api/v1/instructor/courses', { method: 'POST', token: student, body: { title: 'x' } });
  check('access', 'student creates a course', create.status === 403, `status ${create.status}`);

  const read = await http(`/api/v1/instructor/courses/${olenaCourse.id}`, { token: taras });
  check('access', "instructor reads another instructor's course (IDOR)", denied(read.status), `status ${read.status}`);
  const edit = await http(`/api/v1/instructor/courses/${olenaCourse.id}`, { method: 'PATCH', token: taras, body: { title: 'Taken over' } });
  check('access', "instructor edits another instructor's course (IDOR)", denied(edit.status), `status ${edit.status}`);
  const csv = await http(`/api/v1/instructor/courses/${olenaCourse.id}/students.csv`, { token: taras });
  check('access', "instructor exports another course's students (IDOR)", denied(csv.status), `status ${csv.status}`);


  const reviews = (await http(`/api/v1/courses/${olenaCourse.slug}/reviews`)).json?.items ?? [];
  const studentId = (await http('/api/v1/me', { token: student })).json.id;
  const foreign = reviews.find((review) => review.user.id !== studentId);
  if (foreign) {
    const patch = await http(`/api/v1/reviews/${foreign.id}`, { method: 'PATCH', token: student, body: { rating: 1, text: 'Changed by someone else.' } });
    check('access', "student edits another student's review (IDOR)", denied(patch.status), `status ${patch.status}`);
    const remove = await http(`/api/v1/reviews/${foreign.id}`, { method: 'DELETE', token: student });
    check('access', "student deletes another student's review (IDOR)", denied(remove.status), `status ${remove.status}`);
  }

  await http('/api/v1/me', { method: 'PATCH', token: otherStudent, body: { role: 'admin' } });
  const role = (await http('/api/v1/me', { token: otherStudent })).json.role;
  check('access', 'student sets role=admin in their profile (mass assignment)', role === 'student', `role after: ${role}`);
}

// ---------- 2. Authentication and tokens ----------
{
  const [header, payload, signature] = student.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const escalated = { ...claims, role: 'admin' };

  const none = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(escalated)}.`;
  const noneResponse = await http('/api/v1/admin/users', { token: none });
  check('auth', 'JWT with alg "none" and role admin', noneResponse.status === 401, `status ${noneResponse.status}`);

  const tampered = `${header}.${b64url(escalated)}.${signature}`;
  const tamperedResponse = await http('/api/v1/admin/users', { token: tampered });
  check('auth', 'JWT payload changed to role admin, old signature', tamperedResponse.status === 401, `status ${tamperedResponse.status}`);

  const unsigned = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(escalated)}`;
  const forged = `${unsigned}.${createHmac('sha256', 'secret').update(unsigned).digest('base64url')}`;
  const forgedResponse = await http('/api/v1/admin/users', { token: forged });
  check('auth', 'JWT signed with a guessed secret ("secret")', forgedResponse.status === 401, `status ${forgedResponse.status}`);

  const expired = await http('/api/v1/me', { token: `${header}.${b64url({ ...claims, exp: 1 })}.${signature}` });
  check('auth', 'expired JWT', expired.status === 401, `status ${expired.status}`);

  const email = `probe-${randomUUID().slice(0, 8)}@learnly.local`;
  const register = await http('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Probe User', email, password: PASSWORD, acceptTerms: true, role: 'admin', emailVerified: true },
  });
  const registeredRole = register.json?.user?.role;
  check('auth', 'registration with role=admin and emailVerified=true (mass assignment)',
    register.status < 300 ? registeredRole !== 'admin' && register.json?.user?.emailVerified !== true : register.status === 400,
    `status ${register.status}, role ${registeredRole ?? '-'}`);

  // The new account is enrolled nowhere: a lesson outside the free preview must stay closed to it.
  const detail = (await http(`/api/v1/instructor/courses/${olenaCourse.id}`, { token: olena })).json;
  const locked = detail.modules.flatMap((module) => module.lessons).find((lesson) => !lesson.isPreview);
  const lesson = await http(`/api/v1/learn/lessons/${locked.id}`, { token: register.json?.accessToken });
  check('access', 'a user opens a lesson of a course they are not enrolled in', denied(lesson.status), `status ${lesson.status}`);
  const preview = await http(`/api/v1/courses/${olenaCourse.slug}/preview/${locked.id}`);
  check('access', 'a paid lesson requested through the public preview endpoint', denied(preview.status), `status ${preview.status}`);

  const wrong = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    wrong.push((await http('/api/v1/auth/login', { method: 'POST', body: { email, password: 'wrong-password' } })).status);
  }
  const afterLock = await http('/api/v1/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  check('auth', 'six wrong passwords lock the account, then the right one is refused', afterLock.status !== 200,
    `statuses ${wrong.join(',')}, then ${afterLock.status} ${afterLock.json?.error?.code ?? ''}`.trim());

  const unknown = await http('/api/v1/auth/login', { method: 'POST', body: { email: `nobody-${randomUUID()}@learnly.local`, password: 'x'.repeat(12) } });
  const known = await http('/api/v1/auth/login', { method: 'POST', body: { email: 'student1@learnly.local', password: 'x'.repeat(12) } });
  check('auth', 'login does not reveal whether an email exists', unknown.status === known.status && unknown.json?.error?.code === known.json?.error?.code,
    `${unknown.status} ${unknown.json?.error?.code} vs ${known.status} ${known.json?.error?.code}`);
}

// ---------- 3. Injection and XSS ----------
{
  const normal = (await http('/api/v1/courses')).json.total;
  const sqli = await http(`/api/v1/courses?search=${encodeURIComponent("' OR '1'='1' --")}`);
  check('injection', "SQL injection in the catalog search (' OR '1'='1' --)", sqli.status === 200 && sqli.json.total < normal,
    `status ${sqli.status}, ${sqli.json?.total} of ${normal} courses`);
  const sort = await http(`/api/v1/courses?sort=${encodeURIComponent('title; DROP TABLE users')}`);
  check('injection', 'SQL in the sort parameter', sort.status === 400, `status ${sort.status}`);

  const reflected = await http(`/courses?search=${encodeURIComponent('<script>alert(1)</script>')}`);
  check('xss', 'reflected XSS in the catalog search', !reflected.text.includes('<script>alert(1)</script>'),
    reflected.text.includes('&lt;script&gt;alert(1)&lt;/script&gt;') ? 'echoed escaped' : 'not echoed');

  const payload = [
    '<script>alert("bio")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '[click](javascript:alert(1))',
    '<a href="data:text/html,<script>alert(1)</script>">data link</a>',
    '<iframe src="https://evil.example"></iframe>',
  ].join('\n\n');
  const originalBio = olenaMe.bio;
  const saved = await http('/api/v1/me', { method: 'PATCH', token: olena, body: { bio: payload } });
  const page = await http(`/instructors/${olenaMe.id}`);
  const html = page.text;
  const leaks = ['<script>alert("bio")', 'onerror=', 'onload=', 'javascript:alert', 'data:text/html', '<iframe src="https://evil']
    .filter((needle) => html.includes(needle));
  check('xss', 'stored XSS through Markdown in the author bio (script, onerror, onload, javascript:, data:, iframe)',
    saved.status === 200 && leaks.length === 0, leaks.length ? `found ${leaks.join(', ')}` : 'all stripped on the author page');
  await http('/api/v1/me', { method: 'PATCH', token: olena, body: { bio: originalBio ?? null } });
}

// ---------- 4. File uploads ----------
{
  const upload = async (name, type, content) => {
    const form = new FormData();
    form.append('file', new Blob([content], { type }), name);
    return http('/api/v1/me/avatar', { method: 'POST', token: otherStudent, body: form });
  };
  const html = await upload('avatar.png', 'image/png', '<html><script>alert(1)</script></html>');
  check('upload', 'HTML file renamed to avatar.png', html.status >= 400 && html.status < 500, `status ${html.status} ${html.json?.code ?? ''}`.trim());
  const svg = await upload('avatar.svg', 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');
  check('upload', 'SVG with a script', svg.status >= 400 && svg.status < 500, `status ${svg.status} ${svg.json?.code ?? ''}`.trim());
  const big = await upload('big.png', 'image/png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(3 * 1024 * 1024)]));
  check('upload', 'file over the 1 MB avatar limit', big.status === 413 || big.status === 400, `status ${big.status}`);
}

// ---------- 5. CSRF, redirects, sessions ----------
{
  const loginResponse = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'student3@learnly.local', password: PASSWORD }),
  });
  const cookie = loginResponse.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  const crossSite = { origin: EVIL_ORIGIN, 'sec-fetch-site': 'cross-site' };
  const patch = await http('/api/v1/me', { method: 'PATCH', cookie, headers: crossSite, body: { name: 'CSRF victim' } });
  check('csrf', 'cross-site JSON request with the session cookie, no CSRF token', patch.status === 403, `status ${patch.status}`);
  const form = await http('/logout', { method: 'POST', cookie, headers: crossSite, form: {} });
  check('csrf', 'cross-site form POST /logout without _csrf', form.status === 403, `status ${form.status}`);
  const sameSite = await http('/api/v1/me', { method: 'PATCH', cookie, headers: { origin: BASE, 'sec-fetch-site': 'same-origin' }, body: { name: 'No token' } });
  check('csrf', 'same-origin JSON request with the cookie but no token', sameSite.status === 403, `status ${sameSite.status}`);

  for (const target of ['//evil.example', '/\\evil.example', 'https://evil.example/', '/%2F%2Fevil.example']) {
    const loginPage = await fetch(`${BASE}/login`);
    const pageCookie = loginPage.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
    const token = (await loginPage.text()).match(/name="_csrf" value="([^"]+)"/)?.[1] ?? '';
    const response = await http('/login', {
      method: 'POST',
      cookie: pageCookie,
      form: { _csrf: token, email: 'student1@learnly.local', password: PASSWORD, returnTo: target },
    });
    const location = response.headers.get('location') ?? '';
    check('redirect', `open redirect after login, returnTo=${target}`, response.status >= 300 && response.status < 400 && /^\/(?![/\\])/.test(location),
      `status ${response.status}, Location ${location || '-'}`);
  }

  const refreshLogin = await http('/api/v1/auth/login', { method: 'POST', body: { email: 'student3@learnly.local', password: PASSWORD } });
  const refreshToken = refreshLogin.json?.refreshToken;
  if (refreshToken) {
    const first = await http('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken } });
    await new Promise((done) => setTimeout(done, 11_000));
    const replay = await http('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken } });
    const next = first.json?.refreshToken ? await http('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken: first.json.refreshToken } }) : { status: 'n/a' };
    check('auth', 'a used refresh token replayed later is refused and revokes the family', first.status === 200 && replay.status === 401 && next.status === 401,
      `first ${first.status}, replay ${replay.status}, the new token then ${next.status}`);
  }
}

// ---------- 6. Information disclosure and paths ----------
{
  for (const path of ['/static/..%2f..%2f..%2fpackage.json', '/uploads/..%2f..%2f.env', '/static/%2e%2e/%2e%2e/%2e%2e/package.json', '/.env', '/.git/config', '/apps/server/package.json']) {
    const response = await http(path);
    check('paths', `path traversal or hidden file ${path}`, response.status === 404 || response.status === 400,
      `status ${response.status}`);
  }
  const broken = await http('/api/v1/auth/login', { method: 'POST', body: '{"email": broken' });
  check('disclosure', 'malformed JSON gives a short error without a stack trace', broken.status === 400 && !/at \w+ \(|node_modules|\.ts:\d/.test(broken.text),
    `status ${broken.status}, ${broken.json?.code ?? broken.text.slice(0, 60)}`);
  const missing = await http('/api/v1/does-not-exist');
  check('disclosure', 'unknown API path', missing.status === 404 && !/node_modules|\.ts:\d/.test(missing.text), `status ${missing.status}`);
  const home = await http('/');
  check('disclosure', 'no X-Powered-By header', !home.headers.get('x-powered-by'), home.headers.get('x-powered-by') ?? 'absent');
}

// ---------- 7. Rate limit on the auth endpoints (a server with the normal limits) ----------
if (args['limits-url']) {
  const limitsBase = args['limits-url'].replace(/\/$/, '');
  const statuses = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(`${limitsBase}/api/v1/auth/password/forgot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `nobody-${attempt}@learnly.local` }),
    });
    statuses.push(response.status);
  }
  check('auth', `more than 10 auth requests a minute from one IP (${limitsBase})`, statuses.includes(429), `statuses ${statuses.join(',')}`);
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed`);
if (args.json) console.log(JSON.stringify(results));
process.exit(failed.length === 0 ? 0 : 1);
