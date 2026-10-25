import { randomInt } from 'node:crypto';
import type { CertificateDto } from '@learnly/contracts/certificates';
import { CERTIFICATE_CODE_ALPHABET, CERTIFICATE_CODE_LENGTH } from '@learnly/contracts/limits';
import { config } from '../../config/env.js';
import { db, type Tx } from '../../lib/db.js';
import { notFound } from '../../lib/errors.js';
import type { Prisma } from '../../generated/prisma/client.js';

export function generateCode(): string {
  return Array.from({ length: CERTIFICATE_CODE_LENGTH }, () => CERTIFICATE_CODE_ALPHABET[randomInt(CERTIFICATE_CODE_ALPHABET.length)]).join('');
}

export const certificateInclude = {
  enrollment: { select: { courseId: true, course: { select: { slug: true } } } },
} satisfies Prisma.CertificateInclude;

export type CertificateRow = Prisma.CertificateGetPayload<{ include: typeof certificateInclude }>;

export function toCertificateDto(certificate: CertificateRow): CertificateDto {
  return {
    code: certificate.code,
    courseTitle: certificate.courseTitle,
    studentName: certificate.studentName,
    authorName: certificate.authorName,
    issuedAt: certificate.issuedAt.toISOString(),
    revoked: certificate.revokedAt !== null,
    url: new URL(`/certificates/${certificate.code}`, config.APP_URL).toString(),
    courseId: certificate.enrollment.courseId,
    courseSlug: certificate.enrollment.course.slug,
  };
}

const MAX_CODE_TRIES = 5;

/**
 * Issues the certificate of a completed enrollment once (the enrollment id is unique). The names are
 * copied, so later renames do not change an issued certificate. The caller holds the enrollment lock.
 */
export async function issueForEnrollment(tx: Tx, enrollmentId: string): Promise<string> {
  const existing = await tx.certificate.findUnique({ where: { enrollmentId }, select: { code: true } });
  if (existing) return existing.code;
  const enrollment = await tx.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: { user: { select: { name: true } }, course: { select: { title: true, author: { select: { name: true } } } } },
  });
  const isTaken = async (candidate: string) =>
    (await tx.certificate.count({ where: { code: candidate } })) > 0;
  let code = generateCode();
  for (let attempt = 1; attempt < MAX_CODE_TRIES && (await isTaken(code)); attempt += 1) code = generateCode();
  await tx.certificate.create({
    data: {
      enrollmentId,
      code,
      studentName: enrollment.user.name,
      courseTitle: enrollment.course.title,
      authorName: enrollment.course.author.name,
    },
  });
  return code;
}

export async function getByCode(code: string): Promise<CertificateDto> {
  const certificate = await db.certificate.findUnique({ where: { code }, include: certificateInclude });
  if (!certificate) throw notFound();
  return toCertificateDto(certificate);
}

export async function listMine(userId: string): Promise<CertificateDto[]> {
  const certificates = await db.certificate.findMany({
    where: { enrollment: { userId } },
    include: certificateInclude,
    orderBy: { issuedAt: 'desc' },
  });
  return certificates.map(toCertificateDto);
}
