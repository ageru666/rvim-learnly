import type { CourseSeed } from '../types.js';
import { VIDEOS } from './videos.js';

export const englishForIt: CourseSeed = {
  title: 'English for IT Professionals',
  shortDescription: 'Stand-ups, pull request comments and technical interviews in clear, confident English.',
  description: `## About the course

A practical course for developers, QA engineers and designers who already read technical English and want to speak and write it at work.

Every module covers one real situation: a daily stand-up, a code review, a job interview.`,
  outcomes: [
    'Give a clear stand-up update',
    'Write polite and precise code review comments',
    'Answer common interview questions',
  ],
  requirements: ['Intermediate reading level (B1)'],
  tags: ['english', 'communication', 'career'],
  category: 'languages',
  author: 'iryna',
  language: 'en',
  level: 'intermediate',
  status: 'published',
  modules: [
    {
      title: 'Daily communication',
      lessons: [
        {
          type: 'text',
          title: 'The stand-up formula',
          minutes: 6,
          preview: true,
          content: `Keep your update short:

1. **Yesterday** — what you finished;
2. **Today** — what you will work on;
3. **Blockers** — what stops you.

> "Yesterday I finished the login form. Today I'm writing tests for it. No blockers."`,
        },
        {
          type: 'text',
          title: 'Asking for help',
          minutes: 6,
          content: `Useful phrases:

- "Do you have a minute to look at…?"
- "I'm stuck on… Could you point me in the right direction?"
- "Just to make sure I understand: …"`,
        },
        {
          type: 'video',
          title: 'Listening practice',
          minutes: 20,
          videoUrl: VIDEOS.gitCrashCourse,
          content: 'Watch the first part and write down five new phrases the speaker uses.',
        },
      ],
    },
    {
      title: 'Code review',
      lessons: [
        {
          type: 'text',
          title: 'Polite comments',
          minutes: 8,
          content: `Prefer questions and suggestions over orders:

| Instead of | Try |
| --- | --- |
| "This is wrong." | "Could this fail when the list is empty?" |
| "Rename it." | "Maybe \`userCount\` would be clearer here?" |`,
        },
        {
          type: 'quiz',
          title: 'Quiz: stand-ups and reviews',
          minutes: 5,
          quiz: {
            passScore: 70,
            questions: [
              {
                text: 'Which parts belong in a stand-up update?',
                options: [
                  ['What you did yesterday', true],
                  ['Your blockers', true],
                  ['Your lunch plans', false],
                ],
              },
              {
                text: 'Which comment is the most polite?',
                explanation: 'A question invites discussion instead of giving an order.',
                options: [
                  ['"Could this fail when the list is empty?"', true],
                  ['"This is wrong."', false],
                  ['"Fix it."', false],
                ],
              },
            ],
          },
        },
        {
          type: 'text',
          title: 'Technical interviews',
          minutes: 8,
          content: 'Think aloud: explain your plan before you write code, and say when you are unsure.',
        },
      ],
    },
  ],
};

export const designSystems: CourseSeed = {
  title: 'Design Systems Fundamentals',
  shortDescription: 'Tokens, components and documentation that keep a product consistent as it grows.',
  description: `Learn how teams build and maintain design systems: from colour and spacing tokens to accessible components and contribution rules.`,
  outcomes: [
    'Define design tokens',
    'Design accessible components',
    'Document usage guidelines',
  ],
  requirements: ['Basic experience with Figma or another design tool'],
  tags: ['design', 'ui', 'accessibility'],
  category: 'design',
  author: 'iryna',
  language: 'en',
  level: 'intermediate',
  status: 'published',
  modules: [
    {
      title: 'Tokens',
      lessons: [
        {
          type: 'text',
          title: 'What is a design token',
          minutes: 7,
          preview: true,
          content: `A token is a named design decision: \`color-text-muted\`, \`radius-md\`, \`space-4\`.

Primitive tokens hold raw values; semantic tokens describe their purpose and can change between light and dark themes.`,
        },
        {
          type: 'text',
          title: 'Colour and contrast',
          minutes: 9,
          content: 'Body text needs a contrast ratio of at least 4.5:1 (WCAG AA). Never convey state with colour alone: add an icon or text.',
        },
        {
          type: 'text',
          title: 'Spacing and type scales',
          minutes: 7,
          content: 'Pick a small set of spacing steps (4, 8, 12, 16, 24, 32…) and a modular type scale, and use only those.',
        },
      ],
    },
    {
      title: 'Components',
      lessons: [
        {
          type: 'text',
          title: 'Anatomy of a button',
          minutes: 8,
          content: 'Variants (primary, secondary, ghost), sizes, states (hover, focus, disabled, loading) and an accessible name.',
        },
        {
          type: 'quiz',
          title: 'Quiz: tokens and components',
          minutes: 5,
          quiz: {
            questions: [
              {
                text: 'What is the minimum contrast ratio for body text in WCAG AA?',
                options: [
                  ['4.5:1', true],
                  ['2:1', false],
                  ['10:1', false],
                ],
              },
              {
                text: 'Which are semantic tokens?',
                options: [
                  ['color-text-muted', true],
                  ['color-danger', true],
                  ['#ff0000', false],
                ],
              },
            ],
          },
        },
        {
          type: 'text',
          title: 'Documentation',
          minutes: 6,
          content: 'For every component document when to use it, when not to, and show do/don’t examples.',
        },
      ],
    },
  ],
};
