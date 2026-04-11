/**
 * Shared Tailwind preset — NBA Sport brand palette.
 * Colors sourced from nbasport.co.th CSS.
 */
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#FF2720',
          'red-dark': '#D90008',
          'red-light': '#FFEBEA',
          'red-mid': '#FF5A52',
          gold: '#FFCE00',
          'gold-text': '#A87800',
          'gold-light': '#FFF6CC',
          navy: '#0C1016',
          navy2: '#141718',
        },
        status: {
          success: '#1A8C5E',
          'success-light': '#E6F5EF',
          warning: '#FFCE00',
          'warning-light': '#FFF6CC',
          danger: '#FF2720',
          'danger-light': '#FFEBEA',
          info: '#1A5FA8',
          'info-light': '#E8F1FB',
        },
      },
      fontFamily: {
        body: ['Sarabun', 'system-ui', 'sans-serif'],
        display: ['Barlow', 'system-ui', 'sans-serif'],
        kanit: ['Kanit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-sm': '0 1px 3px rgba(0,0,0,.08)',
        'brand-md': '0 4px 12px rgba(0,0,0,.10)',
        'brand-lg': '0 8px 24px rgba(0,0,0,.12)',
      },
      borderRadius: {
        brand: '8px',
        'brand-lg': '12px',
        'brand-xl': '16px',
      },
    },
  },
};
