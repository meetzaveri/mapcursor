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

/**
 * The object the meta properties panel is about: exactly one selected element
 * of a type that takes meta properties (point, route, area, radius map,
 * geo-text). Null for everything else: nothing selected, a multi-selection,
 * pencil, image, or a tool mode.
 *
 * Reads `selectedComponent` the same way the properties toolbar does
 * (`group.data.elementData`), so the panel and the toolbar agree on what is
 * selected.
 */
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
