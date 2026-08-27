/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          primary: '#003C90',
          'primary-container': '#0F52BA',
          'on-primary': '#FFFFFF',
          'on-primary-container': '#BCCEFF',
          secondary: '#5B5E6B',
          background: '#F8F9FA',
          surface: '#FFFFFF',
          'surface-bright': '#FAF8FF',
          'surface-low': '#F3F3F6',
          'surface-container': '#EEEEF0',
          'surface-high': '#E8E8EA',
          border: '#E0E2E6',
          outline: '#737784',
          'text-primary': '#1A1C1E',
          'text-secondary': '#44474E',
        },
        esi: {
          1: {
            DEFAULT: '#D32F2F',
            tint: '#FFEBEE',
            border: '#FFCDD2',
            text: '#B71C1C',
            name: 'Resuscitation'
          },
          2: {
            DEFAULT: '#F57C00',
            tint: '#FFF3E0',
            border: '#FFE0B2',
            text: '#E65100',
            name: 'Emergent'
          },
          3: {
            DEFAULT: '#D97706',
            tint: '#FEF3C7',
            border: '#FDE68A',
            text: '#92400E',
            name: 'Urgent'
          },
          4: {
            DEFAULT: '#2E7D32',
            tint: '#E8F5E9',
            border: '#C8E6C9',
            text: '#1B5E20',
            name: 'Less Urgent'
          },
          5: {
            DEFAULT: '#546E7A',
            tint: '#ECEFF1',
            border: '#CFD8DC',
            text: '#37474F',
            name: 'Non-Urgent'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'clinical-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'clinical-md': '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'clinical-lg': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'pulse-red': '0 0 0 4px rgba(211, 47, 47, 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
