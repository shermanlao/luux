export function replySubject(subject: string): string {
  const clean = subject.replace(/\s+/g, ' ').trim().slice(0, 240) || '(no subject)';
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`;
}

export function messagePreview(body: string): string {
  const line = body.replace(/\s+/g, ' ').trim();
  if (line.length <= 120) return line;
  return `${line.slice(0, 117)}…`;
}
