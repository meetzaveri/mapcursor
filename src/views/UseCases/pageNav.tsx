import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useMediaQueryUtils } from '../../constants/exportHooks'

const ChevronLeft = (): ReactElement => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

interface PageNavProps {
    backTo: string
    backLabel: string
    mobileBackLabel?: string
}

const PageNav = ({
    backTo,
    backLabel,
    mobileBackLabel = 'Back',
}: PageNavProps): ReactElement => {
    const { isMobile } = useMediaQueryUtils()

    return (
        <nav className="sticky top-0 z-10 bg-sidebar border-b border-border-panel shadow-sm">
            <div className="w-full max-w-2xl laptop:max-w-full mx-auto px-4 tablet-landscape:px-6 py-3 flex items-center justify-between">
                <span className="text-ink font-bold text-sm tablet-landscape:text-base tracking-tight font-display">
                    Mapcursor
                </span>
                <Link
                    to={backTo}
                    className="flex items-center gap-1 text-sm text-ink-mid no-underline font-medium
                        px-2 py-1 rounded-md hover:bg-sidebar transition-all ease-in duration-150"
                >
                    <ChevronLeft />
                    <span>{isMobile ? mobileBackLabel : backLabel}</span>
                </Link>
            </div>
        </nav>
    )
}

export default PageNav
