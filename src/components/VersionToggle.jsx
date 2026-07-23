import { useLocation, useNavigate } from 'react-router-dom'
import LevelToggle from './LevelToggle'

const OPTIONS = [
    { key: '/v1', label: 'V1' },
    { key: '/v2', label: 'V2' },
]

export default function VersionToggle() {
    const { pathname } = useLocation()
    const navigate = useNavigate()

    return <LevelToggle value={pathname} onChange={navigate} options={OPTIONS} />
}
