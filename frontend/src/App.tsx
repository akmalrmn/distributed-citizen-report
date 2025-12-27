import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { SubmitReport } from './pages/SubmitReport';
import { ReportList } from './pages/ReportList';
import { ReportDetail } from './pages/ReportDetail';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <Link to="/" className="text-xl font-bold">
                Citizen Report
              </Link>
              <div className="flex gap-4">
                <Link to="/" className="hover:text-blue-200">
                  Reports
                </Link>
                <Link to="/submit" className="hover:text-blue-200">
                  Submit Report
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto py-8 px-4">
          <Routes>
            <Route path="/" element={<ReportList />} />
            <Route path="/submit" element={<SubmitReport />} />
            <Route path="/report/:id" element={<ReportDetail />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-300 py-4 mt-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p>IF4031 - Distributed Application Architecture</p>
            <p className="text-sm">Citizen Reporting System PoC</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
