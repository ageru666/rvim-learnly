import { createBrowserRouter } from 'react-router';
import { RequireAuth } from './features/auth/RequireAuth';
import { AppLayout } from './features/navigation/AppLayout';
import { NotFoundPage } from './features/navigation/NotFoundPage';
import { config } from './shared/config';

/** Routes of the dashboard; every story adds its lazily loaded screens here. */
export const router = createBrowserRouter(
  [
    {
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      children: [
        {
          index: true,
          lazy: async () => ({ Component: (await import('./features/dashboard/DashboardPage')).DashboardPage }),
        },
        {
          path: 'courses',
          lazy: async () => ({ Component: (await import('./features/enrollments/MyCoursesPage')).MyCoursesPage }),
        },
        {
          path: 'certificates',
          lazy: async () => ({ Component: (await import('./features/certificates/CertificatesPage')).CertificatesPage }),
        },
        {
          /** Teaching screens: instructors and administrators only. */
          path: 'teach',
          element: <RequireAuth roles={['instructor', 'admin']} />,
          children: [
            {
              index: true,
              lazy: async () => ({ Component: (await import('./features/teachCourses/TeachDashboardPage')).TeachDashboardPage }),
            },
            {
              path: 'courses/:id',
              lazy: async () => ({ Component: (await import('./features/teachCourses/CourseEditorPage')).CourseEditorPage }),
            },
            {
              path: 'lessons/:id',
              lazy: async () => ({ Component: (await import('./features/teachLessons/LessonEditorPage')).LessonEditorPage }),
            },
            {
              path: 'reviews',
              lazy: async () => ({ Component: (await import('./features/reviews/TeachReviewsPage')).TeachReviewsPage }),
            },
          ],
        },
        {
          path: 'settings',
          lazy: async () => ({ Component: (await import('./features/settings/SettingsPage')).SettingsPage }),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      /** The player has its own full-height layout with the curriculum instead of the dashboard header. */
      path: 'learn/:courseId',
      element: <RequireAuth />,
      children: [
        {
          index: true,
          lazy: async () => ({ Component: (await import('./features/player/ResumeCoursePage')).ResumeCoursePage }),
        },
        {
          path: 'completed',
          lazy: async () => ({ Component: (await import('./features/player/CourseCompletedPage')).CourseCompletedPage }),
        },
        {
          path: ':lessonId',
          lazy: async () => ({ Component: (await import('./features/player/PlayerPage')).PlayerPage }),
        },
      ],
    },
  ],
  { basename: config.appBasePath },
);
