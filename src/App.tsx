import React, { Component, useEffect, useState } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'

import { ApolloProvider } from '@apollo/client'

import BaseViewContainer from './views/Base'
import HomePageViewContainer from './views/Home'
import SupportViewContainer from './views/Support'
import PrivacyViewContainer from './views/Privacy'
import {
    UseCasesViewContainer,
    UseCaseDetailViewContainer,
} from './views/UseCases'
import MapcursorLoader from './components/common/mapcursorLoader'

import routes from './routes'
import { createApolloClient } from './utils/apolloClient'
import { ensureSession } from './utils/auth'

import './App.css'

import './common.css'

const apolloClient = createApolloClient()

function AppInit({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false)
    const [error, setError] = useState(false)

    useEffect(() => {
        ensureSession()
            .then(() => setReady(true))
            .catch(() => setError(true))
    }, [])

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-6 text-center text-gray-700">
                Could not connect. Please refresh.
            </div>
        )
    }
    if (!ready) return <MapcursorLoader />
    return <>{children}</>
}

class App extends Component {
    constructor(props: object) {
        super(props)
    }

    override render() {
        return (
            <BrowserRouter>
                <ApolloProvider client={apolloClient}>
                    <AppInit>
                        <div className="App ">
                            <Routes>
                                <Route
                                    path={routes.index}
                                    element={<BaseViewContainer />}
                                />
                                <Route
                                    path={routes.map}
                                    element={<BaseViewContainer />}
                                />
                                <Route
                                    path={routes.marketing}
                                    element={<HomePageViewContainer />}
                                />
                                <Route
                                    path={routes.support}
                                    element={<SupportViewContainer />}
                                />
                                <Route
                                    path={routes.privacy}
                                    element={<PrivacyViewContainer />}
                                />
                                <Route
                                    path={routes.useCases}
                                    element={<UseCasesViewContainer />}
                                />
                                <Route
                                    path={routes.useCase}
                                    element={<UseCaseDetailViewContainer />}
                                />
                            </Routes>
                        </div>
                    </AppInit>
                </ApolloProvider>
            </BrowserRouter>
        )
    }
}

export default App
