import { useRef, useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import routes from '../../routes'
import { useBaseContext } from '../../views/Base/baseContext'
import { downloadViewportAsImage } from '../../utils/exportViewport'
import { exportBaseAsJson } from '../../utils/exportBase'
import Modal from '../common/modal'
import Button from '../common/button'
import ShortcutsModal from './shortcutsModal'
import SettingsModal from './settingsModal'
import PlaceSearchModal from './placeSearchModal'
import LegendPanelModal from '../legend/legendPanelModal'
import LegendIcon from '../../icons/legendIcon'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import HelpIcon from '../../assets/help.svg?react'
import SettingsIcon from '../../assets/settings.svg?react'
import ChevronRightIcon from '../../assets/chevron-right.svg?react'
import { MENU_BUTTON_ID } from './shapesToolbarId'

const HamburgerIcon = (): ReactElement => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect x="2" y="3.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="11" width="12" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
)

const ExternalIcon = (): ReactElement => (
    <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M7.5 1.5H10.5M10.5 1.5V4.5M10.5 1.5L5.5 6.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const TrashIcon = (): ReactElement => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M6 6v4M8 6v4M3 3.5l.7 7a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-7"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const DownloadIcon = (): ReactElement => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M7 1.5v7M4 5.5L7 8.5l3-3"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M2 9.5v1.5a1 1 0 001 1h8a1 1 0 001-1V9.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const UploadIcon = (): ReactElement => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M7 8.5v-7M4 4.5L7 1.5l3 3"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M2 9.5v1.5a1 1 0 001 1h8a1 1 0 001-1V9.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const SearchIcon = (): ReactElement => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="6.25" cy="6.25" r="4" stroke="currentColor" strokeWidth="1.1" />
        <path
            d="M9.25 9.25L12 12"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
        />
    </svg>
)

