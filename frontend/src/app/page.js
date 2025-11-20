"use client";
import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, Leaf, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, SCANNING, COMPLETE, ERROR
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const startScan = async (e) => {
    e.preventDefault();
    setStatus('SCANNING');
    setError('');
    setResult(null);

    try {
      // 1. Start the Scan
      const response = await axios.post('http://localhost:3001/api/scan', { url });
      const { scanId } = response.data;

      // 2. Start Polling for Results
      pollForResults(scanId);
    } catch (err) {
      setStatus('ERROR');
      setError('Failed to start scan. Is the backend running?');
    }
  };

  const pollForResults = async (scanId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/scan/${scanId}`);
        const data = res.data;

        if (data.status === 'COMPLETED') {
          clearInterval(interval);
          setResult(data);
          setStatus('COMPLETE');
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setStatus('ERROR');
          setError('The audit failed on the server.');
        }
        // If PENDING, do nothing, just wait for next interval
      } catch (err) {
        clearInterval(interval);
        setStatus('ERROR');
        setError('Lost connection to server.');
      }
    }, 2000); // Check every 2 seconds
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-24">
      
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-green-600 rounded-full shadow-lg">
            <Leaf className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-2 text-green-900">GreenPage AI</h1>
        <p className="text-gray-600">Carbon Auditor for Developer Workflows</p>
      </div>

      {/* Search Box */}
      <div className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-xl">
        <form onSubmit={startScan} className="flex gap-2 mb-6">
          <input
            type="url"
            required
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button 
            type="submit" 
            disabled={status === 'SCANNING'}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {status === 'SCANNING' ? <Loader2 className="animate-spin" /> : <Search />}
            Scan
          </button>
        </form>

        {/* Status Messages */}
        {status === 'SCANNING' && (
          <div className="text-center py-8 animate-pulse">
            <p className="text-green-700 font-medium">Auditing website assets...</p>
            <p className="text-sm text-gray-400 mt-2">This usually takes 10-15 seconds.</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Results Section */}
        {status === 'COMPLETE' && result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Score Card */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
              <h3 className="text-gray-600 font-medium mb-1">Carbon Footprint</h3>
              <div className="text-5xl font-bold text-green-800 mb-2">
                {result.carbonScore.toFixed(3)}g
              </div>
              <p className="text-sm text-green-700">CO2 per visit</p>
            </div>

            {/* File List */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">Asset Breakdown</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {result.reportData.slice(0, 10).map((file, index) => (
                  <div key={index} className="flex justify-between text-sm p-2 hover:bg-gray-50 rounded border-b border-gray-100">
                    <span className="truncate w-2/3 text-gray-600">{file.url}</span>
                    <span className="font-mono text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Showing top 10 assets</p>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}