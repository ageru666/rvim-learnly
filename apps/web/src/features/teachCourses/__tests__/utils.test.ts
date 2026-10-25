import type { CourseEditor } from '@learnly/contracts/instructor';
import { describe, expect, it } from 'vitest';
import { addTag, statusTone, toCourseForm, toCourseUpdate } from '../utils';

const COURSE: CourseEditor = {
  id: '01970000-0000-7000-8000-00000000c001',
  slug: 'js',
  title: 'JavaScript',
  shortDescription: null,
  description: null,
  coverUrl: null,
  level: 'beginner',
  language: 'uk',
  categoryId: null,
  tags: ['web'],
  outcomes: [],
  requirements: [],
  status: 'draft',
  moderationComment: null,
  editable: true,
  updatedAt: '2026-10-20T10:00:00.000Z',
  modules: [],
};

describe('teach course utils', () => {
  it('maps statuses to badge tones', () => {
    expect(statusTone('draft')).toBe('neutral');
    expect(statusTone('pending_review')).toBe('warning');
    expect(statusTone('published')).toBe('success');
    expect(statusTone('archived')).toBe('info');
  });

  it('turns nulls into empty form values', () => {
    expect(toCourseForm(COURSE)).toMatchObject({ shortDescription: '', description: '', categoryId: '' });
  });

  it('sends only changed fields, without empty list items or an empty category', () => {
    const form = {
      ...toCourseForm(COURSE),
      title: 'JavaScript basics',
      outcomes: [' Variables ', ''],
      requirements: ['', ' A laptop '],
      categoryId: '',
    };
    expect(toCourseUpdate(form, COURSE)).toEqual({ title: 'JavaScript basics', outcomes: ['Variables'], requirements: ['A laptop'] });
    expect(toCourseUpdate(toCourseForm(COURSE), COURSE)).toEqual({});
    const withCategory = { ...toCourseForm(COURSE), categoryId: '01970000-0000-7000-8000-00000000a001' };
    expect(toCourseUpdate(withCategory, COURSE)).toEqual({ categoryId: '01970000-0000-7000-8000-00000000a001' });
  });

  it('adds normalized unique tags up to the limit', () => {
    expect(addTag(['web'], ' JavaScript ', 5)).toEqual(['web', 'javascript']);
    expect(addTag(['web'], 'WEB', 5)).toEqual(['web']);
    expect(addTag(['web'], '  ', 5)).toEqual(['web']);
    expect(addTag(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
  });
});