const MenuDrawer = (): ReactElement => {
    const refNode = useRef<HTMLDivElement | null>(null)
    const [showMenu, setShowMenu] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showPlaceSearch, setShowPlaceSearch] = useState(false)
    const [showLegend, setShowLegend] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [showExportSubmenu, setShowExportSubmenu] = useState(false)
    const [showImportSubmenu, setShowImportSubmenu] = useState(false)
    const {
        clearBase,
        stateRefForComponentStore,
        twoJSInstance,
        beginBaseImport,
        readBackdropConfig,
        captureBackdrop,
        goToPlace,
        legendPresets,
        meta,
    } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()
    // Search lives in the top bar on desktop; on a phone that row is full, so
    // the menu carries it.
    const showSearchEntry = isMobile

    useEffect(() => {
        const handleClick = (e: MouseEvent): void => {
            if (refNode.current?.contains(e.target as Node)) return
            setShowMenu(false)
        }
        document.addEventListener('mousedown', handleClick, false)
        return (): void => {
            document.removeEventListener('mousedown', handleClick, false)
        }
    }, [])

    // Collapse the export/import flyouts whenever the menu itself closes, so
    // neither lingers open on the next menu open (covers outside-click + toggle).
    useEffect(() => {
        if (!showMenu) {
            setShowExportSubmenu(false)
            setShowImportSubmenu(false)
        }
    }, [showMenu])

    const handleClearClick = (): void => {
        setShowMenu(false)
        setShowConfirm(true)
    }

    const handleShortcutsClick = (): void => {
        setShowMenu(false)
        setShowShortcuts(true)
    }

    const handleSettingsClick = (): void => {
        setShowMenu(false)
        setShowSettings(true)
    }

    const handlePlaceSearchClick = (): void => {
        setShowMenu(false)
        setShowPlaceSearch(true)
    }

    const handleLegendClick = (): void => {
        setShowMenu(false)
        setShowLegend(true)
    }

    const handleDownloadClick = async (): Promise<void> => {
        setShowMenu(false)
        try {
            setIsExporting(true)
            await downloadViewportAsImage(captureBackdrop)
        } catch (err) {
            console.error('Failed to export viewport as image', err)
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportJson = (): void => {
        const scene = twoJSInstance?.scene
        const viewport = scene
            ? {
                  // scene.scale is uniform (number) in this app; guard the
                  // Two.js Vector union rather than cast.
                  scale: typeof scene.scale === 'number' ? scene.scale : 1,
                  tx: scene.translation.x,
                  ty: scene.translation.y,
              }
            : { scale: 1, tx: 0, ty: 0 }
        // A failed meta fetch (shared base, offline) must not cost the export
        // itself: it goes out without meta properties instead.
        void meta
            .exportSet()
            .catch(() => undefined)
            .then((metaSet) =>
                exportBaseAsJson(
                    stateRefForComponentStore.current,
                    viewport,
                    readBackdropConfig(),
                    legendPresets,
                    metaSet
                )
            )
        setShowExportSubmenu(false)
        setShowMenu(false)
    }

    const handleImportJson = (): void => {
        setShowImportSubmenu(false)
        setShowMenu(false)
        // base.tsx owns the file-pick → parse → chooser flow.
        beginBaseImport()
    }

    const handleConfirmClear = (): void => {
        clearBase()
        setShowConfirm(false)
    }

    return (
        <>
            <div
                ref={refNode}
                id={MENU_BUTTON_ID}
                className="relative bg-card-bg border border-border-panel shadow-panel rounded-card"
                style={{
                    position: 'fixed',
                    top: '8px',
                    left: '10px',
                    zIndex: 10,
                }}
            >
                <div
                    title="Menu"
                    className={`
                        w-10 h-10 flex items-center justify-center rounded cursor-pointer
                        transition-all ease-in-out duration-200
                        ${showMenu ? 'bg-accent/10 text-accent-dark ring-1 ring-accent/30' : 'hover:bg-sidebar'}
                    `}
                    onClick={(): void => setShowMenu((prev) => !prev)}
                >
                    <HamburgerIcon />
                </div>

                <div
                    className="absolute left-0"
                    style={{
                        top: '48px',
                        opacity: showMenu ? 1 : 0,
                        zIndex: showMenu ? 20 : -1,
                        pointerEvents: showMenu ? 'auto' : 'none',
                    }}
                >
                    <div className="bg-card-bg border border-border-panel rounded-card shadow-card py-1 w-max min-w-[188px] max-w-[calc(100vw-20px)]">
                        {showSearchEntry && (
                            <>
                                <button
                                    className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                        hover:bg-sidebar rounded cursor-pointer
                                        transition-colors ease-in-out duration-150"
                                    style={{ width: 'calc(100% - 8px)' }}
                                    onClick={handlePlaceSearchClick}
                                >
                                    <SearchIcon />
                                    <span>Search a place</span>
                                </button>
                                <button
                                    className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                        hover:bg-sidebar rounded cursor-pointer
                                        transition-colors ease-in-out duration-150"
                                    style={{ width: 'calc(100% - 8px)' }}
                                    onClick={handleLegendClick}
                                >
                                    <LegendIcon />
                                    <span>Legend</span>
                                </button>
                                <div className="h-px bg-border-panel mx-2 mt-1 mb-1" />
                            </>
                        )}
                        <a
                            href="https://github.com/meetzaveri/mapcursor/releases"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer no-underline
                                transition-colors ease-in-out duration-150"
                            onClick={(): void => setShowMenu(false)}
                        >
                            <div className="flex items-center gap-2.5">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M2 1h10a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z"
                                        stroke="currentColor"
                                        strokeWidth="1.1"
                                    />
                                    <path
                                        d="M4 4.5h6M4 7h6M4 9.5h3.5"
                                        stroke="currentColor"
                                        strokeWidth="1.1"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span>Changelog</span>
                            </div>
                            <ExternalIcon />
                        </a>

                        <Link
                            to={routes.useCases}
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer no-underline
                                transition-colors ease-in-out duration-150"
                            onClick={(): void => setShowMenu(false)}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M1.5 3.5l3.5-1.5 4 1.5 3.5-1.5v8.5l-3.5 1.5-4-1.5-3.5 1.5z"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M5 2v8.5M9 3.5V12"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                />
                            </svg>
                            <span>Use cases</span>
                        </Link>

                        <Link
                            to={routes.support}
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer no-underline
                                transition-colors ease-in-out duration-150"
                            onClick={(): void => setShowMenu(false)}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle
                                    cx="7"
                                    cy="7"
                                    r="5.5"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                />
                                <path
                                    d="M7 4.5v3.5M7 9.5v.5"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span>Support</span>
                        </Link>

                        <Link
                            to={routes.privacy}
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer no-underline
                                transition-colors ease-in-out duration-150"
                            onClick={(): void => setShowMenu(false)}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M7 1.25l4.5 1.75v3.5c0 2.6-1.9 4.7-4.5 5.5-2.6-.8-4.5-2.9-4.5-5.5V3z"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M5.25 7l1.25 1.25L9 5.75"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span>Privacy</span>
                        </Link>

                        <div className="h-px bg-border-panel mx-2 mt-1 mb-1" />

                        <button
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer
                                transition-colors ease-in-out duration-150"
                            style={{ width: 'calc(100% - 8px)' }}
                            onClick={handleShortcutsClick}
                        >
                            <HelpIcon
                                className="w-3.5 h-3.5"
                                stroke="currentColor"
                                color="currentColor"
                                aria-hidden="true"
                            />
                            <span>Keyboard shortcuts</span>
                        </button>

                        <button
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer
                                transition-colors ease-in-out duration-150"
                            style={{ width: 'calc(100% - 8px)' }}
                            onClick={handleSettingsClick}
                        >
                            <SettingsIcon
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                            />
                            <span>Settings</span>
                        </button>

                        <div className="h-px bg-border-panel mx-2 mt-1 mb-1" />

                        <div className="relative">
                            <button
                                className="flex items-center justify-between gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                    hover:bg-sidebar rounded cursor-pointer
                                    transition-colors ease-in-out duration-150"
                                style={{ width: 'calc(100% - 8px)' }}
                                onClick={(): void => {
                                    setShowImportSubmenu(false)
                                    setShowExportSubmenu((prev) => !prev)
                                }}
                            >
                                <span className="flex items-center gap-2.5">
                                    <DownloadIcon />
                                    <span>Export canvas</span>
                                </span>
                                <ChevronRightIcon
                                    className="w-3.5 h-3.5"
                                    stroke="currentColor"
                                    color="currentColor"
                                    aria-hidden="true"
                                />
                            </button>

                            {showExportSubmenu && (
                                <div
                                    className="absolute top-0 bg-card-bg border border-border-panel
                                        rounded-lg shadow-lg py-1 w-max min-w-[152px] z-[101]"
                                    style={{ left: '100%' }}
                                >
                                    <button
                                        className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                            hover:bg-sidebar rounded cursor-pointer
                                            transition-colors ease-in-out duration-150"
                                        style={{ width: 'calc(100% - 8px)' }}
                                        onClick={handleExportJson}
                                    >
                                        <span>Export as JSON</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                            rounded transition-colors ease-in-out duration-150
                                            disabled:opacity-50 disabled:cursor-default"
                                        style={{ width: 'calc(100% - 8px)' }}
                                        title="Coming soon"
                                        disabled
                                    >
                                        <span>Export as SVG</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                className="flex items-center justify-between gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                    hover:bg-sidebar rounded cursor-pointer
                                    transition-colors ease-in-out duration-150"
                                style={{ width: 'calc(100% - 8px)' }}
                                onClick={(): void => {
                                    setShowExportSubmenu(false)
                                    setShowImportSubmenu((prev) => !prev)
                                }}
                            >
                                <span className="flex items-center gap-2.5">
                                    <UploadIcon />
                                    <span>Import canvas</span>
                                </span>
                                <ChevronRightIcon
                                    className="w-3.5 h-3.5"
                                    stroke="currentColor"
                                    color="currentColor"
                                    aria-hidden="true"
                                />
                            </button>

                            {showImportSubmenu && (
                                <div
                                    className="absolute top-0 bg-card-bg border border-border-panel
                                        rounded-lg shadow-lg py-1 w-max min-w-[152px] z-[101]"
                                    style={{ left: '100%' }}
                                >
                                    <button
                                        className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                            hover:bg-sidebar rounded cursor-pointer
                                            transition-colors ease-in-out duration-150"
                                        style={{ width: 'calc(100% - 8px)' }}
                                        onClick={handleImportJson}
                                    >
                                        <span>Import JSON</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                            rounded transition-colors ease-in-out duration-150
                                            disabled:opacity-50 disabled:cursor-default"
                                        style={{ width: 'calc(100% - 8px)' }}
                                        title="Coming soon"
                                        disabled
                                    >
                                        <span>Import SVG</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-ink-mid
                                hover:bg-sidebar rounded cursor-pointer
                                transition-colors ease-in-out duration-150
                                disabled:opacity-50 disabled:cursor-default"
                            style={{ width: 'calc(100% - 8px)' }}
                            onClick={handleDownloadClick}
                            disabled={isExporting}
                        >
                            <DownloadIcon />
                            <span>
                                {isExporting
                                    ? 'Preparing image…'
                                    : 'Download as image'}
                            </span>
                        </button>

                        <div className="h-px bg-border-panel mx-2 mt-1 mb-1" />

                        <button
                            className="flex items-center gap-2.5 px-3 py-2 mx-1 text-sm text-red-500
                                hover:bg-red-500/10 rounded cursor-pointer
                                transition-colors ease-in-out duration-150"
                            style={{ width: 'calc(100% - 8px)' }}
                            onClick={handleClearClick}
                        >
                            <TrashIcon />
                            <span>Clear canvas</span>
                        </button>
                    </div>
                </div>
            </div>

            <PlaceSearchModal
                open={showPlaceSearch}
                onClose={(): void => setShowPlaceSearch(false)}
                onPick={(place): void => goToPlace?.(place.anchor)}
            />

            <LegendPanelModal
                open={showLegend}
                onClose={(): void => setShowLegend(false)}
            />

            <ShortcutsModal
                open={showShortcuts}
                onClose={(): void => setShowShortcuts(false)}
            />

            <SettingsModal
                open={showSettings}
                onClose={(): void => setShowSettings(false)}
            />

            <Modal
                open={showConfirm}
                onClose={(): void => setShowConfirm(false)}
            >
                <div style={{ minWidth: '360px', maxWidth: '440px' }}>
                    <h2 className="text-lg font-semibold mb-3 font-display">
                        Clear canvas?
                    </h2>
                    <p className="text-sm text-ink-mid mb-6">
                        This will permanently remove all elements on this
                        canvas. This cannot be undone.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <Button
                            intent="secondary"
                            size="medium"
                            label="Cancel"
                            onClick={(): void => setShowConfirm(false)}
                        />
                        <button
                            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium
                                hover:bg-red-700 transition-colors ease-in-out duration-150"
                            onClick={handleConfirmClear}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default MenuDrawer
