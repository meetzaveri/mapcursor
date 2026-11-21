import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import {
    TEXT_EDIT_CANCEL_EVENT,
    TEXT_EDIT_COMMIT_EVENT,
    TEXT_EDIT_END_EVENT,
    TEXT_EDIT_START_EVENT,
} from '../../constants/misc'
import OkIcon from '../../assets/ok.svg?react'
import CloseIcon from '../../assets/close.svg?react'
import { CHROME_ENTER_FROM_BOTTOM } from '../common/chromeEnter'
import PencilIcon from '../../wireframeAssets/pencil.svg?react'

const EDITABLE_TEXT_TYPES: ReadonlySet<string> = new Set([
    'text',
    'point',
    'circle',
])

interface MobileTextControlsProps {
    drawInProgress: boolean
}

const MobileTextControls = ({
    drawInProgress,
}: MobileTextControlsProps): ReactElement | null => {
    const { selectedComponent, isRubberMode, isPencilMode } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        const onStart = (e: Event): void => {
            const id = (e as CustomEvent<{ id?: string }>).detail?.id
            setEditingId(id ?? null)
        }
        const onEnd = (): void => setEditingId(null)
        window.addEventListener(TEXT_EDIT_START_EVENT, onStart)
        window.addEventListener(TEXT_EDIT_END_EVENT, onEnd)
        return (): void => {
            window.removeEventListener(TEXT_EDIT_START_EVENT, onStart)
            window.removeEventListener(TEXT_EDIT_END_EVENT, onEnd)
        }
    }, [])

    if (!isMobile) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selected = selectedComponent as any
    const selectedId: string | undefined =
        selected?.group?.data?.elementData?.id
    const selectedType: string | undefined =
        selected?.group?.data?.elementData?.componentType

    const keepFocus = (e: { preventDefault: () => void }): void =>
        e.preventDefault()

    const request = (eventName: string): void => {
        window.dispatchEvent(
            new CustomEvent(eventName, { detail: { id: editingId } })
        )
    }

    if (editingId) {
        return (
            <div
                style={{
                    position: 'fixed',
                    bottom: '64px',
                    right: '10px',
                    zIndex: 20,
                }}
                className={`flex flex-col gap-2 ${CHROME_ENTER_FROM_BOTTOM}`}
            >
                <button
                    type="button"
                    title="Done editing"
                    aria-label="Done editing"
                    onPointerDown={keepFocus}
                    onMouseDown={keepFocus}
                    onClick={(): void => request(TEXT_EDIT_COMMIT_EVENT)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-greens-g400 text-white shadow-md transition-colors duration-150"
                >
                    <OkIcon className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    title="Discard changes"
                    aria-label="Discard text changes"
                    onPointerDown={keepFocus}
                    onMouseDown={keepFocus}
                    onClick={(): void => request(TEXT_EDIT_CANCEL_EVENT)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-reds-r400 text-white shadow-md transition-colors duration-150"
                >
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        )
    }

    if (drawInProgress || isRubberMode || isPencilMode) return null
    if (!selectedId || !selectedType) return null
    if (!EDITABLE_TEXT_TYPES.has(selectedType)) return null

    return (
        <button
            type="button"
            title="Edit text"
            aria-label="Edit text"
            onClick={(): void => {
                window.dispatchEvent(
                    new CustomEvent('triggerTextInput', {
                        detail: { elementId: selectedId },
                    })
                )
            }}
            style={{
                position: 'fixed',
                bottom: '112px',
                right: '10px',
                zIndex: 20,
            }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center
                bg-card-bg text-ink-mid border border-border-panel shadow-md
                transition-colors duration-150 ${CHROME_ENTER_FROM_BOTTOM}`}
        >
            <PencilIcon
                width={18}
                height={18}
                stroke="currentColor"
                color="currentColor"
                aria-hidden="true"
            />
        </button>
    )
}

export default MobileTextControls
