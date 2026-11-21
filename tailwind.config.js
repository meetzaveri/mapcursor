module.exports = {
    safelist: [
        'text-ink',
        'text-ink-mid',
        'text-ink-muted',
        'text-border-card',
        'bg-accent',
        'bg-accent/10',
        'bg-topbar-hover',
        'ring-accent/30',
    ],
    darkMode: 'class',
    content: [
        './src/**/*.html',
        './src/**/*.js',
        './src/**/*.jsx',
        './src/**/*.ts',
        './src/**/*.tsx',
    ],
    future: {
        removeDeprecatedGapUtilities: true,
    },
    theme: {
        fontFamily: {
            ui: ['Inter', 'system-ui', 'sans-serif'],
            display: ['Inter', 'system-ui', 'sans-serif'],
            sketch: ['Avenir', 'system-ui', 'sans-serif'],
            mono: ['Geist Mono', 'monospace'],
        },
        extend: {
            colors: {
                primary: {
                    blue: '#0052CC',
                    red: '#BF2600',
                },
                cyan: '#9cdbff',
                reds: {
                    r500: '#BF2600',
                    r400: '#DE350B',
                    r300: '#FF5630',
                    r200: '#FF7452',
                    r100: '#FF8F73',
                    r75: '#FFBDAD',
                    r50: '#FFEBE6',
                },
                yellows: {
                    y500: '#FF8B00',
                    y400: '#FF991F',
                    y300: '#FFAB00',
                    y200: '#FFC400',
                    y100: '#FFE380',
                    y75: '#FFF0B3',
                    y50: '#FFFAE6',
                },
                greens: {
                    g500: '#006644',
                    g400: '#00875A',
                    g300: '#36B37E',
                    g200: '#57D9A3',
                    g100: '#79F2C0',
                    g75: '#ABF5D1',
                    g50: '#E3FCEF',
                },
                teals: {
                    t500: '#008DA6',
                    t400: '#00A3BF',
                    t300: '#00B8D9',
                    t200: '#00C7E6',
                    t100: '#79E2F2',
                    t75: '#B3F5FF',
                    t50: '#E6FCFF',
                },
                blues: {
                    b500: '#0747A6',
                    b400: '#0052CC',
                    b300: '#0065FF',
                    b200: '#2684FF',
                    b100: '#4C9AFF',
                    b75: '#B3D4FF',
                    b50: '#DEEBFF',
                },
                purples: {
                    p500: '#403294',
                    p400: '#5243AA',
                    p300: '#6554C0',
                    p200: '#8777D9',
                    p100: '#998DD9',
                    p75: '#C0B6F2',
                    p50: '#EAE6FF',
                },
                neutrals: {
                    n900: '#091E42',
                    n700: '#253858',
                    n500: '#42526E',
                    n300: '#5E6C84',
                    n100: '#7A869A',
                    n80: '#97A0AF',
                    n60: '#B3BAC5',
                    n40: '#DFE1E6',
                    n20: '#F4F5F7',
                },

                canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
                sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)',
                'card-bg': 'rgb(var(--color-card) / <alpha-value>)',

                topbar: 'rgb(var(--color-topbar) / <alpha-value>)',
                'topbar-hover':
                    'rgb(var(--color-topbar-hover) / <alpha-value>)',

                accent: {
                    DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
                    dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
                    glow: 'var(--color-accent-glow)',
                },

                hint: {
                    DEFAULT: 'rgb(var(--color-hint) / <alpha-value>)',
                    fg: 'rgb(var(--color-hint-fg) / <alpha-value>)',
                },

                ink: {
                    DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
                    mid: 'rgb(var(--color-ink-mid) / <alpha-value>)',
                    muted: 'rgb(var(--color-ink-muted) / <alpha-value>)',
                },

                border: {
                    panel: 'rgb(var(--color-border-panel) / <alpha-value>)',
                    card: 'rgb(var(--color-border-card) / <alpha-value>)',
                },

                fill: {
                    amber: '#E8C87A',
                    coral: '#E87A6A',
                    teal: '#7AC4A8',
                    blue: '#7A9AE8',
                    purple: '#A87AE8',
                    dark: '#3A342C',
                    neutral: '#C4B89A',
                },

                sticky: {
                    yellow: '#F2DC90',
                    coral: '#F2A090',
                },
            },

            boxShadow: {
                panel: '0 1px 2px rgb(15 17 21 / 0.05), 0 6px 20px rgb(15 17 21 / 0.08)',
                card: '0 1px 2px rgb(15 17 21 / 0.06), 0 8px 24px rgb(15 17 21 / 0.06)',
                'card-accent':
                    '0 2px 4px rgb(15 17 21 / 0.08), 0 12px 32px rgb(105 101 219 / 0.16)',
                focus: '0 0 0 3px var(--color-accent-glow)',
                sticky: '2px 2px 8px rgba(0, 0, 0, 0.10)',
            },

            borderRadius: {
                card: '8px',
                panel: '12px',
                pill: '100px',
            },

            spacing: {
                96: '24rem',
                128: '32rem',
            },

            screens: {
                tablet: '640px',
                'tablet-landscape': '768px',
                laptop: '1024px',
                desktop: '1280px',
                'big-desktop': '1536px',
                'ultra-desktop': '1792px',
            },
        },
    },
}
