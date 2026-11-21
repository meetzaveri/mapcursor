import type { ReactElement } from 'react'

interface CalloutArrowProps {
    pointing: 'up' | 'down'
}

const CalloutArrow = ({ pointing }: CalloutArrowProps): ReactElement => (
    <svg
        width="44"
        height="56"
        viewBox="0 0 44 56"
        fill="none"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={pointing === 'down' ? { transform: 'scaleY(-1)' } : undefined}
    >
        <path d="M30 54C12 46 8 26 20 4" />
        <path d="M11 11L20 4L25 14" />
    </svg>
)

export default CalloutArrow
