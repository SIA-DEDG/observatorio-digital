import { Component } from 'react'

export default class ErrorBoundary extends Component {
    state = { error: null }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary capturou:', error, info)
    }

    render() {
        if (this.state.error) {
            return (
                <div className="m-6 rounded-lg border border-danger bg-red-50 p-4 text-[13px] text-danger">
                    <p className="text-sm font-semibold">Erro ao renderizar o dashboard</p>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
                        {String(this.state.error?.stack ?? this.state.error?.message ?? this.state.error)}
                    </pre>
                </div>
            )
        }
        return this.props.children
    }
}
