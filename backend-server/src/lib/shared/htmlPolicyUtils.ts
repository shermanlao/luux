const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const TAG_TOKEN = /<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^>]*?)(\/?)\s*>/g;

export function findRegexMatchStarts(html: string, pattern: RegExp): number[] {
  const scanner = new RegExp(pattern.source, pattern.flags);
  const starts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(html)) !== null) {
    starts.push(match.index);
    if (match.index === scanner.lastIndex) scanner.lastIndex += 1;
  }
  return starts;
}

/** Append closing tags so truncated policy HTML stays well-formed. */
export function closeUnclosedHtmlTags(html: string): string {
  const stack: string[] = [];
  let token: RegExpExecArray | null;
  const scanner = new RegExp(TAG_TOKEN.source, TAG_TOKEN.flags);
  while ((token = scanner.exec(html)) !== null) {
    const isClose = token[1] === '/';
    const name = token[2].toLowerCase();
    const selfClose = token[4] === '/' || VOID_HTML_TAGS.has(name);
    if (selfClose) continue;
    if (isClose) {
      if (stack.length > 0 && stack[stack.length - 1] === name) {
        stack.pop();
      } else if (stack.includes(name)) {
        while (stack.length > 0 && stack[stack.length - 1] !== name) stack.pop();
        if (stack.length > 0) stack.pop();
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length === 0) return '';
  return stack
    .reverse()
    .map((tag) => `</${tag}>`)
    .join('');
}

export function collapseAtSecondMatch(html: string, pattern: RegExp, cutToOpeningParagraph = false): string {
  const starts = findRegexMatchStarts(html, pattern);
  if (starts.length < 2) return html;
  let cutAt = starts[1];
  if (cutToOpeningParagraph) {
    const before = html.slice(0, cutAt);
    const pIdx = Math.max(before.lastIndexOf('<p>'), before.lastIndexOf('<p '));
    if (pIdx > starts[0]) cutAt = pIdx;
  }
  const truncated = html.slice(0, cutAt);
  return `${truncated}${closeUnclosedHtmlTags(truncated)}`;
}

export function replaceAll(haystack: string, needle: string, replacement: string): string {
  if (!needle || !haystack.includes(needle)) return haystack;
  return haystack.split(needle).join(replacement);
}