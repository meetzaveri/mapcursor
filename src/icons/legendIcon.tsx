import type { ReactElement } from 'react'

// Three swatches against three rules: a key, drawn the way a printed map draws
// one. Shared by the menu drawer's Legend item and the mobile Legend button.
const LegendIcon = ({ size = 14 }: { size?: number }): ReactElement => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <circle cx="3" cy="3" r="1.6" fill="currentColor" />
        <circle cx="3" cy="7" r="1.6" fill="currentColor" />
        <circle cx="3" cy="11" r="1.6" fill="currentColor" />
        <path
            d="M6.75 3H12.5M6.75 7H12.5M6.75 11H12.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
        />
    </svg>
)

export default LegendIcon
