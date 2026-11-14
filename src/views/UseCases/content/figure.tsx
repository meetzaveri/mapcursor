import type { ReactElement } from 'react'

const Figure = ({
    src,
    alt,
    caption,
}: {
    src: string
    alt: string
    caption: string
}): ReactElement => (
    <figure className="my-6">
        <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full h-auto rounded-card border border-border-card shadow-card"
        />
        <figcaption className="text-xs text-ink-muted mt-2">
            {caption}
        </figcaption>
    </figure>
)

export default Figure
