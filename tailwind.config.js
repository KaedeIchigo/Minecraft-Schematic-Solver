/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mc: {
          dirt: '#866043',
          grass: '#5D8A35',
          stone: '#8A8A8A',
          wood: '#9B7A3E',
          leaf: '#3B7A31',
          ore: '#7A6699',
          sky: '#78A7FF',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
