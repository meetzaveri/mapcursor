import { useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import {
    describeImageError,
    openImageFilePicker,
    storeImageFile,
} from '../../utils/imageFile'
import { isImageAssetRef } from '../../types/asset'
import type { ImageAssetRef } from '../../types/asset'
import type { MetaPropertyType } from '../../types/metaProperty'
import MetaValueView from './metaValueView'

/** What a field holds while it is being edited. */
export type MetaDraft = string | ImageAssetRef | null

/** The draft for a stored value (or an empty one). */
export function draftFor(type: MetaPropertyType, value: unknown): MetaDraft {
    if (type === 'image') return isImageAssetRef(value) ? value : null
    if (value === null || value === undefined) return ''
    return String(value)
}

// Same look as the legend wizard's fields, at the panel's compact size.
export const META_INPUT_CLASS = `w-full px-2 text-xs bg-card-bg text-ink
    border border-border-card rounded-md focus:outline-none focus:border-accent
    placeholder:text-ink-muted`

const PLACEHOLDER: Record<Exclude<MetaPropertyType, 'image'>, string> = {
    text: 'e.g. Open 9am–6pm',
    integer: 'e.g. 42',
    email: 'name@example.com',
    date: 'YYYY-MM-DD',
}

interface MetaValueFieldProps {
    type: MetaPropertyType
    draft: MetaDraft
    onChange: (draft: MetaDraft) => void
    /** Enter (Shift+Enter makes a new line in text). */
    onSubmit?: () => void
    /** Escape. */
    onCancel?: () => void
    autoFocus?: boolean
    disabled?: boolean
}

function ImagePicker({
    draft,
    onChange,
    disabled,
}: Pick<MetaValueFieldProps, 'draft' | 'onChange' | 'disabled'>): ReactElement {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const pick = async (): Promise<void> => {
        const [file] = await openImageFilePicker(false)
        if (!file) return
        setBusy(true)
        setError(null)
        try {
            // The same path as a dropped image: EXIF/GPS stripped, downscaled,
            // stored in IndexedDB. The value only keeps the reference.
            onChange(await storeImageFile(file))
        } catch (err) {
            setError(describeImageError(err))
        } finally {
            setBusy(false)
        }
    }

    const ref = isImageAssetRef(draft) ? draft : null
    return (
        <div className="space-y-2">
            {ref && <MetaValueView type="image" value={ref} />}
            <button
                type="button"
                onClick={(): void => void pick()}
                disabled={disabled || busy}
                className="w-full h-8 text-xs rounded-md border border-dashed border-border-card
                    text-ink-mid hover:bg-sidebar disabled:opacity-60 transition-colors"
            >
                {busy ? 'Preparing image…' : ref ? 'Replace image' : 'Choose an image'}
            </button>
            {error && <div className="text-[11px] text-red-500">{error}</div>}
        </div>
    )
}

/** The input for one value, per its property's type. */
export default function MetaValueField({
    type,
    draft,
    onChange,
    onSubmit,
    onCancel,
    autoFocus,
    disabled,
}: MetaValueFieldProps): ReactElement {
    if (type === 'image') {
        return <ImagePicker draft={draft} onChange={onChange} disabled={disabled} />
    }

    const text = typeof draft === 'string' ? draft : ''
    const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
        if (e.key === 'Escape') {
            e.preventDefault()
            onCancel?.()
        } else if (e.key === 'Enter' && !(type === 'text' && e.shiftKey)) {
            e.preventDefault()
            onSubmit?.()
        }
    }

    if (type === 'text') {
        return (
            <textarea
                value={text}
                onChange={(e): void => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={PLACEHOLDER.text}
                autoFocus={autoFocus}
                disabled={disabled}
                rows={2}
                className={`${META_INPUT_CLASS} py-1.5 resize-y min-h-[2rem]`}
            />
        )
    }

    return (
        <input
            type={type === 'date' ? 'date' : type === 'email' ? 'email' : 'text'}
            inputMode={type === 'integer' ? 'numeric' : undefined}
            value={text}
            onChange={(e): void => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={PLACEHOLDER[type]}
            autoFocus={autoFocus}
            disabled={disabled}
            className={`${META_INPUT_CLASS} h-8 ${type === 'integer' ? 'font-mono' : ''}`}
        />
    )
}
