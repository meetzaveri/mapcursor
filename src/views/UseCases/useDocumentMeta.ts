import { useEffect } from 'react'

export function useDocumentMeta(title: string, description: string): void {
    useEffect(() => {
        const prevTitle = document.title
        document.title = title

        let meta = document.querySelector<HTMLMetaElement>(
            'meta[name="description"]'
        )
        const createdMeta = !meta
        if (!meta) {
            meta = document.createElement('meta')
            meta.name = 'description'
            document.head.appendChild(meta)
        }
        const prevDescription = meta.content
        meta.content = description

        return (): void => {
            document.title = prevTitle
            if (createdMeta) {
                meta?.remove()
            } else if (meta) {
                meta.content = prevDescription
            }
        }
    }, [title, description])
}
