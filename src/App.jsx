import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardV1 from './pages/DashboardV1'
import DashboardV2 from './pages/DashboardV2'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/v1" element={<DashboardV1 />} />
        <Route path="/v2" element={<DashboardV2 />} />
        <Route path="*" element={<Navigate to="/v1" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
