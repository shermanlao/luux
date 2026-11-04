import ProductImage from '../models/ProductImage';
import ProductOption from '../models/ProductOption';
import Variant from '../models/Variant';

export type OptionTag = { option: string; value: string };

type OptionRow = { name: string; values: string[] };
type VariantRow = {
  id: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_id: number | null;
};

function parseValues(raw: string | null | undefined): string[] {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function parseOptionTags(raw: string | null | undefined): OptionTag[] | null {
  if (raw == null || raw === '') return null;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return value
      .map((item) => ({
        option: String(item?.option || '').trim(),
        value: String(item?.value || '').trim(),
      }))
      .filter((item) => item.option && item.value);
  } catch {
    return null;
  }
}

export function normalizeOptionTags(raw: unknown): OptionTag[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      option: String((item as OptionTag)?.option || '').trim(),
      value: String((item as OptionTag)?.value || '').trim(),
    }))
    .filter((item) => item.option && item.value);
}

function optionValue(variant: VariantRow, index: number) {
  return [variant.option1, variant.option2, variant.option3][index]?.trim() || '';
}

function inferTagsForImage(imageId: number, options: OptionRow[], variants: VariantRow[], claimed: Set<string>) {
  const tags: OptionTag[] = [];
  options.forEach((option, index) => {
    if (!option.name) return;
    for (const value of option.values) {
      const key = `${option.name}\u0000${value}`;
      if (claimed.has(key)) continue;
      const matched = variants.filter((variant) => optionValue(variant, index) === value);
      if (!matched.length) continue;
      const ids = new Set(matched.map((variant) => variant.image_id));
      if (ids.size === 1 && ids.has(imageId)) tags.push({ option: option.name, value });
    }
  });
  return tags;
}

function chooseImageId(variant: VariantRow, photos: { id: number; tags: OptionTag[] }[], options: OptionRow[]) {
  let best: { id: number; score: number; earliest: number } | null = null;
  for (const photo of photos) {
    if (!photo.tags.length) continue;
    const groups = new Map<string, string[]>();
    for (const tag of photo.tags) {
      const values = groups.get(tag.option) || [];
      values.push(tag.value);
      groups.set(tag.option, values);
    }
    let score = 0;
    let earliest = 99;
    let matched = false;
    for (const [name, values] of groups) {
      const index = options.findIndex((option) => option.name === name);
      if (index < 0 || index > 2) continue;
      const current = optionValue(variant, index);
      if (!current || !values.includes(current)) {
        matched = false;
        score = 0;
        break;
      }
      matched = true;
      score += 1;
      if (index < earliest) earliest = index;
    }
    if (!matched || score === 0) continue;
    if (!best || score > best.score || (score === best.score && earliest < best.earliest)) {
      best = { id: photo.id, score, earliest };
    }
  }
  return best?.id ?? null;
}

export async function syncVariantPhotos(productId: number) {
  const images = await ProductImage.findAll({
    where: { product_id: productId },
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const optionModels = await ProductOption.findAll({
    where: { product_id: productId },
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const variantModels = await Variant.findAll({ where: { product_id: productId } });
  const options = optionModels.slice(0, 3).map((option) => ({
    name: option.name.trim(),
    values: parseValues(option.values_json),
  }));
  const variants: VariantRow[] = variantModels.map((variant) => ({
    id: variant.id,
    option1: variant.option1,
    option2: variant.option2,
    option3: variant.option3,
    image_id: variant.image_id,
  }));
  const claimed = new Set<string>();
  const explicit = new Map<number, OptionTag[]>();
  for (const image of images) {
    const stored = parseOptionTags(image.option_tags);
    if (stored == null) continue;
    explicit.set(image.id, stored);
    for (const tag of stored) claimed.add(`${tag.option}\u0000${tag.value}`);
  }
  const photos = images.map((image) => ({
    id: image.id,
    tags: explicit.get(image.id) ?? inferTagsForImage(image.id, options, variants, claimed),
  }));
  for (const variant of variantModels) {
    const row = variants.find((item) => item.id === variant.id)!;
    const next = chooseImageId(row, photos, options);
    if (variant.image_id !== next) {
      variant.image_id = next;
      await variant.save();
    }
  }
  return { images, variants: variantModels };
}
