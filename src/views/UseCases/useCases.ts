import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import roadTripImage from '../../assets/road-trip-usecase.png'

export interface UseCase {
    /** URL segment: /use-cases/<slug>. Keep public/sitemap.xml in sync. */
    slug: string
    title: string
    /** One-line teaser shown on the listing page. */
    summary: string
    /** Document title for the detail route. */
    metaTitle: string
    /** Meta description for the detail route. */
    metaDescription: string
    heroImage: string
    heroAlt: string
    Content: LazyExoticComponent<ComponentType>
}

export const USE_CASES: readonly UseCase[] = [
    {
        slug: 'road-trip',
        title: 'Road trip',
        summary:
            'Draw your route on a real map and pin your trip photos to every stop along the way.',
        metaTitle: 'Road trip map with photos | Mapcursor',
        metaDescription:
            'Draw your road trip route on a map, drop your photos at each stop and download it as one picture to share. No sign-up.',
        heroImage: roadTripImage,
        heroAlt:
            'A California road trip drawn in Mapcursor, from San Francisco to Monterey, with a photo at each stop',
        Content: lazy(() => import('./content/roadTrip')),
    },
]

export function findUseCase(slug: string | undefined): UseCase | undefined {
    return USE_CASES.find((useCase) => useCase.slug === slug)
}
