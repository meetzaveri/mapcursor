import { useId, useState } from 'react'
import type { ReactElement } from 'react'
import MetaValueField, { draftFor } from './metaValueField'
import type { MetaDraft } from './metaValueField'
import { META_INPUT_CLASS } from './metaValueField'
import { META_IMAGE_SHARED_ERROR } from '../../hooks/useMetaProperties'
import type {
    MetaPropertyChoice,
    MetaWriteResult,
} from '../../hooks/useMetaProperties'
import {
    META_PROPERTY_TYPE_LABELS,
    META_PROPERTY_TYPES,
} from '../../types/metaProperty'
import type { MetaProperty, MetaPropertyType } from '../../types/metaProperty'

type Choice = { kind: 'existing'; property: MetaProperty } | { kind: 'new' }

interface MetaPropertyWizardProps {
    /** The map's properties not yet on this object: offered for reuse. */
    available: readonly MetaProperty[]
    isShared: boolean
    onCancel: () => void
    /** Checks a new property's name (unique on the map, not blank). */
    validateNewName: (name: string) => MetaWriteResult<{ name: string }>
    /**
     * Create (if new) and attach the property with its value: one undo step.
     * Resolves to an error message, or null once stored.
     */
    onSave: (choice: MetaPropertyChoice, draft: MetaDraft) => Promise<string | null>
}

/**
 * "Add property": choose an existing property of the map or define a new one,
 * then fill in its value. Back returns a step, Cancel returns to the list.
 *
 * A new definition is created only on Save (together with its value, as one
 * undo step), so going Back or cancelling never leaves an empty property
 * behind on the map. Its name is validated on Next, so a clash shows up
 * before the value step.
 */
