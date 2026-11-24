/** Hong Kong delivery areas where shipping is quoted separately (not included in product price). */
export const HK_REMOTE_AREA_MARKERS = [
  'chek lap kok',
  'cheung chau',
  'discovery bay',
  'lamma',
  'lantau',
  'ma wan',
  'mui wo',
  'outlying island',
  'peng chau',
  'sok kwu wan',
  'tai o',
  'tung chung',
  'yuen long kam tin',
  '大嶼山',
  '東涌',
  '愉景灣',
  '馬灣',
  '赤鱲角',
  '離島',
  '長洲',
  '南丫',
  '坪洲',
  '梅窩',
  '大澳',
] as const;

export type HongKongAddressFields = {
  city?: string;
  region?: string;
  line1?: string;
  line2?: string;
};

function addressBlob(parts: HongKongAddressFields): string {
  return [parts.line1, parts.line2, parts.city, parts.region]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

export function isRemoteHongKongDelivery(parts: HongKongAddressFields): boolean {
  const blob = addressBlob(parts);
  if (!blob) return false;
  return HK_REMOTE_AREA_MARKERS.some((marker) => blob.includes(marker));
}