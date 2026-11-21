import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import Modal from '../common/modal'
import Button from '../common/button'
import OriginIcon from '../../assets/origin.svg?react'
import SearchIcon from '../../assets/search.svg?react'
import { searchPlaces } from '../../utils/placeSearch'
import { requestCurrentLocation } from '../../utils/geolocation'
import type { GeolocationFailure } from '../../utils/geolocation'
import type { PlaceResult } from '../../utils/placeSearch'
import type { MapAnchor } from '../../baseTypes/types'

const DEBOUNCE_MS = 450

type Step = 'choose' | 'locating' | 'search'

interface MapStartLocationModalProps {
    open: boolean
    fallbackCity: string
    onPick: (anchor: MapAnchor) => void
    onSkip: () => void
    onFallbackToTimezone: () => void
}

const FAILURE_COPY: Record<GeolocationFailure, string> = {
    denied: 'No problem — location is off, so we’ve started you near',
    timeout: 'Your browser didn’t answer in time, so we’ve started you near',
    unavailable:
        'Your browser can’t share a location here, so we’ve started you near',
}

export default function MapStartLocationModal({
    open,
    fallbackCity,
    onPick,
    onSkip,
    onFallbackToTimezone,
}: MapStartLocationModalProps): ReactElement {
    const [step, setStep] = useState<Step>('choose')
    const [failure, setFailure] = useState<GeolocationFailure | null>(null)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<PlaceResult[]>([])
    const [searching, setSearching] = useState(false)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const liveRef = useRef(true)

    useEffect(() => {
        liveRef.current = open
        if (!open) {
            setStep('choose')
            setFailure(null)
            setQuery('')
        }
    }, [open])

    useEffect(() => {
        return (): void => {
            liveRef.current = false
        }
    }, [])

    useEffect(() => {
        const trimmed = query.trim()
        if (!trimmed) {
            setResults([])
            setSearching(false)
            return
        }
        setSearching(true)
        const controller = new AbortController()
        const timer = setTimeout(() => {
            void searchPlaces(trimmed, controller.signal).then((found) => {
                if (controller.signal.aborted) return
                setResults(found)
                setSearching(false)
            })
        }, DEBOUNCE_MS)
        return (): void => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query])

    useEffect(() => {
        if (!open || step !== 'search') return
        const t = setTimeout(() => inputRef.current?.focus(), 200)
        return (): void => clearTimeout(t)
    }, [open, step])

    const handleUseCurrentLocation = async (): Promise<void> => {
        setStep('locating')
        setFailure(null)
        const outcome = await requestCurrentLocation()
        if (!liveRef.current) return

        if (outcome.ok) {
            onPick(outcome.anchor)
            return
        }
        setFailure(outcome.reason)
        setStep('search')
        onFallbackToTimezone()
    }

    return (
        <Modal open={open} onClose={onSkip} locked={false}>
            <div
                className="p-2 text-left"
                style={{
                    minWidth: 'min(360px, calc(100vw - 96px))',
                    maxWidth: '420px',
                }}
            >
                <h2 className="text-lg font-semibold mb-1 text-ink">
                    Where are you mapping?
                </h2>

                {step === 'choose' && (
                    <>
                        <p className="text-sm text-ink-mid mb-4">
                            This only sets your starting view — you can move the
                            map any time.
                        </p>

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={(): void => {
                                    void handleUseCurrentLocation()
                                }}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-card
                                    border border-border-panel bg-card-bg text-left
                                    text-sm text-ink hover:border-accent cursor-pointer"
                            >
                                <OriginIcon
                                    width={20}
                                    height={20}
                                    strokeWidth={1.6}
                                    color="currentColor"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                    focusable="false"
                                    className="shrink-0"
                                />
                                <span className="flex flex-col">
                                    <span className="font-medium">
                                        Use my current location
                                    </span>
                                    <span className="text-xs text-ink-muted">
                                        Your browser will ask permission first
                                    </span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={(): void => setStep('search')}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-card
                                    border border-border-panel bg-card-bg text-left
                                    text-sm text-ink hover:border-accent cursor-pointer"
                            >
                                <SearchIcon
                                    width={20}
                                    height={20}
                                    strokeWidth={1.6}
                                    color="currentColor"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                    focusable="false"
                                    className="shrink-0"
                                />
                                <span className="flex flex-col">
                                    <span className="font-medium">
                                        No, let me search
                                    </span>
                                    <span className="text-xs text-ink-muted">
                                        Pick a city, state or country
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <Button
                                intent="secondary"
                                size="medium"
                                label={`Skip, use ${fallbackCity}`}
                                onClick={onSkip}
                            />
                        </div>
                    </>
                )}

                {step === 'locating' && (
                    <div className="py-6 flex flex-col items-center gap-3 text-center">
                        <div
                            className="h-6 w-6 rounded-full border-2 border-border-panel
                                border-t-accent animate-spin"
                            aria-hidden="true"
                        />
                        <p className="text-sm text-ink-mid">
                            Waiting for your browser’s location permission…
                        </p>
                        <button
                            type="button"
                            onClick={(): void => setStep('search')}
                            className="text-xs text-ink-muted underline cursor-pointer"
                        >
                            Search for a place instead
                        </button>
                    </div>
                )}

                {step === 'search' && (
                    <>
                        {failure !== null ? (
                            <p className="text-sm text-ink-mid mb-3">
                                {FAILURE_COPY[failure]}{' '}
                                <span className="font-medium">
                                    {fallbackCity}
                                </span>
                                . Search below to start somewhere else.
                            </p>
                        ) : (
                            <p className="text-sm text-ink-mid mb-3">
                                Pick a city, state or country to start from — it
                                only sets the view, and you can move the map any
                                time. We’ve put you near{' '}
                                <span className="font-medium">
                                    {fallbackCity}
                                </span>{' '}
                                based on your timezone.
                            </p>
                        )}

                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            placeholder="e.g. Lisbon, or Kerala, or Japan"
                            aria-label="Search for a place to start from"
                            onChange={(e): void => setQuery(e.target.value)}
                            className="w-full h-9 px-3 text-sm rounded-card bg-card-bg text-ink
                                border border-border-panel outline-none
                                placeholder:text-ink-muted focus:border-accent"
                        />

                        {query.trim() !== '' && (
                            <div className="mt-1 border border-border-panel rounded-card overflow-hidden max-h-48 overflow-y-auto">
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
                                            onClick={(): void =>
                                                onPick(place.anchor)
                                            }
                                            className="w-full text-left px-3 py-2 text-xs text-ink
                                                hover:bg-sidebar cursor-pointer block"
                                        >
                                            {place.label}
                                        </button>
                                    ))}
                            </div>
                        )}

                        <div className="flex gap-2 mt-4">
                            <Button
                                intent="secondary"
                                size="medium"
                                label={`Skip, use ${fallbackCity}`}
                                onClick={onSkip}
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
