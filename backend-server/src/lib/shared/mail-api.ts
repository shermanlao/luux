export type MailboxRef = { resourceId: string; address: string };

export function chooseMailbox(mailboxes: MailboxRef[], preferred: string[]): MailboxRef | null {
  const wanted = preferred.map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@'));
  for (const address of wanted) {
    const found = mailboxes.find((item) => item.address.trim().toLowerCase() === address);
    if (found) return found;
  }
  if (mailboxes.length === 1) return mailboxes[0];
  return null;
}
