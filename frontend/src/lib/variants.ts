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
