/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        secondary: '#ffffff',
        brand: '#7A9E8F',
      },
      gridTemplateColumns: {
        products: 'repeat(auto-fill, minmax(240px, 1fr))',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
