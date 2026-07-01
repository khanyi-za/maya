/** @type {import('tailwindcss').Config} */
// YIIVA maya redesign — NativeWind v4 + Tailwind v3. Tokens mirror athena
// (see docs/maya-redesign/design-tokens.md). Colors reference CSS variables
// defined in global.css (:root light / .dark:root dark). darkMode: 'class' —
// NativeWind flips it from `colorScheme`.
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        brand: 'var(--brand)',
        'brand-foreground': 'var(--brand-foreground)',
        'brand-subtle': 'var(--brand-subtle)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        success: 'var(--success)',
        'success-foreground': 'var(--success-foreground)',
        'success-subtle': 'var(--success-subtle)',
        warning: 'var(--warning)',
        'warning-foreground': 'var(--warning-foreground)',
        'warning-subtle': 'var(--warning-subtle)',
        danger: 'var(--danger)',
        'danger-foreground': 'var(--danger-foreground)',
        'danger-subtle': 'var(--danger-subtle)',
        info: 'var(--info)',
        'info-foreground': 'var(--info-foreground)',
        'info-subtle': 'var(--info-subtle)',
        like: 'var(--like)',
        save: 'var(--save)',
      },
      borderRadius: {
        lg: '12px',
        md: '10px',
        sm: '8px',
      },
    },
  },
  plugins: [],
}
