export const BASE_PATH_PREFIX = '/map/'

export function isUrlBasePath(
    pathname: string = typeof window !== 'undefined'
        ? window.location.pathname
        : ''
): boolean {
    return pathname.startsWith(BASE_PATH_PREFIX)
}

export function basePath(baseId: string): string {
    return `${BASE_PATH_PREFIX}${baseId}`
}

export function baseUrl(baseId: string): string {
    return `${window.location.origin}${basePath(baseId)}`
}
