import type { ReactElement } from 'react'
import { useBaseContext } from '../views/Base/baseContext'
import { isUrlBasePath } from '../utils/baseRoutes'

const GoToContentButton = (): ReactElement | null => {
    const { fitToContent, componentStore } = useBaseContext()

    if (!isUrlBasePath()) return null

    const hasContent = Object.keys(componentStore ?? {}).length > 0
    if (!hasContent) return null

    return (
        <button
            onClick={(): void => {
                fitToContent()
            }}
            className="fixed left-1/2 -translate-x-1/2 z-10 top-[62px] tablet:top-auto tablet:bottom-5 flex items-center gap-1.5 bg-card-bg text-ink-muted hover:text-ink rounded-lg px-3 py-1.5 border border-border-panel hover:bg-sidebar transition-colors duration-150 text-xs font-medium select-none"
            title="Frame all content in view"
        >
            <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
            Go to content
        </button>
    )
}

export default GoToContentButton
