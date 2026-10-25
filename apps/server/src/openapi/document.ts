import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { config } from '../config/env.js';
import { registry } from './registry.js';

const DESCRIPTION = `REST API of the Learnly mini-LMS: the same API the React app at \`/app\` uses.

**Authentication.** \`POST /api/v1/auth/login\` returns an \`accessToken\` (15 minutes) and a
\`refreshToken\` (30 days, rotated on every \`POST /api/v1/auth/refresh\`). Send the access token as
\`Authorization: Bearer <token>\` (the Authorize button above). Bearer requests need no CSRF token.

**Language.** \`Accept-Language: uk\` (default) or \`en\` selects the language of \`error.message\`,
\`error.details[].message\` and translated data; the response carries \`Content-Language\`.

**Errors.** Every error is \`{ "error": { "code", "message", "details"?, "rule"?, "unmet"?, "retryAfterSec"? } }\`.
\`code\` is stable (\`VALIDATION_ERROR\` 400, \`UNAUTHORIZED\` 401, \`FORBIDDEN\` 403, \`NOT_FOUND\` 404,
\`CONFLICT\` 409, \`BUSINESS_RULE_VIOLATION\` 422 with the rule id, \`RATE_LIMITED\` 429, \`INTERNAL\` 500);
clients should branch on it, not on the message. Every response has an \`X-Request-Id\` header.

**Lists** are paginated with \`page\` and \`limit\` and return \`{ items, page, limit, total }\`.

Demo accounts after \`npm run db:reset\`: \`student1@learnly.local\`, \`olena.teacher@learnly.local\`,
\`admin@learnly.local\`, password \`Learnly2026!\`. A Postman collection is in \`docs/api/\`.`;

const TAGS = [
  { name: 'System', description: 'Health check' },
  { name: 'Auth', description: 'Registration, login, tokens, email verification and password reset' },
  { name: 'Me', description: 'The current user: profile, password, email, language, sessions' },
  { name: 'Catalog', description: 'Public catalog: courses, categories, instructors, reviews' },
  { name: 'Learning', description: 'Enrollments, the course player, lesson completion, the dashboard' },
  { name: 'Quizzes', description: 'Taking quizzes and reading attempts' },
  { name: 'Reviews', description: 'Course reviews and instructor replies' },
  { name: 'Certificates', description: 'Certificates of the user and public verification' },
  { name: 'Notifications', description: 'In-app notifications' },
  { name: 'Teaching', description: 'Instructor courses, students and statistics' },
  { name: 'Curriculum', description: 'Modules, lessons and quizzes of an instructor course' },
  { name: 'Admin', description: 'Moderation, users, categories, content and the audit log' },
];

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'Learnly API', version: '1.0.0', description: DESCRIPTION },
    servers: [{ url: config.APP_URL, description: 'This server' }],
    tags: TAGS,
  });
}
