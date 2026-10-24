import type { CourseSeed } from '../types.js';
import { VIDEOS } from './videos.js';

export const javascriptBasics: CourseSeed = {
  title: 'Основи JavaScript',
  shortDescription: 'Змінні, функції, масиви й обʼєкти: усе, щоб написати свою першу інтерактивну сторінку.',
  description: `## Про курс

JavaScript оживляє вебсторінки. За кілька тижнів ви пройдете шлях від першого \`console.log\` до невеликого застосунку, який реагує на дії користувача.

Курс складається з коротких текстових уроків, відео та тестів після кожного модуля.

## Для кого

- для тих, хто ніколи не програмував;
- для дизайнерів і тестувальників, які хочуть читати код.`,
  outcomes: [
    'Розуміти змінні, типи даних та оператори',
    'Писати функції та працювати з масивами',
    'Змінювати сторінку через DOM',
    'Обробляти події користувача',
  ],
  requirements: ['Компʼютер з будь-яким сучасним браузером', 'Базові навички роботи з файлами'],
  tags: ['javascript', 'web', 'frontend'],
  category: 'programming',
  author: 'olena',
  language: 'uk',
  level: 'beginner',
  status: 'published',
  modules: [
    {
      title: 'Знайомство з мовою',
      lessons: [
        {
          type: 'text',
          title: 'Що таке JavaScript',
          minutes: 6,
          preview: true,
          content: `JavaScript — мова, яку розуміє кожен браузер. Вона керує поведінкою сторінки: показує повідомлення, перевіряє форми, завантажує дані.

Відкрийте інструменти розробника (F12), перейдіть на вкладку **Console** і введіть:

\`\`\`js
console.log('Привіт, Learnly!');
\`\`\`

Ви щойно виконали свій перший рядок коду.`,
        },
        {
          type: 'video',
          title: 'Огляд мови за годину',
          minutes: 20,
          videoUrl: VIDEOS.javascriptIntro,
          content: 'Подивіться відео та повторіть приклади в консолі браузера.',
        },
        {
          type: 'text',
          title: 'Змінні та типи даних',
          minutes: 10,
          content: `Змінні зберігають значення. Використовуйте \`const\` за замовчуванням і \`let\`, якщо значення змінюватиметься.

\`\`\`js
const name = 'Олена';
let lessonsDone = 0;
lessonsDone = lessonsDone + 1;
\`\`\`

Основні типи: рядок (\`string\`), число (\`number\`), логічне значення (\`boolean\`), \`null\`, \`undefined\`, обʼєкт.`,
        },
      ],
    },
    {
      title: 'Функції та масиви',
      lessons: [
        {
          type: 'text',
          title: 'Функції',
          minutes: 12,
          content: `Функція — іменований фрагмент коду, який можна викликати багато разів.

\`\`\`js
function greet(name) {
  return \`Привіт, \${name}!\`;
}

greet('Тарас'); // "Привіт, Тарас!"
\`\`\`

Стрілкові функції — коротший запис: \`const double = (n) => n * 2;\``,
        },
        {
          type: 'text',
          title: 'Масиви та їхні методи',
          minutes: 12,
          content: `Масив — упорядкований список значень.

| Метод | Що робить |
| --- | --- |
| \`map\` | перетворює кожен елемент |
| \`filter\` | залишає елементи за умовою |
| \`reduce\` | згортає масив в одне значення |

\`\`\`js
const scores = [70, 85, 92];
const passed = scores.filter((score) => score >= 80);
\`\`\``,
        },
        {
          type: 'quiz',
          title: 'Тест: змінні та функції',
          minutes: 8,
          quiz: {
            passScore: 70,
            maxAttempts: 3,
            questions: [
              {
                text: 'Яке ключове слово варто використовувати для змінної, що не змінюється?',
                explanation: '`const` забороняє повторне присвоєння і робить намір зрозумілим.',
                options: [
                  ['const', true],
                  ['let', false],
                  ['var', false],
                ],
              },
              {
                text: 'Які методи масиву повертають новий масив?',
                explanation: '`map` і `filter` повертають новий масив, `forEach` повертає `undefined`.',
                options: [
                  ['map', true],
                  ['filter', true],
                  ['forEach', false],
                ],
              },
              {
                text: 'Що поверне `[1, 2, 3].map((n) => n * 2)`?',
                options: [
                  ['[2, 4, 6]', true],
                  ['[1, 2, 3]', false],
                  ['6', false],
                ],
              },
            ],
          },
        },
      ],
    },
    {
      title: 'Робота зі сторінкою',
      lessons: [
        {
          type: 'text',
          title: 'DOM: дерево елементів',
          minutes: 10,
          content: `Браузер перетворює HTML на дерево обʼєктів — DOM. JavaScript може знаходити елементи й змінювати їх.

\`\`\`js
const title = document.querySelector('h1');
title.textContent = 'Новий заголовок';
\`\`\``,
        },
        {
          type: 'text',
          title: 'Події',
          minutes: 10,
          content: `Події повідомляють про дії користувача: клік, натискання клавіші, надсилання форми.

\`\`\`js
button.addEventListener('click', () => {
  counter += 1;
  output.textContent = String(counter);
});
\`\`\``,
        },
        {
          type: 'video',
          title: 'Повний курс для поглиблення',
          minutes: 30,
          videoUrl: VIDEOS.javascriptCourse,
          content: 'Необовʼязкове відео для тих, хто хоче рухатися далі самостійно.',
        },
      ],
    },
  ],
};

