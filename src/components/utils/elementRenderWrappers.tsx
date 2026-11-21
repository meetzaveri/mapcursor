import { useEffect, useState } from 'react'
import type { ComponentType, ReactElement } from 'react'
import Spinner from '../common/spinner'
import type { ComponentRecord, ComponentStore } from '../../types/base'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any

interface WrapperData {
    id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    twoJSInstance: any
    [key: string]: unknown
}

export const ElementRenderWrapper = (
    ElementToRender: ComponentType<ElementProps>,
    data: WrapperData,
    deleteComponentFromLocalStore: (id: string) => void,
    componentStore: ComponentStore
): (() => ReactElement) => {
    const RenderElement = (): ReactElement => {
        const [componentData, setComponentData] =
            useState<ComponentRecord | null>(null)

        useEffect(() => {
            const match = componentStore[data.id]
            if (match) setComponentData(match)
        }, [])

        if (componentData === null) {
            return <></>
        }

        const handleDeleteComponent = (): void => {
            deleteComponentFromLocalStore(data.id)
        }

        return data.twoJSInstance ? (
            <ElementToRender
                handleDeleteComponent={handleDeleteComponent}
                {...data}
                {...componentData}
            />
        ) : (
            <Spinner />
        )
    }
    return RenderElement
}

export const GroupRenderWrapper = (
    ElementToRender: ComponentType<ElementProps>,
    data: WrapperData
): (() => ReactElement) => {
    const RenderGroup = (): ReactElement => {
        return data.twoJSInstance ? <ElementToRender {...data} /> : <Spinner />
    }
    return RenderGroup
}
