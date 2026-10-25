// Generates docs/api/learnly.postman_collection.json and the environment file: `node scripts/build-postman.mjs`.
// Edit this script, not the JSON, and run `npm run test:postman` afterwards.
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lines = (text) =>
  text
    .trim()
    .split('\n')
    .map((line) => line.replace(/^ {6}/, ''));

function test(script) {
  return { listen: 'test', script: { type: 'text/javascript', exec: lines(script) } };
}

function pre(script) {
  return { listen: 'prerequest', script: { type: 'text/javascript', exec: lines(script) } };
}

// Postman keeps the session cookies of a login; a request that must be anonymous drops them first.
const CLEAR_COOKIES = `
      const jar = pm.cookies.jar();
      jar.clear(pm.environment.get('baseUrl'), (error) => { if (error) console.error(error); });`;

const status = (code) => `pm.test('status ${code}', () => pm.response.to.have.status(${code}));`;

function request(
  name,
  method,
  path,
  { auth, body, query, headers = [], tests = '', prerequest, description, formdata } = {},
) {
  const url = {
    raw: `{{baseUrl}}${path}${query ? `?${query.map(([key, value]) => `${key}=${value}`).join('&')}` : ''}`,
    host: ['{{baseUrl}}'],
    path: path.split('/').filter(Boolean),
    ...(query ? { query: query.map(([key, value]) => ({ key, value })) } : {}),
  };
  const header = [{ key: 'Accept-Language', value: '{{locale}}' }, ...headers];
  if (body) header.push({ key: 'Content-Type', value: 'application/json' });
  return {
    name,
    event: [...(prerequest ? [pre(prerequest)] : []), ...(tests ? [test(tests)] : [])],
    request: {
      method,
      header,
      ...(description ? { description } : {}),
      ...(auth
        ? {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: `{{${auth}}}`, type: 'string' }],
            },
          }
        : { auth: { type: 'noauth' } }),
      ...(body
        ? {
            body: {
              mode: 'raw',
              raw: JSON.stringify(body, null, 2),
              options: { raw: { language: 'json' } },
            },
          }
        : {}),
      ...(formdata ? { body: { mode: 'formdata', formdata } } : {}),
      url,
    },
  };
}

const errorShape = `
      pm.test('error body follows the contract', () => {
        const { error } = pm.response.json();
        pm.expect(error.code).to.be.a('string');
        pm.expect(error.message).to.be.a('string');
      });`;

function login(role, emailVar, tokenVar) {
  return request(`Log in as ${role}`, 'POST', '/api/v1/auth/login', {
    body: { email: `{{${emailVar}}}`, password: '{{demoPassword}}' },
    tests: `
      ${status(200)}
      const body = pm.response.json();
      pm.test('returns tokens and the user', () => {
        pm.expect(body.accessToken).to.be.a('string');
        pm.expect(body.refreshToken).to.be.a('string');
        pm.expect(body.user.role).to.eql('${role}');
      });
      pm.collectionVariables.set('${tokenVar}', body.accessToken);
      pm.collectionVariables.set('${tokenVar}Refresh', body.refreshToken);`,
  });
}

const auth = {
  name: 'Auth',
  item: [
    login('student', 'studentEmail', 'studentToken'),
    request('Refresh tokens', 'POST', '/api/v1/auth/refresh', {
      body: { refreshToken: '{{studentTokenRefresh}}' },
      tests: `
      ${status(200)}
      const body = pm.response.json();
      pm.test('the refresh token is rotated', () => pm.expect(body.refreshToken).to.not.eql(pm.collectionVariables.get('studentTokenRefresh')));
      pm.collectionVariables.set('studentToken', body.accessToken);
      pm.collectionVariables.set('studentTokenRefresh', body.refreshToken);`,
    }),
    request('Wrong password', 'POST', '/api/v1/auth/login', {
      body: { email: '{{studentEmail}}', password: 'wrong-password' },
      tests: `
      ${status(401)}
      ${errorShape}
      pm.test('code UNAUTHORIZED', () => pm.expect(pm.response.json().error.code).to.eql('UNAUTHORIZED'));`,
    }),
  ],
};

const me = {
  name: 'Me',
  item: [
    request('Current user', 'GET', '/api/v1/me', {
      auth: 'studentToken',
      tests: `
      ${status(200)}
      pm.test('is the student', () => pm.expect(pm.response.json().email).to.eql(pm.environment.get('studentEmail')));`,
    }),
    request('Dashboard', 'GET', '/api/v1/me/dashboard', {
      auth: 'studentToken',
      tests: status(200),
    }),
    request('My enrollments', 'GET', '/api/v1/me/enrollments', {
      auth: 'studentToken',
      tests: status(200),
    }),
    request('My certificates', 'GET', '/api/v1/me/certificates', {
      auth: 'studentToken',
      tests: status(200),
    }),
    request('Unread notifications', 'GET', '/api/v1/me/notifications/unread-count', {
      auth: 'studentToken',
      tests: status(200),
    }),
    request('Without a token', 'GET', '/api/v1/me', {
      prerequest: CLEAR_COOKIES,
      tests: `
      ${status(401)}
      ${errorShape}`,
    }),
  ],
};