export const gitBasics: CourseSeed = {
  title: 'Git і GitHub для початківців',
  shortDescription: 'Коміти, гілки та pull request-и без страху: керуйте версіями свого коду.',
  description: `## Навіщо Git

Git зберігає історію змін і дозволяє безпечно експериментувати. GitHub додає до цього командну роботу: огляд коду, задачі, автоматичні перевірки.

Після курсу ви впевнено працюватимете з репозиторієм щодня.`,
  outcomes: [
    'Створювати репозиторій і робити коміти',
    'Працювати з гілками та злиттям',
    'Відкривати pull request на GitHub',
  ],
  requirements: ['Встановлений Git', 'Обліковий запис GitHub (необовʼязково для перших модулів)'],
  tags: ['git', 'github', 'tools'],
  category: 'programming',
  author: 'olena',
  language: 'uk',
  level: 'beginner',
  status: 'published',
  modules: [
    {
      title: 'Перші коміти',
      lessons: [
        {
          type: 'text',
          title: 'Як працює контроль версій',
          minutes: 7,
          preview: true,
          content: `Git знімає «знімки» проєкту — коміти. Кожен коміт знає, що змінилося і хто це зробив.

Три області, які варто памʼятати:

1. **робоча директорія** — файли, які ви редагуєте;
2. **індекс (staging)** — зміни, підготовлені до коміту;
3. **репозиторій** — збережена історія.`,
        },
        {
          type: 'text',
          title: 'init, add, commit',
          minutes: 10,
          content: `\`\`\`bash
git init
git add README.md
git commit -m "Add project description"
git log --oneline
\`\`\`

Пишіть повідомлення коміту в наказовому способі: що робить зміна.`,
        },
        {
          type: 'video',
          title: 'Git і GitHub: короткий курс',
          minutes: 25,
          videoUrl: VIDEOS.gitCrashCourse,
          content: 'Повторіть команди з відео у власному тестовому репозиторії.',
        },
      ],
    },
    {
      title: 'Гілки та співпраця',
      lessons: [
        {
          type: 'text',
          title: 'Гілки',
          minutes: 10,
          content: `Гілка — окрема лінія розробки.

\`\`\`bash
git switch -c feature/login
# ...зміни та коміти...
git switch main
git merge feature/login
\`\`\``,
        },
        {
          type: 'text',
          title: 'Pull request',
          minutes: 9,
          content: `Pull request — пропозиція влити гілку в основну. Колеги переглядають код, залишають коментарі, а автоматичні перевірки запускають тести.

Добрий PR невеликий, має зрозумілий опис і посилання на задачу.`,
        },
        {
          type: 'quiz',
          title: 'Тест: основи Git',
          minutes: 6,
          quiz: {
            passScore: 60,
            questions: [
              {
                text: 'Яка команда додає зміни до індексу?',
                options: [
                  ['git add', true],
                  ['git commit', false],
                  ['git push', false],
                ],
              },
              {
                text: 'Що створює команда `git switch -c feature`?',
                explanation: 'Прапорець `-c` створює нову гілку й одразу перемикається на неї.',
                options: [
                  ['Нову гілку і перемикає на неї', true],
                  ['Новий коміт', false],
                  ['Копію репозиторію', false],
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

export const pythonFirstSteps: CourseSeed = {
  title: 'Python: перші кроки',
  shortDescription: 'Синтаксис, умови, цикли та перша програма на Python.',
  description: 'Курс для тих, хто обирає Python як першу мову програмування.',
  outcomes: ['Писати прості програми на Python', 'Використовувати умови та цикли'],
  requirements: ['Встановлений Python 3'],
  tags: ['python'],
  category: 'programming',
  author: 'taras',
  language: 'uk',
  level: 'beginner',
  status: 'pending_review',
  modules: [
    {
      title: 'Початок',
      lessons: [
        {
          type: 'text',
          title: 'Встановлення та перша програма',
          minutes: 8,
          content: '```python\nprint("Привіт, Python!")\n```',
        },
        {
          type: 'video',
          title: 'Python за кілька годин',
          minutes: 30,
          videoUrl: VIDEOS.pythonCourse,
          content: 'Огляд мови від freeCodeCamp.',
        },
        {
          type: 'text',
          title: 'Умови та цикли',
          minutes: 10,
          content: '```python\nfor number in range(3):\n    if number % 2 == 0:\n        print(number)\n```',
        },
      ],
    },
  ],
};

export const jqueryLegacy: CourseSeed = {
  title: 'jQuery для старих проєктів',
  shortDescription: 'Як підтримувати код на jQuery і поступово переходити на сучасний JavaScript.',
  description: 'Курс перенесено в архів: більшість прийомів тепер доступні в стандартному DOM API.',
  outcomes: ['Читати код на jQuery', 'Замінювати jQuery на стандартний DOM API'],
  requirements: ['Основи JavaScript'],
  tags: ['javascript', 'legacy'],
  category: 'programming',
  author: 'taras',
  language: 'uk',
  level: 'intermediate',
  status: 'archived',
  modules: [
    {
      title: 'Від jQuery до DOM API',
      lessons: [
        {
          type: 'text',
          title: 'Селектори',
          minutes: 6,
          content: '`$(".item")` → `document.querySelectorAll(".item")`',
        },
        {
          type: 'text',
          title: 'Події',
          minutes: 6,
          content: '`$(el).on("click", fn)` → `el.addEventListener("click", fn)`',
        },
        {
          type: 'text',
          title: 'AJAX',
          minutes: 6,
          content: '`$.ajax(...)` → `fetch(...)`',
        },
      ],
    },
  ],
};
