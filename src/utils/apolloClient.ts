import {
    ApolloClient,
    InMemoryCache,
    HttpLink,
    Observable,
    from,
    split,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getMainDefinition } from '@apollo/client/utilities'
import { WebSocketLink } from '@apollo/client/link/ws'

import { ensureSession, getToken } from './auth'

const bearer = (): Record<string, string> => {
    const token = getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
}

const hasStatus401 = (error: unknown): boolean =>
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === 401

export function createApolloClient(): ApolloClient<object> {
    const httpLink = new HttpLink({
        uri: import.meta.env.VITE_GRAPHQL_ENDPOINT,
        headers: { 'content-type': 'application/json' },
    })

    const authLink = setContext((_operation, { headers }) => ({
        headers: { ...headers, ...bearer() },
    }))

    // A tab left open past the token's lifetime: refresh once, then retry.
    const retryOnAuthError = onError(
        ({ graphQLErrors, networkError, operation, forward }) => {
            const authFailed =
                hasStatus401(networkError) ||
                graphQLErrors?.some(
                    (e) => e.extensions?.code === 'access-denied'
                )
            if (!authFailed || operation.getContext().authRetried) return

            return new Observable((observer) => {
                ensureSession()
                    .then(() => {
                        operation.setContext({ authRetried: true })
                        forward(operation).subscribe(observer)
                    })
                    .catch((err: unknown) => observer.error(err))
            })
        }
    )

    const wsLink = new WebSocketLink({
        uri: import.meta.env.VITE_WS_GRAPHQL_ENDPOINT,
        options: {
            reconnect: true,
            connectionParams: () => ({ headers: bearer() }),
        },
    })

    const splitLink = split(
        ({ query }) => {
            const definition = getMainDefinition(query)
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
            )
        },
        wsLink,
        // retry sits before authLink so the retried request reads the new token
        from([retryOnAuthError, authLink, httpLink])
    )

    return new ApolloClient({
        link: splitLink,
        cache: new InMemoryCache(),
    })
}