const catalog = {
  name: 'Catalog',
  item: [
    request('Categories', 'GET', '/api/v1/categories', {
      tests: `
      ${status(200)}
      const categories = pm.response.json();
      pm.test('has categories', () => pm.expect(categories.length).to.be.above(0));
      pm.collectionVariables.set('categoryId', categories[0].id);`,
    }),
    request('Courses (filtered, paginated)', 'GET', '/api/v1/courses', {
      query: [
        ['level', 'beginner'],
        ['page', '1'],
        ['limit', '6'],
      ],
      tests: `
      ${status(200)}
      const page = pm.response.json();
      pm.test('is a page', () => pm.expect(page).to.have.keys('items', 'page', 'limit', 'total'));
      pm.test('only beginner courses', () => page.items.forEach((course) => pm.expect(course.level).to.eql('beginner')));
      if (page.items[0]) pm.collectionVariables.set('anyCourseSlug', page.items[0].slug);`,
    }),
    request('Course by slug', 'GET', '/api/v1/courses/{{anyCourseSlug}}', { tests: status(200) }),
    request('Course reviews', 'GET', '/api/v1/courses/{{anyCourseSlug}}/reviews', {
      tests: status(200),
    }),
    request('Public statistics', 'GET', '/api/v1/stats/public', { tests: status(200) }),
    request('Unknown course', 'GET', '/api/v1/courses/no-such-course', {
      tests: `
      ${status(404)}
      ${errorShape}`,
    }),
  ],
};

const instructorFlow = [
  login('instructor', 'instructorEmail', 'instructorToken'),
  request('Create a course', 'POST', '/api/v1/instructor/courses', {
    auth: 'instructorToken',
    prerequest: `pm.collectionVariables.set('courseTitle', 'Postman demo course ' + Date.now());`,
    body: {
      title: '{{courseTitle}}',
      categoryId: '{{categoryId}}',
      level: 'beginner',
      language: 'en',
    },
    tests: `
      ${status(201)}
      const course = pm.response.json();
      pm.test('starts as a draft', () => pm.expect(course.status).to.eql('draft'));
      pm.collectionVariables.set('courseId', course.id);
      pm.collectionVariables.set('courseSlug', course.slug);`,
  }),
  request('Fill in the description', 'PATCH', '/api/v1/instructor/courses/{{courseId}}', {
    auth: 'instructorToken',
    body: {
      shortDescription: 'A short course created by the Postman collection.',
      description: 'This course shows the whole publication flow through the REST API.',
      outcomes: ['Use the Learnly API', 'Publish a course'],
      requirements: ['Postman or Newman'],
      tags: ['api', 'demo'],
    },
    tests: status(200),
  }),
  request('Upload a cover', 'POST', '/api/v1/instructor/courses/{{courseId}}/cover', {
    auth: 'instructorToken',
    formdata: [{ key: 'file', type: 'file', src: 'docs/api/fixtures/cover.png' }],
    tests: `
      ${status(200)}
      pm.test('stores the cover', () => pm.expect(pm.response.json().coverUrl).to.match(/^\\/uploads\\//));`,
  }),
  request('Add a module', 'POST', '/api/v1/instructor/courses/{{courseId}}/modules', {
    auth: 'instructorToken',
    body: { title: 'Getting started' },
    tests: `
      ${status(201)}
      pm.collectionVariables.set('moduleId', pm.response.json().id);`,
  }),
  ...[
    ['Add text lesson 1', 'What the API is', 'text', 'lesson1Id'],
    ['Add text lesson 2', 'Tokens and languages', 'text', 'lesson2Id'],
    ['Add a quiz lesson', 'Check yourself', 'quiz', 'quizLessonId'],
  ].map(([name, title, type, variable]) =>
    request(name, 'POST', '/api/v1/instructor/modules/{{moduleId}}/lessons', {
      auth: 'instructorToken',
      body: { title, type },
      tests: `
      ${status(201)}
      pm.collectionVariables.set('${variable}', pm.response.json().id);`,
    }),
  ),
  request('Write lesson 1', 'PATCH', '/api/v1/instructor/lessons/{{lesson1Id}}', {
    auth: 'instructorToken',
    body: {
      content: '# The API\n\nEvery screen of Learnly uses this REST API.',
      durationMinutes: 5,
      isPreview: true,
    },
    tests: status(200),
  }),
  request('Write the quiz', 'PUT', '/api/v1/instructor/lessons/{{quizLessonId}}/quiz', {
    auth: 'instructorToken',
    body: {
      passScore: 50,
      maxAttempts: 3,
      shuffle: false,
      revealAnswers: 'always',
      questions: [
        {
          type: 'single',
          text: 'Which header selects the language of messages?',
          explanation: 'Accept-Language: uk or en.',
          points: 1,
          options: [
            { text: 'Accept-Language', isCorrect: true },
            { text: 'X-Locale', isCorrect: false },
          ],
        },
      ],
    },
    tests: status(200),
  }),
  request('Readiness checklist', 'GET', '/api/v1/instructor/courses/{{courseId}}/readiness', {
    auth: 'instructorToken',
    tests: `
      ${status(200)}
      const readiness = pm.response.json();
      pm.test('every item is met', () => pm.expect(readiness.items.filter((item) => !item.ok)).to.eql([]));`,
  }),
  request('Submit for review', 'POST', '/api/v1/instructor/courses/{{courseId}}/submit', {
    auth: 'instructorToken',
    tests: `
      ${status(200)}
      pm.test('awaits review', () => pm.expect(pm.response.json().status).to.eql('pending_review'));`,
  }),
];

