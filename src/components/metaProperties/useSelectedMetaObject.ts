import { useBaseContext } from '../../views/Base/baseContext'
import { isMetaObjectType } from '../../types/metaProperty'
import type { MetaObjectType } from '../../types/metaProperty'

export interface SelectedMetaObject {
    objectId: string
    objectType: MetaObjectType
}

export const META_OBJECT_LABELS: Record<MetaObjectType, string> = {
    point: 'Point',
    route: 'Route',
    area: 'Area',
    circle: 'Radius Map',
    text: 'Text',
}

export function useSelectedMetaObject(): SelectedMetaObject | null {
    const { selectedComponent, selectedGroup } = useBaseContext()
    if (selectedGroup) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementData = (selectedComponent as any)?.group?.data?.elementData
    const objectType = elementData?.componentType
    const objectId = elementData?.id
    if (typeof objectId !== 'string' || !isMetaObjectType(objectType)) {
        return null
    }
    return { objectId, objectType }
}
