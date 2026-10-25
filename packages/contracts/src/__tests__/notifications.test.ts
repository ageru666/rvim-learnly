import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TYPES } from '../enums.js';
import { buildNotificationLink } from '../notifications.js';

const PAYLOAD = {
  courseId: '01970000-0000-7000-8000-00000000c001',
  courseSlug: 'js',
  applicationId: '01970000-0000-7000-8000-00000000e001',
  certificateCode: 'K7QW2M9XTR',
};

describe('buildNotificationLink', () => {
  it('builds a link for every notification type', () => {
    for (const type of NOTIFICATION_TYPES) expect(buildNotificationLink(type, PAYLOAD)).toMatch(/^\/\S+/);
  });

  it('points each type to the right place', () => {
    expect(buildNotificationLink('course_completed', PAYLOAD)).toBe('/certificates/K7QW2M9XTR');
    expect(buildNotificationLink('course_completed', { courseId: PAYLOAD.courseId })).toBe(`/app/learn/${PAYLOAD.courseId}`);
    expect(buildNotificationLink('course_completed', {})).toBe('/app/learn/');
    expect(buildNotificationLink('review_replied', PAYLOAD)).toBe('/courses/js#reviews');
    expect(buildNotificationLink('review_hidden', {})).toBe('/courses/#reviews');
    expect(buildNotificationLink('course_approved', {})).toBe('/courses/');
    expect(buildNotificationLink('course_rejected', {})).toBe('/app/teach/courses/');
    expect(buildNotificationLink('course_unpublished', PAYLOAD)).toBe(`/app/teach/courses/${PAYLOAD.courseId}`);
    expect(buildNotificationLink('application_approved', {})).toBe('/app/teach');
    expect(buildNotificationLink('application_rejected', {})).toBe('/teach');
    expect(buildNotificationLink('course_new_review', {})).toBe('/app/teach/reviews');
    expect(buildNotificationLink('admin_course_submitted', {})).toBe('/admin/courses/');
    expect(buildNotificationLink('admin_application_submitted', {})).toBe('/admin/applications/');
    expect(buildNotificationLink('admin_application_submitted', PAYLOAD)).toBe(`/admin/applications/${PAYLOAD.applicationId}`);
  });
});
