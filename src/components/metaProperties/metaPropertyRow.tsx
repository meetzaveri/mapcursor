import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import Tooltip from '../common/tooltip'
import MetaValueView from './metaValueView'
import MetaValueField, { draftFor } from './metaValueField'
import type { MetaDraft } from './metaValueField'
import type { MetaProperty, MetaValue } from '../../types/metaProperty'

interface MetaPropertyRowProps {
    property: MetaProperty
    value: MetaValue
    objectNoun: string
    onSave: (draft: MetaDraft) => Promise<string | null>
    onRemove: () => void
    onRename: () => void
    onChangeType: () => void
    onDelete: () => void
    onOpenImage: (src: string) => void
}

function IconButton({
    label,
    onClick,
    children,
}: {
    label: string
    onClick: () => void
    children: ReactNode
}): ReactElement {
    return (
        <Tooltip label={label} placement="left">
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className="w-6 h-6 flex items-center justify-center rounded
                    text-ink-muted hover:bg-sidebar hover:text-ink"
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    {children}
                </svg>
            </button>
        </Tooltip>
    )
}

export default function MetaPropertyRow({
    property,
    value,
    objectNoun,
    onSave,
    onRemove,
    onRename,
    onChangeType,
    onDelete,
    onOpenImage,
}: MetaPropertyRowProps): ReactElement {
    const [draft, setDraft] = useState<MetaDraft | undefined>(undefined)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const editing = draft !== undefined

    const startEdit = (): void => {
        setError(null)
        setDraft(draftFor(property.type, value.value))
    }
    const cancel = (): void => {
        setDraft(undefined)
        setError(null)
    }
    const save = async (): Promise<void> => {
        if (draft === undefined) return
        setSaving(true)
        const err = await onSave(draft)
        setSaving(false)
        if (err) setError(err)
        else cancel()
    }

    return (
        <li
            data-meta-property-id={property.id}
            className="group px-3 py-2 text-left border-b border-border-panel last:border-b-0"
        >
            <div className="flex items-center justify-between gap-2 min-h-6">
                <div className="min-w-0 text-[11px] font-medium text-ink-muted truncate">
                    {property.name}
                </div>
                {!editing && (
                    <div
                        className="flex items-center shrink-0 opacity-0
                            group-hover:opacity-100 focus-within:opacity-100
                            transition-opacity duration-150"
                    >
                        <IconButton label="Edit value" onClick={startEdit}>
                            <path d="M11.5 2.5l2 2L6 12l-3 1 1-3z" />
                        </IconButton>
                        <IconButton label="Rename property" onClick={onRename}>
                            <path d="M2.5 8.5V3.5a1 1 0 011-1h5l5 5-6 6z" />
                            <circle cx="6" cy="6" r="1" />
                        </IconButton>
                        <IconButton label="Change type" onClick={onChangeType}>
                            <path d="M3 5h9M9.5 2.5L12 5 9.5 7.5M13 11H4M6.5 8.5L4 11l2.5 2.5" />
                        </IconButton>
                        <IconButton
                            label={`Remove from this ${objectNoun}`}
                            onClick={onRemove}
                        >
                            <path d="M4 4l8 8M12 4l-8 8" />
                        </IconButton>
                        <IconButton
                            label="Delete property from map"
                            onClick={onDelete}
                        >
                            <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9h5l.5-9" />
                        </IconButton>
                    </div>
                )}
            </div>

            {editing ? (
                <div className="mt-1.5 space-y-2">
                    <MetaValueField
                        type={property.type}
                        draft={draft}
                        onChange={setDraft}
                        onSubmit={(): void => void save()}
                        onCancel={cancel}
                        autoFocus
                        disabled={saving}
                    />
                    {error && <div className="text-[11px] text-red-500">{error}</div>}
                    <div className="flex justify-end gap-1.5">
                        <button
                            type="button"
                            onClick={cancel}
                            className="h-7 px-2.5 text-xs rounded-md text-ink-mid hover:bg-sidebar"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={(): void => void save()}
                            disabled={saving}
                            className="h-7 px-2.5 text-xs rounded-md bg-accent text-white
                                hover:shadow-lg disabled:opacity-60 transition-shadow"
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            ) : property.type === 'image' ? (
                <div className="mt-1">
                    <MetaValueView
                        type="image"
                        value={value.value}
                        onOpenImage={onOpenImage}
                    />
                </div>
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={startEdit}
                    onKeyDown={(e): void => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            startEdit()
                        }
                    }}
                    aria-label={`Edit ${property.name}`}
                    className="mt-0.5 -mx-1 px-1 py-0.5 rounded hover:bg-sidebar cursor-text
                        focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                    <MetaValueView type={property.type} value={value.value} />
                </div>
            )}
        </li>
    )
}
