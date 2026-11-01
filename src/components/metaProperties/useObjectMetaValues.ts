import { useEffect, useState } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'
import type { MetaValue } from '../../types/metaProperty'

export interface ObjectMetaValues {
    values: MetaValue[]
    loading: boolean
    error: string | null
}

/**
 * One object's meta values. Fetched when the object is selected (on a shared
 * base that is a network round trip, per the spec) and again after every
 * write anywhere (`valuesVersion`), so the panel never shows a stale cell.
 * A response for an object that is no longer selected is dropped.
 */
export function useObjectMetaValues(objectId: string | null): ObjectMetaValues {
    const { meta } = useBaseContext()
    const [state, setState] = useState<ObjectMetaValues>({
        values: [],
        loading: false,
        error: null,
    })

    useEffect(() => {
        if (!objectId) {
            setState({ values: [], loading: false, error: null })
            return
        }
        let cancelled = false
        setState((s) => ({ ...s, loading: true, error: null }))
        meta.loadValues(objectId)
            .then((values) => {
                if (!cancelled) setState({ values, loading: false, error: null })
            })
            .catch(() => {
                if (!cancelled) {
                    setState({
                        values: [],
                        loading: false,
                        error: "Couldn't load this object's properties.",
                    })
                }
            })
        return (): void => {
            cancelled = true
        }
        // `meta` is rebuilt each render; valuesVersion is the change signal.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objectId, meta.valuesVersion, meta.metaProperties])

    return state
}
