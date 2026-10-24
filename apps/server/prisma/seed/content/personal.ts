import type { CourseSeed } from '../types.js';

export const timeManagement: CourseSeed = {
  title: 'Тайм-менеджмент і фокус',
  shortDescription: 'Плануйте тиждень, захищайте фокус і доводьте справи до кінця без вигорання.',
  description: `Практичний курс про планування та концентрацію. Кожен урок закінчується невеликою вправою, яку можна виконати того ж дня.`,
  outcomes: [
    'Планувати тиждень і день',
    'Працювати блоками фокусу',
    'Відмовлятися від зайвих задач',
  ],
  requirements: ['Блокнот або застосунок для нотаток'],
  tags: ['productivity', 'focus', 'planning'],
  category: 'productivity',
  author: 'olena',
  language: 'uk',
  level: 'beginner',
  status: 'published',
  modules: [
    {
      title: 'Планування',
      lessons: [
        {
          type: 'text',
          title: 'Тижневий огляд',
          minutes: 6,
          preview: true,
          content: `Раз на тиждень на 30 хвилин:

1. зберіть усі задачі в один список;
2. позначте 3 головні результати тижня;
3. розподіліть їх по днях.`,
        },
        {
          type: 'text',
          title: 'Матриця пріоритетів',
          minutes: 6,
          content: 'Розділіть задачі на термінові й важливі. Важливе, але не термінове — те, що найчастіше відкладають і що найбільше змінює результат.',
        },
        {
          type: 'text',
          title: 'Метод «помідора»',
          minutes: 5,
          content: '25 хвилин зосередженої роботи, 5 хвилин відпочинку. Після чотирьох циклів — довша перерва.',
        },
      ],
    },
    {
      title: 'Фокус і звички',
      lessons: [
        {
          type: 'text',
          title: 'Відволікання',
          minutes: 6,
          content: 'Вимкніть сповіщення на час роботи, закрийте зайві вкладки, тримайте телефон в іншій кімнаті.',
        },
        {
          type: 'text',
          title: 'Як сказати «ні»',
          minutes: 6,
          content: 'Кожне «так» новій задачі — це «ні» чомусь іншому. Відповідайте: «Зараз не можу, але можу в четвер».',
        },
        {
          type: 'quiz',
          title: 'Тест: планування',
          minutes: 4,
          quiz: {
            questions: [
              {
                text: 'Скільки триває один «помідор»?',
                options: [
                  ['25 хвилин', true],
                  ['60 хвилин', false],
                  ['5 хвилин', false],
                ],
              },
              {
                text: 'Що найчастіше відкладають?',
                options: [
                  ['Важливе, але не термінове', true],
                  ['Термінове й важливе', false],
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

export const uxResearchDraft: CourseSeed = {
  title: 'Основи UX-досліджень',
  shortDescription: 'Інтервʼю з користувачами, тестування прототипів і синтез інсайтів.',
  description: 'Чернетка курсу: автор ще працює над програмою.',
  outcomes: ['Проводити інтервʼю з користувачами'],
  requirements: [],
  tags: ['ux', 'research'],
  category: 'design',
  author: 'olena',
  language: 'uk',
  level: 'beginner',
  status: 'draft',
  modules: [
    {
      title: 'Інтервʼю',
      lessons: [
        {
          type: 'text',
          title: 'Як підготувати інтервʼю',
          minutes: 8,
          content: 'Сформулюйте мету дослідження та 5–7 відкритих питань.',
        },
      ],
    },
  ],
};
