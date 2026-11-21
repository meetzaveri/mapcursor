import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import roadTripImage from '../../assets/road-trip-usecase.png'
import cityCorridorsImage from '../../assets/route-corridor-use-case.png'

export interface UseCase {
    slug: string
    title: string
    summary: string
    metaTitle: string
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
    {
        slug: 'city-corridors',
        title: 'Corridors and lanes in a city',
        summary:
            'Map the corridors and lanes of a metro city like Mumbai with routes and a legend that explains each line.',
        metaTitle: 'Map city corridors and lanes | Mapcursor',
        metaDescription:
            'Draw transit corridors, traffic routes and no vehicle lanes on a city map, and style each one with a legend preset. No sign-up.',
        heroImage: cityCorridorsImage,
        heroAlt:
            'Corridors in Mumbai drawn in Mapcursor: the Sealink corridor, Aqua Line 3 and Metro Lines 1 and 2, with a legend naming each route',
        Content: lazy(() => import('./content/cityCorridors')),
    },
]

export function findUseCase(slug: string | undefined): UseCase | undefined {
    return USE_CASES.find((useCase) => useCase.slug === slug)
}
