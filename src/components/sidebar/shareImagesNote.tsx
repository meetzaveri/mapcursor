import type { ReactElement } from 'react'

// Shown first in the share dialog when the canvas holds anything image-based,
// which stays on this device for now (shared canvases can't host images yet):
//   - image elements placed on the map, and
//   - `image` meta properties: on share the property itself is left behind
//     along with its photos (see persistToBase in hooks/useMetaProperties.ts),
//     because a shared canvas couldn't fill it in.
// Ported from craftbase's shareLinkPopup and widened for meta properties.

interface ShareImagesNoteProps {
    hasImageElements: boolean
    /** Names of the canvas's `image` meta properties. */
    imagePropertyNames: readonly string[]
}

/** “A”, “A” and “B”, “A”, “B” and “C”. */
export function quotedList(names: readonly string[]): string {
    const quoted = names.map((n) => `“${n}”`)
    if (quoted.length <= 1) return quoted.join('')
    return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`
}

const ShareImagesNote = ({
    hasImageElements,
    imagePropertyNames,
}: ShareImagesNoteProps): ReactElement | null => {
    const hasImageProperties = imagePropertyNames.length > 0
    if (!hasImageElements && !hasImageProperties) return null
    const many = imagePropertyNames.length > 1

    return (
        <div
            role="note"
            className="mb-4 rounded-md border border-border-card border-l-4 border-l-accent-dark bg-sidebar px-4 py-3"
        >
            <p className="text-sm font-semibold text-ink">
                <span className="font-display text-accent-dark">
                    Heads up:
                </span>{' '}
                your images will stay on this device.
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-mid list-disc pl-4">
                {hasImageElements && (
                    <li>
                        Images you’ve placed on the map won’t appear on the
                        shared canvas yet.
                    </li>
                )}
                {hasImageProperties && (
                    <li>
                        Photos you’ve added to places with the{' '}
                        {quotedList(imagePropertyNames)}{' '}
                        {many ? 'properties' : 'property'} won’t be shared, and{' '}
                        {many ? 'those properties' : 'that property'} won’t
                        show up on the shared canvas either. Everything else
                        you’ve added, like text, numbers, dates and emails,
                        comes along.
                    </li>
                )}
            </ul>
            <p className="mt-2 text-sm text-ink-mid">
                Nothing is deleted. Your images stay right here on your canvas;
                shared canvases just can’t hold images yet.
            </p>
        </div>
    )
}

export default ShareImagesNote
