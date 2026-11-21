import { useEffect, useState } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'
import type { MetaValue } from '../../types/metaProperty'

export interface ObjectMetaValues {
    values: MetaValue[]
    loading: boolean
    error: string | null
}

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objectId, meta.valuesVersion, meta.metaProperties])

    return state
}