export default function MetaPropertyWizard({
    available,
    isShared,
    onCancel,
    validateNewName,
    onSave,
}: MetaPropertyWizardProps): ReactElement {
    const [step, setStep] = useState<'choose' | 'value'>('choose')
    const [choice, setChoice] = useState<Choice | null>(
        available.length === 0 ? { kind: 'new' } : null
    )
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState<MetaPropertyType>('text')
    const [draft, setDraft] = useState<MetaDraft>('')
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const typeSelectId = useId()

    const valueType: MetaPropertyType =
        choice?.kind === 'existing' ? choice.property.type : newType
    const valueName =
        choice?.kind === 'existing' ? choice.property.name : newName.trim()

    const next = (): void => {
        if (!choice) {
            setError('Pick a property, or create a new one.')
            return
        }
        if (choice.kind === 'new') {
            const named = validateNewName(newName)
            if (!named.ok) {
                setError(named.error)
                return
            }
        }
        setError(null)
        setDraft(draftFor(valueType, null))
        setStep('value')
    }

    const save = async (): Promise<void> => {
        if (!choice) return
        setSaving(true)
        setError(null)
        const err = await onSave(
            choice.kind === 'existing'
                ? { existing: choice.property }
                : { create: { name: newName, type: newType } },
            draft
        )
        setSaving(false)
        if (err) setError(err)
    }

    const chipClass = (active: boolean, disabled = false): string =>
        `h-7 px-2 text-xs rounded-md border transition-colors ${
            disabled
                ? 'border-border-card text-ink-muted opacity-50 cursor-not-allowed'
                : active
                  ? 'border-accent bg-accent/10 text-accent-dark'
                  : 'border-border-card text-ink-mid hover:bg-sidebar'
        }`

    if (step === 'value') {
        return (
            <div className="p-3 text-left space-y-3">
                <div>
                    <div className="text-[11px] text-ink-muted">Step 2 of 2</div>
                    <div className="text-xs font-semibold text-ink truncate">
                        {valueName}
                        <span className="font-normal text-ink-muted">
                            {' '}
                            · {META_PROPERTY_TYPE_LABELS[valueType]}
                        </span>
                    </div>
                </div>
                <MetaValueField
                    type={valueType}
                    draft={draft}
                    onChange={setDraft}
                    onSubmit={(): void => void save()}
                    onCancel={onCancel}
                    autoFocus
                    disabled={saving}
                />
                {error && <div className="text-[11px] text-red-500">{error}</div>}
                <div className="flex justify-between gap-2">
                    <button
                        type="button"
                        onClick={(): void => {
                            setError(null)
                            setStep('choose')
                        }}
                        disabled={saving}
                        className="h-7 px-2.5 text-xs rounded-md text-ink-mid hover:bg-sidebar"
                    >
                        ← Back
                    </button>
                    <button
                        type="button"
                        onClick={(): void => void save()}
                        disabled={saving}
                        className="h-7 px-3 text-xs rounded-md bg-accent text-white
                            hover:shadow-lg disabled:opacity-60 transition-shadow"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-3 text-left space-y-3">
            <div className="text-[11px] text-ink-muted">Step 1 of 2</div>

            {available.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-ink mb-1.5">
                        Use a property from this map
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {available.map((p) => {
                            const blocked = isShared && p.type === 'image'
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    disabled={blocked}
                                    title={blocked ? META_IMAGE_SHARED_ERROR : undefined}
                                    onClick={(): void => {
                                        setError(null)
                                        setChoice({ kind: 'existing', property: p })
                                    }}
                                    className={chipClass(
                                        choice?.kind === 'existing' &&
                                            choice.property.id === p.id,
                                        blocked
                                    )}
                                >
                                    {p.name}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            <div>
                <button
                    type="button"
                    onClick={(): void => {
                        setError(null)
                        setChoice({ kind: 'new' })
                    }}
                    className={`text-xs font-semibold ${
                        choice?.kind === 'new' ? 'text-ink' : 'text-accent-dark'
                    }`}
                >
                    {available.length > 0
                        ? '+ Or create a new property'
                        : 'Create a property'}
                </button>
                {choice?.kind === 'new' && (
                    <div className="mt-2 space-y-2">
                        <input
                            value={newName}
                            onChange={(e): void => setNewName(e.target.value)}
                            onKeyDown={(e): void => {
                                if (e.key === 'Enter') next()
                                if (e.key === 'Escape') onCancel()
                            }}
                            placeholder="Name, e.g. Opening hours"
                            aria-label="Property name"
                            autoFocus
                            className={`${META_INPUT_CLASS} h-8`}
                        />
                        {/* A native select, not common/dropdown: this panel
                            scrolls (overflow-y-auto), and that dropdown's
                            absolutely positioned list would be clipped by it. */}
                        <div className="space-y-1">
                            <label
                                htmlFor={typeSelectId}
                                className="block text-[11px] font-medium text-ink-mid"
                            >
                                Select Type
                            </label>
                            <select
                                id={typeSelectId}
                                value={newType}
                                onChange={(e): void =>
                                    setNewType(e.target.value as MetaPropertyType)
                                }
                                onKeyDown={(e): void => {
                                    if (e.key === 'Escape') onCancel()
                                }}
                                className={`${META_INPUT_CLASS} h-8 cursor-pointer`}
                            >
                                {META_PROPERTY_TYPES.map((type) => (
                                    <option
                                        key={type}
                                        value={type}
                                        disabled={isShared && type === 'image'}
                                    >
                                        {META_PROPERTY_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isShared && (
                            <div className="text-[11px] text-ink-muted">
                                {META_IMAGE_SHARED_ERROR}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && <div className="text-[11px] text-red-500">{error}</div>}
            <div className="flex justify-between gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-7 px-2.5 text-xs rounded-md text-ink-mid hover:bg-sidebar"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={next}
                    className="h-7 px-3 text-xs rounded-md bg-accent text-white
                        hover:shadow-lg transition-shadow"
                >
                    Next →
                </button>
            </div>
        </div>
    )
}
