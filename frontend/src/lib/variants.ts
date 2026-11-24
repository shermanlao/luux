import type { Product, Variant } from './types';

export function shopOptions(product: Product) {
  return product.options.filter((option) => !(option.name === 'Title' && option.values[0] === 'Default Title'));
}

export function matchVariant(product: Product, selected: string[], options = shopOptions(product)): Variant | undefined {
  return (
    product.variants.find((row) => {
      const values = [row.option1, row.option2, row.option3];
      return options.every((option, index) => !option.values.length || values[index] === selected[index]);
    }) || product.variants[0]
  );
}

/** Variant that matches the listing price shown on cards (API min / product.price). */
export function listingVariant(product: Product) {
  if (!product.variants.length) return undefined;
  const byListing = product.variants.find((row) => row.price === product.price);
  if (byListing) return byListing;
  return product.variants.reduce((min, row) => (Number(row.price) < Number(min.price) ? row : min), product.variants[0]);
}

/** Default option picks so the product page opens on the same price as listings. */
export function defaultVariantSelection(product: Product, options = shopOptions(product)): string[] {
  const variant = listingVariant(product);
  if (!variant) return options.map((option) => option.values[0] || '');
  const values = [variant.option1, variant.option2, variant.option3];
  return options.map((option, index) => {
    const value = values[index];
    if (value && option.values.includes(value)) return value;
    return option.values[0] || '';
  });
}
