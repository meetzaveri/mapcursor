import { useEffect, useState } from 'react'
import { searchPlaces } from '../utils/placeSearch'
import type { PlaceResult } from '../utils/placeSearch'

export const PLACE_SEARCH_DEBOUNCE_MS = 450

export interface PlaceSearchApi {
    query: string
    setQuery: (value: string) => void
    results: PlaceResult[]
    searching: boolean
    reset: () => void
}

export function usePlaceSearch(enabled = true): PlaceSearchApi {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<PlaceResult[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        const trimmed = query.trim()
        if (!enabled || !trimmed) {
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
        }, PLACE_SEARCH_DEBOUNCE_MS)

        return (): void => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query, enabled])

    const reset = (): void => {
        setQuery('')
        setResults([])
        setSearching(false)
    }

    return { query, setQuery, results, searching, reset }
}
