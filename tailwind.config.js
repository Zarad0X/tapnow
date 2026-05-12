/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    {
      pattern:
        /(bg|text|border|ring|shadow|from|to|via)-(zinc|blue|indigo|purple|emerald|amber|red|green|yellow|gray|slate)-(50|100|200|300|400|500|600|700|800|900)(\/[0-9]+)?/
    },
    {
      pattern: /(grid-cols|grid-rows)-[1-9]/
    }
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
