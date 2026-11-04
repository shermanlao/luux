import type { OptionTag } from '@/lib/types';

export type { OptionTag };

type OptionRow = { name: string; values: string[] };
type VariantRow = {
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_id: number | null;
};

export type PhotoTagSource = {
  key: string;
  id: number | null;
  option_tags: OptionTag[] | null;
};

function tagKey(tag: OptionTag) {
  return `${tag.option}\u0000${tag.value}`;
}

function optionValue(variant: VariantRow, index: number) {
  return [variant.option1, variant.option2, variant.option3][index]?.trim() || '';
}

function listedOptions(options: OptionRow[]) {
  return options.slice(0, 3).map((option) => ({
    name: option.name.trim(),
    values: option.values.map((value) => value.trim()).filter(Boolean),
  }));
}

export function sameOptionTags(left: OptionTag[], right: OptionTag[]) {
  const norm = (tags: OptionTag[]) => tags.map(tagKey).sort().join('\n');
  return norm(left) === norm(right);
}

function inferTagsForImage(
  imageId: number,
  options: OptionRow[],
  variants: VariantRow[],
  claimed: Set<string>
): OptionTag[] {
  const tags: OptionTag[] = [];
  listedOptions(options).forEach((option, index) => {
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

export function effectivePhotoTags(photos: PhotoTagSource[], options: OptionRow[], variants: VariantRow[]) {
  const claimed = new Set<string>();
  const explicit = new Map<string, OptionTag[]>();
  for (const photo of photos) {
    if (photo.option_tags == null) continue;
    explicit.set(photo.key, photo.option_tags);
    for (const tag of photo.option_tags) claimed.add(tagKey(tag));
  }
  const tags = new Map<string, OptionTag[]>();
  for (const photo of photos) {
    const stored = explicit.get(photo.key);
    tags.set(
      photo.key,
      stored ?? (photo.id ? inferTagsForImage(photo.id, options, variants, claimed) : [])
    );
  }
  return tags;
}
