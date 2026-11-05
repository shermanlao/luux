import fs from 'fs';
import path from 'path';

export const mailFilesRoot = path.join(__dirname, '..', '..', 'data', 'mail-files');

export function mailFilePath(id: string): string | null {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const root = path.resolve(mailFilesRoot);
  const file = path.resolve(root, id);
  if (file !== path.join(root, id)) return null;
  return file;
}

export function saveMailFile(id: string, bytes: Buffer): void {
  const file = mailFilePath(id);
  if (!file) throw new Error('Invalid attachment id');
  fs.mkdirSync(mailFilesRoot, { recursive: true });
  fs.writeFileSync(file, bytes);
}

export function readMailFile(id: string): Buffer | null {
  const file = mailFilePath(id);
  if (!file || !fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

export function deleteMailFile(id: string): void {
  const file = mailFilePath(id);
  if (!file) return;
  fs.rmSync(file, { force: true });
}
