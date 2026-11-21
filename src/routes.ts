export default {
    index: '/',
    map: '/map/:id',
    marketing: '/home',
    support: '/support',
    privacy: '/privacy',
    useCases: '/use-cases',
    useCase: '/use-cases/:slug',
}

export const useCasePath = (slug: string): string => `/use-cases/${slug}`
