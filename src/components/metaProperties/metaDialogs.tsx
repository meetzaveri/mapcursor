import { useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import Modal from '../common/modal'
import Button from '../common/button'
import { META_PANEL_DIALOG_ATTR } from '../../utils/canvasChrome'
import { META_INPUT_CLASS } from './metaValueField'
import { META_IMAGE_SHARED_ERROR } from '../../hooks/useMetaProperties'
import type { TypeChangePlan } from '../../utils/metaPropertyStore'
import {
    META_PROPERTY_TYPE_LABELS,
    META_PROPERTY_TYPES,
} from '../../types/metaProperty'
import type { MetaProperty, MetaPropertyType } from '../../types/metaProperty'

function PanelDialog({
    open,
    onClose,
    children,
    width = 360,
}: {
    open: boolean
    onClose: () => void
    children: ReactNode
    width?: number
}): ReactElement {
    return (
        <Modal open={open} onClose={onClose} locked={false}>
            <div
                {...{ [META_PANEL_DIALOG_ATTR]: '' }}
                className="text-left"
                style={{ width: `min(${width}px, calc(100vw - 72px))` }}
            >
                {children}
            </div>
        </Modal>
    )
}

export function RenamePropertyDialog({
    property,
    onClose,
    onRename,
}: {
    property: MetaProperty | null
    onClose: () => void
    onRename: (name: string) => Promise<string | null>
}): ReactElement {
    const [name, setName] = useState('')
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        setName(property?.name ?? '')
        setError(null)
    }, [property])

    const submit = async (): Promise<void> => {
        const err = await onRename(name)
        if (err) setError(err)
        else onClose()
    }

    return (
        <PanelDialog open={!!property} onClose={onClose}>
            <h2 className="text-base font-semibold mb-1">Rename property</h2>
            <p className="text-xs text-ink-muted mb-3">
                Renames it everywhere on this map.
            </p>
            <input
                value={name}
                onChange={(e): void => setName(e.target.value)}
                onKeyDown={(e): void => {
                    if (e.key === 'Enter') void submit()
                }}
                autoFocus
                aria-label="Property name"
                className={`${META_INPUT_CLASS} h-9 text-sm`}
            />
            {error && <div className="mt-1 text-[11px] text-red-500">{error}</div>}
            <div className="flex justify-end gap-2 mt-4">
                <Button intent="secondary" size="medium" label="Cancel" onClick={onClose} />
                <Button
                    intent="primary"
                    size="medium"
                    label="Rename"
                    onClick={(): void => void submit()}
                />
            </div>
        </PanelDialog>
    )
}

export function DeletePropertyDialog({
    property,
    usageCount,
    onClose,
    onDelete,
}: {
    property: MetaProperty | null
    usageCount: number | null
    onClose: () => void
    onDelete: () => void
}): ReactElement {
    const usage =
        usageCount === null
            ? 'It will be removed from every object that has it.'
            : usageCount === 1
              ? 'It will be removed from the 1 object that has it.'
              : `It will be removed from the ${usageCount} objects that have it.`
    return (
        <PanelDialog open={!!property} onClose={onClose}>
            <h2 className="text-base font-semibold mb-2">
                Delete “{property?.name}” from this map?
            </h2>
            <p className="text-sm text-ink-mid mb-4">
                {usage} You can undo this with Ctrl/Cmd+Z.
            </p>
            <div className="flex justify-end gap-2">
                <Button intent="secondary" size="medium" label="Cancel" onClick={onClose} />
                <Button
                    intent="primary"
                    size="medium"
                    label="Delete property"
                    onClick={(): void => {
                        onDelete()
                        onClose()
                    }}
                />
            </div>
        </PanelDialog>
    )
}

export function ImageLightbox({
    src,
    onClose,
}: {
    src: string | null
    onClose: () => void
}): ReactElement {
    return (
        <PanelDialog open={!!src} onClose={onClose} width={720}>
            {src && (
                <img
                    src={src}
                    alt=""
                    className="block max-w-full max-h-[75vh] mx-auto rounded-md"
                />
            )}
        </PanelDialog>
    )
}

export function ChangeTypeDialog({
    property,
    isShared,
    onClose,
    preview,
    onChange,
}: {
    property: MetaProperty | null
    isShared: boolean
    onClose: () => void
    preview: (to: MetaPropertyType) => Promise<TypeChangePlan | null>
    onChange: (to: MetaPropertyType) => Promise<string | null>
}): ReactElement {
    const [to, setTo] = useState<MetaPropertyType | null>(null)
    const [plan, setPlan] = useState<TypeChangePlan | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        setTo(null)
        setPlan(null)
        setError(null)
    }, [property])

    useEffect(() => {
        if (!to) return
        let cancelled = false
        setPlan(null)
        preview(to)
            .then((p) => {
                if (!cancelled) setPlan(p)
            })
            .catch(() => {
                if (!cancelled) setError("Couldn't check this property's values.")
            })
        return (): void => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [to])

    const submit = async (): Promise<void> => {
        if (!to) return
        setBusy(true)
        const err = await onChange(to)
        setBusy(false)
        if (err) setError(err)
        else onClose()
    }

    const outcome = ((): string => {
        if (!plan) return 'Checking its values…'
        const { converted, cleared } = plan
        if (converted.length + cleared.length === 0) {
            return 'No object has a value for it yet.'
        }
        const n = (k: number): string => `${k} value${k === 1 ? '' : 's'}`
        const parts = []
        if (converted.length) parts.push(`${n(converted.length)} will be converted`)
        if (cleared.length) parts.push(`${n(cleared.length)} will be cleared`)
        return `${parts.join(' and ')}.`
    })()

    return (
        <PanelDialog open={!!property} onClose={onClose}>
            <h2 className="text-base font-semibold mb-1">
                Change type of “{property?.name}”
            </h2>
            <p className="text-xs text-ink-muted mb-3">
                Values that fit the new type are converted; the rest are
                cleared. You can undo this with Ctrl/Cmd+Z.
            </p>
            <div role="radiogroup" aria-label="New type" className="flex flex-wrap gap-1.5">
                {META_PROPERTY_TYPES.map((type) => {
                    const current = property?.type === type
                    const blocked = current || (isShared && type === 'image')
                    return (
                        <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={to === type}
                            disabled={blocked}
                            title={
                                current
                                    ? 'Current type'
                                    : blocked
                                      ? META_IMAGE_SHARED_ERROR
                                      : undefined
                            }
                            onClick={(): void => {
                                setError(null)
                                setTo(type)
                            }}
                            className={`h-7 px-2 text-xs rounded-md border transition-colors ${
                                blocked
                                    ? 'border-border-card text-ink-muted opacity-50 cursor-not-allowed'
                                    : to === type
                                      ? 'border-accent bg-accent/10 text-accent-dark'
                                      : 'border-border-card text-ink-mid hover:bg-sidebar'
                            }`}
                        >
                            {META_PROPERTY_TYPE_LABELS[type]}
                            {current ? ' (current)' : ''}
                        </button>
                    )
                })}
            </div>
            {to && <p className="mt-3 text-sm text-ink-mid">{outcome}</p>}
            {error && <div className="mt-1 text-[11px] text-red-500">{error}</div>}
            <div className="flex justify-end gap-2 mt-4">
                <Button intent="secondary" size="medium" label="Cancel" onClick={onClose} />
                <Button
                    intent="primary"
                    size="medium"
                    label="Change type"
                    disabled={!to || !plan || busy}
                    loading={busy}
                    onClick={(): void => void submit()}
                />
            </div>
        </PanelDialog>
    )
}
