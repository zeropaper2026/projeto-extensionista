/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade visual BIOS iPhones
        bios: {
          primary: {
            50:  '#f0f1f5',
            100: '#e1e2eb',
            200: '#c2c5d8',
            300: '#a0a4c2',
            400: '#767da7',
            500: '#50588f',
            600: '#414a85', // cor de marca oficial
            700: '#353d6d',
            800: '#2c325a',
            900: '#222645',
          },
          dark: '#000000',
        },
      },
    },
  },
  plugins: [],
};
