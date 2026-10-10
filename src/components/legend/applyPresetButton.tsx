import type { ReactElement } from 'react'

interface ApplyPresetButtonProps {
    presetName: string
    /** The selection already wears this preset — nothing to apply. */
    isApplied: boolean
    onApply: () => void
}

/**
 * A legend row's "Apply" action, shown only when the selected mark is the
 * preset's type. Once applied it stays put as a disabled "Applied" rather than
 * vanishing, so the row confirms the click instead of just losing a button.
 */
export default function ApplyPresetButton({
    presetName,
    isApplied,
    onApply,
}: ApplyPresetButtonProps): ReactElement {
    return (
        <button
            type="button"
            aria-label={
                isApplied
                    ? `${presetName} is applied to the selection`
                    : `Apply ${presetName} to the selection`
            }
            disabled={isApplied}
            onClick={onApply}
            className={`h-6 px-2 rounded text-[11px] shrink-0 transition-colors duration-150 ${
                isApplied
                    ? 'text-ink-muted cursor-default'
                    : 'text-white bg-accent hover:bg-accent-dark cursor-pointer'
            }`}
        >
            {isApplied ? 'Applied' : 'Apply'}
        </button>
    )
}
