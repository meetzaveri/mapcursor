import { GROUP_COMPONENT } from '../constants/misc'
import type { ComponentStore } from '../types/base'

export const PERFORMANCE_WARNING_THRESHOLD = 2000

export const countBaseElements = (store: ComponentStore): number =>
    Object.values(store).filter(
        (v) => v?.componentType !== GROUP_COMPONENT
    ).length
