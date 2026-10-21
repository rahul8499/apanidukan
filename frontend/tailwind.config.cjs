module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        seller: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: 'rgb(var(--seller-primary) / <alpha-value>)',
          600: 'rgb(var(--seller-primary-hover) / <alpha-value>)',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
      },
    },
  },
  plugins: [],
};
