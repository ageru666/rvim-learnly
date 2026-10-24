import { idSchema } from '@learnly/contracts/common';
import {
  attemptResultSchema,
  attemptSummarySchema,
  quizForStudentSchema,
  submitAttemptSchema,
} from '@learnly/contracts/quizzes';
import { Router } from 'express';
import { z } from 'zod';
import { API_PREFIX } from '../../lib/http.js';
import { parseInput } from '../../lib/validation.js';
import { currentUser, requireAuth } from '../../middlewares/requireRole.js';
import { registerRoute } from '../../openapi/registry.js';
import { getForStudent, listAttempts, submitAttempt } from './quizzes.service.js';

const TAG = 'Quizzes';
const QUIZ = `${API_PREFIX}/learn/quizzes/:quizId`;
const quizParams = z.object({ quizId: idSchema });

export const quizzesApiRouter = Router();

registerRoute({
  method: 'get',
  path: QUIZ,
  tag: TAG,
  summary: 'Quiz for the student: questions without correct answers, attempts info',
  access: 'user',
  params: quizParams,
  responses: { 200: { description: 'Quiz', schema: quizForStudentSchema } },
});
quizzesApiRouter.get(QUIZ, requireAuth, async (req, res) => {
  const { quizId } = parseInput(quizParams, req.params, req.i18n);
  res.json(await getForStudent(currentUser(req), quizId));
});

registerRoute({
  method: 'post',
  path: `${QUIZ}/attempts`,
  tag: TAG,
  summary: 'Submit an attempt; graded on the server (BR-Q1..Q4)',
  access: 'user',
  params: quizParams,
  body: submitAttemptSchema,
  responses: { 201: { description: 'Graded attempt', schema: attemptResultSchema } },
});
quizzesApiRouter.post(`${QUIZ}/attempts`, requireAuth, async (req, res) => {
  const { quizId } = parseInput(quizParams, req.params, req.i18n);
  const { answers } = parseInput(submitAttemptSchema, req.body, req.i18n);
  res.status(201).json(await submitAttempt(currentUser(req), quizId, answers));
});

registerRoute({
  method: 'get',
  path: `${QUIZ}/attempts`,
  tag: TAG,
  summary: 'Attempt history, newest first',
  access: 'user',
  params: quizParams,
  responses: { 200: { description: 'Attempts', schema: z.array(attemptSummarySchema) } },
});
quizzesApiRouter.get(`${QUIZ}/attempts`, requireAuth, async (req, res) => {
  const { quizId } = parseInput(quizParams, req.params, req.i18n);
  res.json(await listAttempts(currentUser(req), quizId));
});