const adminFlow = [
  login('admin', 'adminEmail', 'adminToken'),
  request('Pending courses', 'GET', '/api/v1/admin/courses', {
    auth: 'adminToken',
    query: [
      ['status', 'pending_review'],
      ['search', '{{courseTitle}}'],
    ],
    tests: `
      ${status(200)}
      pm.test('contains the submitted course', () => {
        const ids = pm.response.json().items.map((course) => course.id);
        pm.expect(ids).to.include(pm.collectionVariables.get('courseId'));
      });`,
  }),
  request('Approve the course', 'POST', '/api/v1/admin/courses/{{courseId}}/approve', {
    auth: 'adminToken',
    tests: `
      ${status(200)}
      pm.test('is published', () => pm.expect(pm.response.json().status).to.eql('published'));`,
  }),
  request('The catalog contains the course', 'GET', '/api/v1/courses', {
    query: [['search', '{{courseTitle}}']],
    tests: `
      ${status(200)}
      pm.test('found by title', () => {
        const slugs = pm.response.json().items.map((course) => course.slug);
        pm.expect(slugs).to.include(pm.collectionVariables.get('courseSlug'));
      });`,
  }),
];

const studentFlow = [
  login('student', 'studentEmail', 'studentToken'),
  request('Enroll', 'POST', '/api/v1/courses/{{courseId}}/enrollment', {
    auth: 'studentToken',
    tests: `
      ${status(201)}
      pm.test('opens the first lesson', () => pm.expect(pm.response.json().firstLessonId).to.eql(pm.collectionVariables.get('lesson1Id')));`,
  }),
  request('Course in the player', 'GET', '/api/v1/learn/courses/{{courseId}}', {
    auth: 'studentToken',
    tests: `
      ${status(200)}
      const lessons = pm.response.json().modules.flatMap((module) => module.lessons);
      pm.collectionVariables.set('quizId', lessons.find((lesson) => lesson.type === 'quiz').quizId);`,
  }),
  request('Open lesson 1', 'GET', '/api/v1/learn/lessons/{{lesson1Id}}', {
    auth: 'studentToken',
    tests: status(200),
  }),
  request('Complete lesson 1', 'PUT', '/api/v1/learn/lessons/{{lesson1Id}}/completion', {
    auth: 'studentToken',
    tests: `
      ${status(200)}
      pm.test('progress is 33 %', () => pm.expect(pm.response.json().progress).to.eql(33));`,
  }),
  request('Open the quiz', 'GET', '/api/v1/learn/quizzes/{{quizId}}', {
    auth: 'studentToken',
    tests: `
      ${status(200)}
      const quiz = pm.response.json();
      pm.test('hides the correct answers', () => pm.expect(JSON.stringify(quiz)).to.not.include('isCorrect'));
      const question = quiz.questions[0];
      const answer = question.options.find((option) => option.text === 'Accept-Language');
      pm.collectionVariables.set('answers', JSON.stringify({ [question.id]: [answer.id] }));`,
  }),
  request('Submit the quiz', 'POST', '/api/v1/learn/quizzes/{{quizId}}/attempts', {
    auth: 'studentToken',
    tests: `
      ${status(201)}
      pm.test('passes with 100 %', () => {
        const result = pm.response.json();
        pm.expect(result.passed).to.eql(true);
        pm.expect(result.scorePercent).to.eql(100);
      });`,
  }),
  request('Review the course', 'POST', '/api/v1/courses/{{courseId}}/reviews', {
    auth: 'studentToken',
    body: { rating: 5, text: 'Created and reviewed entirely through the API.' },
    tests: `
      ${status(201)}
      pm.test('shows the rating', () => pm.expect(pm.response.json().rating).to.eql(5));`,
  }),
  request('Second review is a conflict', 'POST', '/api/v1/courses/{{courseId}}/reviews', {
    auth: 'studentToken',
    body: { rating: 4, text: 'A second review of the same course.' },
    tests: `
      ${status(409)}
      ${errorShape}`,
  }),
];
// The quiz answers are computed in the previous request; Postman cannot template a JSON object.
studentFlow[6].request.body = {
  mode: 'raw',
  raw: '{ "answers": {{answers}} }',
  options: { raw: { language: 'json' } },
};
studentFlow[6].request.header.push({ key: 'Content-Type', value: 'application/json' });

