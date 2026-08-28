/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Base / Stitch colors
        "primary": "#003c90",
        "primary-container": "#0f52ba",
        "on-primary": "#ffffff",
        "on-primary-container": "#bcceff",
        "background": "#F8F9FA",
        "on-background": "#191b22",
        "surface": "#ffffff",
        "surface-bright": "#faf8ff",
        "surface-dim": "#dadadc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f3f6",
        "surface-container": "#eeeef0",
        "surface-container-high": "#e8e8ea",
        "surface-container-highest": "#e2e2e5",
        "on-surface": "#1a1c1e",
        "on-surface-variant": "#434653",
        "outline": "#737784",
        "outline-variant": "#c3c6d5",
        "border": "#E0E2E6",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "severity-1": "#D32F2F",
        "severity-2": "#F57C00",
        "severity-3": "#FBC02D",
        "severity-4": "#388E3C",
        "severity-5": "#78909C",
        "text-primary": "#1A1C1E",
        "text-secondary": "#44474E",

        // Clinical Palette (New UI)
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

        // ESI Acuity Tiers (New UI)
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
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      spacing: {
        unit: "4px",
        gutter: "16px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
        "density-compact": "8px",
        "density-comfortable": "16px",
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
