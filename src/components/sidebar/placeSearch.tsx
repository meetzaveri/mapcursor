import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { useTopRightOffset } from '../../hooks/useTopRightOffset'
import { usePlaceSearch } from '../../hooks/usePlaceSearch'
import type { PlaceResult } from '../../utils/placeSearch'

const DESKTOP_WIDTH = 260

const PlaceSearch = (): ReactElement | null => {
    const { goToPlace } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()
    const isActive = !isMobile
    const { query, setQuery, results, searching, reset } =
        usePlaceSearch(isActive)
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)

    const rightOffset = useTopRightOffset(isActive)

    useEffect(() => {
        if (!open) return
        const handleClickOutside = (e: MouseEvent): void => {
            if (rootRef.current?.contains(e.target as Node)) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return (): void =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    useEffect(() => {
        if (!isActive) {
            setOpen(false)
            reset()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive])

    if (!isActive) return null

    const handlePick = (place: PlaceResult): void => {
        goToPlace(place.anchor)
        setQuery(place.label)
        setOpen(false)
    }

    return (
        <div
            ref={rootRef}
            className="fixed flex flex-col"
            style={{
                top: '8px',
                right: `${rightOffset}px`,
                zIndex: 12,
                width: `${DESKTOP_WIDTH}px`,
            }}
        >
            <div className="bg-card-bg border border-border-panel rounded-card px-2 py-1">
                <input
                    type="text"
                    value={query}
                    placeholder="Search a place…"
                    aria-label="Search a place"
                    onChange={(e): void => {
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={(): void => setOpen(true)}
                    className="w-full h-9 px-1 text-sm bg-transparent text-ink
                        border-0 outline-none placeholder:text-ink-muted"
                />
            </div>

            {open && query.trim() !== '' && (
                <div className="mt-1 bg-card-bg border border-border-panel rounded-card overflow-hidden">
                    {searching && (
                        <div className="px-3 py-2 text-xs text-ink-muted">
                            Searching…
                        </div>
                    )}
                    {!searching && results.length === 0 && (
                        <div className="px-3 py-2 text-xs text-ink-muted">
                            No places found
                        </div>
                    )}
                    {!searching &&
                        results.map((place) => (
                            <button
                                key={place.id}
                                type="button"
                                onClick={(): void => handlePick(place)}
                                className="w-full text-left px-3 py-2 text-xs text-ink
                                    hover:bg-sidebar cursor-pointer block"
                            >
                                {place.label}
                            </button>
                        ))}
                </div>
            )}
        </div>
    )
}

export default PlaceSearch
