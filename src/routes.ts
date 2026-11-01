export default {
    index: '/',
    // Every base is a map, so there is one canonical path. `/base/:id` and the
    // pre-rename `/board/:id` 301 here from public/_redirects.
    map: '/map/:id',
    marketing: '/home',
    support: '/support',
    privacy: '/privacy',
    useCases: '/use-cases',
    useCase: '/use-cases/:slug',
}

export const useCasePath = (slug: string): string => `/use-cases/${slug}`