function localizedError(language) {
  return request(`Validation error (${language})`, 'GET', '/api/v1/courses', {
    query: [
      ['level', 'expert'],
      ['minRating', '9'],
    ],
    headers: [{ key: 'Accept-Language', value: language }],
    prerequest: CLEAR_COOKIES,
    description:
      'Anonymous on purpose: for a signed-in user the account language wins over Accept-Language.',
    tests: `
      ${status(400)}
      ${errorShape}
      const { error } = pm.response.json();
      pm.test('Content-Language is ${language}', () => pm.expect(pm.response.headers.get('Content-Language')).to.eql('${language}'));
      pm.test('details name the fields', () => pm.expect(error.details.map((detail) => detail.path)).to.include.members(['level', 'minRating']));
      ${
        language === 'uk'
          ? `pm.collectionVariables.set('ukErrorCode', error.code);
      pm.collectionVariables.set('ukErrorMessage', error.message);
      pm.test('the message is in Ukrainian', () => pm.expect(error.message).to.match(/[а-яіїєґ]/i));`
          : `pm.test('the same code as in Ukrainian', () => pm.expect(error.code).to.eql(pm.collectionVariables.get('ukErrorCode')));
      pm.test('a different, English message', () => {
        pm.expect(error.message).to.not.eql(pm.collectionVariables.get('ukErrorMessage'));
        pm.expect(error.message).to.not.match(/[а-яіїєґ]/i);
      });`
      }`,
  });
}

const localized = { name: 'Localized error', item: [localizedError('uk'), localizedError('en')] };
for (const item of localized.item)
  item.request.header = item.request.header.filter((header) => header.value !== '{{locale}}');

const collection = {
  info: {
    name: 'Learnly API',
    description:
      'Demo of the Learnly REST API (lab 3). Run it against a freshly seeded server: `npm run db:reset`, ' +
      '`npm run dev`, then `npm run test:postman`. Variables live in learnly.postman_environment.json; ' +
      'switch `locale` between uk and en to see every message in the other language. The OpenAPI ' +
      'document of the same API is at /api/docs.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  event: [
    test(`
      pm.test('X-Request-Id is present', () => pm.expect(pm.response.headers.get('X-Request-Id')).to.be.a('string'));`),
  ],
  variable: [],
  item: [
    auth,
    me,
    catalog,
    {
      name: 'Demo flow',
      description:
        'Instructor creates a course and submits it; an administrator approves it; the catalog contains it; ' +
        'a student enrolls, completes a lesson, passes the quiz and leaves a review. Every run uses a new course.',
      item: [
        { name: '1. Instructor', item: instructorFlow },
        { name: '2. Administrator', item: adminFlow },
        { name: '3. Student', item: studentFlow },
      ],
    },
    localized,
  ],
};

const environment = {
  name: 'Learnly (local)',
  values: [
    ['baseUrl', 'http://localhost:3000'],
    ['locale', 'en'],
    ['demoPassword', 'Learnly2026!'],
    ['studentEmail', 'student1@learnly.local'],
    ['instructorEmail', 'olena.teacher@learnly.local'],
    ['adminEmail', 'admin@learnly.local'],
  ].map(([key, value]) => ({
    key,
    value,
    type: key === 'demoPassword' ? 'secret' : 'default',
    enabled: true,
  })),
  _postman_variable_scope: 'environment',
};

writeFileSync(
  join(root, 'docs/api/learnly.postman_collection.json'),
  JSON.stringify(collection, null, 2) + '\n',
);
writeFileSync(
  join(root, 'docs/api/learnly.postman_environment.json'),
  JSON.stringify(environment, null, 2) + '\n',
);
