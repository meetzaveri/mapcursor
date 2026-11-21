import React from 'react'
import { Link } from 'react-router-dom'
import routes from '../../routes'
import chatAltIcon from '../../assets/chat-alt-white.svg'
import EnvelopeIcon from '../../assets/envelope_white.svg'
import errorIcon from '../../assets/error.svg'
import { useMediaQueryUtils } from '../../constants/exportHooks'

const ChevronLeft = () => (
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

const cards = []

const SupportPage: React.FC = () => {
    const { isMobile } = useMediaQueryUtils()

    return (
        <div className="min-h-screen bg-canvas">
            <nav className="sticky top-0 z-10 bg-sidebar border-b border-border-panel shadow-sm">
                <div className="w-full max-w-2xl laptop:max-w-full mx-auto px-4 tablet-landscape:px-6 py-3 flex items-center justify-between">
                    <span className="text-ink font-bold text-sm tablet-landscape:text-base tracking-tight font-display">
                        Mapcursor
                    </span>
                    <Link
                        to={routes.index}
                        className="flex items-center gap-1 text-sm text-ink-mid no-underline font-medium
                            px-2 py-1 rounded-md hover:bg-sidebar transition-all ease-in duration-150"
                    >
                        <ChevronLeft />
                        <span>{isMobile ? 'Back' : 'Back to canvas'}</span>
                    </Link>
                </div>
            </nav>

            <main className="w-full max-w-2xl mx-auto px-4 tablet-landscape:px-6 py-8 tablet-landscape:py-12">
                <div className="mb-6 tablet-landscape:mb-10">
                    <h1 className="text-xl tablet-landscape:text-2xl font-bold text-ink tracking-tight mb-2 font-display">
                        Support
                    </h1>
                    <p className="text-xs tablet-landscape:text-sm text-ink-muted leading-relaxed">
                        Meanwhile I create a proper channel (like discord or
                        slack), you can reach out to me{' '}
                        <a
                            className="text-blues-b500 underline"
                            href="https://x.com/meet_zaveri"
                            target="_blank"
                        >
                            here
                        </a>{' '}
                        for the time being and I will respond to your
                        question(s).
                    </p>
                </div>

                <div
                    className="bg-card-bg border border-border-card rounded-card p-3 tablet-landscape:p-4 mb-6 tablet-landscape:mb-8
                    flex flex-col tablet-landscape:flex-row tablet-landscape:items-center gap-3 shadow-card"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-card bg-accent text-white flex items-center justify-center flex-shrink-0">
                            <img
                                src={EnvelopeIcon}
                                className="w-5 h-5"
                                alt="Email"
                            />
                        </div>
                        {isMobile && (
                            <div className="text-xs font-semibold text-ink-mid">
                                Support Email
                            </div>
                        )}
                    </div>
                    <div className="flex items-start flex-col gap-1">
                        {!isMobile && (
                            <div className="text-xs font-semibold text-ink-mid">
                                Support Email Address
                            </div>
                        )}
                        <div className="text-xs text-ink-muted">
                            Please send your detailed query/question here -{' '}
                            <a
                                href="mailto:support@mapcursor.com"
                                className="text-accent-dark font-semibold no-underline border-b border-accent-dark"
                            >
                                support@mapcursor.com
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 tablet-landscape:grid-cols-2 gap-3"></div>
            </main>
        </div>
    )
}

export default SupportPage
