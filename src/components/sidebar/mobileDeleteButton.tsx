import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { dispatchDeleteKey } from '../../utils/deleteKey'

const TrashIcon = (): ReactElement => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
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

interface MobileDeleteButtonProps {
    drawInProgress: boolean
}

const MobileDeleteButton = ({
    drawInProgress,
}: MobileDeleteButtonProps): ReactElement | null => {
    const {
        selectedComponent,
        selectedGroup,
        isRubberMode,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        deleteComponentFromLocalStore,
        stateRefForComponentStore,
        twoJSInstance,
    } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    if (!isMobile) return null
    if (drawInProgress) return null
    if (isRubberMode || isPencilMode || isArrowDrawMode || isTextDrawMode) {
        return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group = selectedGroup as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const single = selectedComponent as any
    if (!group && !single) return null

    const nodeId: string | undefined = group?.id ?? single?.group?.id

    const singleId: string | undefined = group
        ? undefined
        : single?.group?.data?.elementData?.id

    const removeFromScene = (id: string): void => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const two = twoJSInstance as any
        if (!two?.scene) return
        const group = Array.from(two.scene.children).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c?.elementData?.id === id
        )
        if (!group) return
        try {
            two.remove([group])
            two.update()
        } catch {
            two.scene.subtractions.length = 0
            two.scene._flagSubtractions = false
        }
    }

    const handleDelete = (): void => {
        const focused = document.activeElement as HTMLElement | null
        const tag = focused?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') focused?.blur()

        const node = nodeId ? document.getElementById(nodeId) : null
        dispatchDeleteKey(node)

        if (!singleId) return
        requestAnimationFrame(() => {
            if (!stateRefForComponentStore?.current?.[singleId]) return
            deleteComponentFromLocalStore?.(singleId)
            removeFromScene(singleId)
            window.dispatchEvent(new CustomEvent('clearSelector', {}))
        })
    }

    return (
        <button
            type="button"
            title="Delete selection"
            aria-label="Delete selection"
            onClick={handleDelete}
            style={{
                position: 'fixed',
                bottom: '64px',
                right: '10px',
                zIndex: 20,
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center
                bg-reds-r400 text-white shadow-md transition-colors duration-150"
        >
            <TrashIcon />
        </button>
    )
}

export default MobileDeleteButton
