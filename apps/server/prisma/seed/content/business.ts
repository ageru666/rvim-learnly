import type { CourseSeed } from '../types.js';
import { VIDEOS } from './videos.js';

export const sqlForAnalysts: CourseSeed = {
  title: 'SQL для аналітиків',
  shortDescription: 'Вибірки, фільтри, групування та зʼєднання таблиць на реальних прикладах.',
  description: `## Про курс

SQL — мова запитів до баз даних, яку використовують аналітики, маркетологи та розробники. Ми працюватимемо з навчальною базою інтернет-магазину: замовлення, клієнти, товари.

Кожен модуль завершується тестом, а в кінці ви напишете звіт про продажі за місяць.`,
  outcomes: [
    'Писати запити SELECT з фільтрами й сортуванням',
    'Агрегувати дані через GROUP BY',
    'Зʼєднувати таблиці через JOIN',
  ],
  requirements: ['Впевнене користування Excel або Google Sheets'],
  tags: ['sql', 'analytics', 'databases'],
  category: 'data-science',
  author: 'taras',
  language: 'uk',
  level: 'intermediate',
  status: 'published',
  modules: [
    {
      title: 'Базові запити',
      lessons: [
        {
          type: 'text',
          title: 'Таблиці, рядки, стовпці',
          minutes: 8,
          preview: true,
          content: `Реляційна база даних зберігає дані в таблицях. Кожен рядок — запис, кожен стовпець — властивість.

\`\`\`sql
SELECT name, email
FROM customers
LIMIT 10;
\`\`\``,
        },
        {
          type: 'text',
          title: 'WHERE та ORDER BY',
          minutes: 10,
          content: `\`\`\`sql
SELECT id, total
FROM orders
WHERE total > 1000
ORDER BY total DESC;
\`\`\`

Умови можна поєднувати через \`AND\` і \`OR\`, а \`IN\` перевіряє належність до списку.`,
        },
        {
          type: 'video',
          title: 'SQL: повний огляд',
          minutes: 30,
          videoUrl: VIDEOS.sqlCourse,
          content: 'Подивіться перші 30 хвилин і виконайте приклади в будь-якій онлайн-пісочниці SQL.',
        },
      ],
    },
    {
      title: 'Агрегати та зʼєднання',
      lessons: [
        {
          type: 'text',
          title: 'GROUP BY',
          minutes: 12,
          content: `\`\`\`sql
SELECT customer_id, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders
GROUP BY customer_id
HAVING SUM(total) > 5000;
\`\`\`

\`WHERE\` фільтрує рядки до групування, \`HAVING\` — групи після нього.`,
        },
        {
          type: 'text',
          title: 'JOIN',
          minutes: 12,
          content: `\`\`\`sql
SELECT c.name, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id;
\`\`\`

\`LEFT JOIN\` залишає всі рядки лівої таблиці, навіть без пари.`,
        },
        {
          type: 'quiz',
          title: 'Тест: агрегати та JOIN',
          minutes: 10,
          quiz: {
            passScore: 70,
            maxAttempts: 2,
            questions: [
              {
                text: 'Яка частина запиту фільтрує вже згруповані дані?',
                explanation: '`HAVING` працює після `GROUP BY`, `WHERE` — до нього.',
                options: [
                  ['HAVING', true],
                  ['WHERE', false],
                  ['ORDER BY', false],
                ],
              },
              {
                text: 'Які функції є агрегатними?',
                options: [
                  ['COUNT', true],
                  ['SUM', true],
                  ['LOWER', false],
                ],
              },
              {
                text: 'Який JOIN залишає всі рядки лівої таблиці?',
                points: 2,
                options: [
                  ['LEFT JOIN', true],
                  ['INNER JOIN', false],
                  ['CROSS JOIN', false],
                ],
              },
            ],
          },
        },
      ],
    },
    {
      title: 'Звіт про продажі',
      lessons: [
        {
          type: 'text',
          title: 'Постановка задачі',
          minutes: 6,
          content: 'Порахуйте виручку, кількість замовлень і середній чек за кожен день місяця.',
        },
        {
          type: 'text',
          title: 'Розбір рішення',
          minutes: 10,
          content: `\`\`\`sql
SELECT DATE(created_at) AS day,
       COUNT(*) AS orders,
       SUM(total) AS revenue,
       ROUND(AVG(total), 2) AS average_check
FROM orders
WHERE created_at >= DATE '2026-09-01' AND created_at < DATE '2026-10-01'
GROUP BY day
ORDER BY day;
\`\`\``,
        },
        {
          type: 'text',
          title: 'Що вивчати далі',
          minutes: 4,
          content: 'Віконні функції, CTE та індекси — наступний крок після цього курсу.',
        },
      ],
    },
  ],
};

export const digitalMarketing: CourseSeed = {
  title: 'Цифровий маркетинг з нуля',
  shortDescription: 'Аудиторія, канали, контент і метрики: як спланувати першу онлайн-кампанію.',
  description: `Курс допоможе скласти простий маркетинговий план для невеликого продукту: від портрета клієнта до звіту про результати.`,
  outcomes: [
    'Описувати цільову аудиторію',
    'Обирати канали просування',
    'Читати основні маркетингові метрики',
  ],
  requirements: ['Без попередньої підготовки'],
  tags: ['marketing', 'smm', 'analytics'],
  category: 'marketing',
  author: 'taras',
  language: 'uk',
  level: 'beginner',
  status: 'published',
  modules: [
    {
      title: 'Аудиторія та цінність',
      lessons: [
        {
          type: 'text',
          title: 'Портрет клієнта',
          minutes: 8,
          preview: true,
          content: `Почніть з питань: хто ваш клієнт, яку проблему він розвʼязує, де шукає рішення.

Запишіть 2–3 портрети з іменами, цілями та запереченнями.`,
        },
        {
          type: 'text',
          title: 'Ціннісна пропозиція',
          minutes: 8,
          content: 'Одне речення: **для кого** продукт, **яку проблему** він розвʼязує і **чим кращий** за альтернативи.',
        },
        {
          type: 'text',
          title: 'Канали просування',
          minutes: 10,
          content: `- пошук і SEO;
- соціальні мережі;
- email-розсилки;
- партнерства та спільноти.

Не намагайтеся бути всюди: оберіть 1–2 канали, де вже є ваша аудиторія.`,
        },
      ],
    },
    {
      title: 'Метрики',
      lessons: [
        {
          type: 'text',
          title: 'Воронка конверсії',
          minutes: 10,
          content: 'Показ → клік → реєстрація → покупка. Конверсія кожного кроку показує, де ви втрачаєте людей.',
        },
        {
          type: 'video',
          title: 'Приклад кампанії',
          minutes: 5,
          videoUrl: VIDEOS.vimeoSample,
          content: 'Короткий ролик як приклад відеоконтенту для соцмереж.',
        },
        {
          type: 'quiz',
          title: 'Тест: аудиторія та метрики',
          minutes: 6,
          quiz: {
            questions: [
              {
                text: 'Що показує конверсія кроку воронки?',
                options: [
                  ['Частку людей, які перейшли на наступний крок', true],
                  ['Кількість показів реклами', false],
                  ['Вартість продукту', false],
                ],
              },
              {
                text: 'Що варто включити в портрет клієнта?',
                options: [
                  ['Цілі', true],
                  ['Заперечення', true],
                  ['Номер паспорта', false],
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};
