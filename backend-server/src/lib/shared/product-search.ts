import { Op } from 'sequelize';

/** Postgres LIKE is case-sensitive. SQLite LIKE already ignores ASCII case. */
export function productSearchOperator(dialect: string) {
  return dialect === 'postgres' ? Op.iLike : Op.like;
}

/** Literal substring. % and _ would otherwise act as LIKE wildcards. */
export function productSearchPattern(q: string): string | null {
  const literal = q.trim().replace(/[%_]/g, '');
  if (!literal) return null;
  return `%${literal}%`;
}
