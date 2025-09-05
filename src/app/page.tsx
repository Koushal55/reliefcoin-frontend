'use client'; 

import { useState, useEffect, FormEvent } from 'react';

// Define a type for our campaign data
interface Campaign {
  id: number;
  name: string;
  allocated: number;
  distributed: number;
}

export default function NGODashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    // ... useEffect logic is unchanged ...
    const fetchCampaigns = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:5000/api/campaigns');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCampaigns(data);
        if (data.length > 0) setSelectedCampaign(data[0].name);
      } catch (e: any) {
        console.error("Fetch error details:", e);
        setError('Failed to connect to the backend. Please ensure the backend server is running and try again.');
        setCampaigns([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    // ... handleSubmit logic is unchanged ...
    event.preventDefault(); 
    const issuanceData = { campaign: selectedCampaign, beneficiary, amount: Number(amount) };
    try {
      const response = await fetch('http://localhost:5000/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issuanceData),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      alert('Aid issued successfully!'); 
      const updatedCampaigns = campaigns.map(c => 
        c.name === selectedCampaign 
          ? { ...c, distributed: c.distributed + Number(amount) } 
          : c
      );
      setCampaigns(updatedCampaigns);
      setIsModalOpen(false);
      setBeneficiary('');
      setAmount('');
    } catch (error) {
      console.error('Error submitting issuance:', error);
      alert('Failed to issue aid.'); 
    }
  };

  return (
    <>
      <main className={`bg-gray-100 min-h-screen p-8 ${isModalOpen ? 'filter blur-sm' : ''}`}>
        {/* STYLING FIX 1: Reverted to a wider container for a better overall look */}
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">NGO Dashboard</h1>
            <p className="text-gray-600">ReliefCoin Distribution Portal</p>
          </header>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Active Campaigns</h2>
            {isLoading && <p className="text-center text-gray-500">Loading campaigns...</p>}
            {error && <p className="text-center text-red-600 bg-red-100 p-4 rounded-lg">{error}</p>}
            {!isLoading && !error && (
              // STYLING FIX 2: Added lg:grid-cols-3 to make cards medium on large screens
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => {
                  const progress = (campaign.allocated > 0) ? (campaign.distributed / campaign.allocated) * 100 : 0;
                  return (
                    <div key={campaign.id} className="bg-white p-6 rounded-lg shadow-md flex flex-col">
                      <div className="flex-grow">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">{campaign.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {campaign.distributed.toLocaleString()} RC Distributed of {campaign.allocated.toLocaleString()} RC
                        </p>
                      </div>
                      <div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-right text-sm font-medium text-gray-600">{Math.round(progress)}% Complete</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Rest of the component is unchanged */}
          <section className="mb-8">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out text-xl max-w-xs mx-auto block">
              + ISSUE AID
            </button>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-gray-700 mb-4">Recent Global Activity</h2>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <ul className="divide-y divide-gray-200">
                <li className="py-3 text-gray-800">Issued 250 RC to Beneficiary #B456 (Warangal Floods)</li>
                <li className="py-3 text-gray-800">Issued 500 RC to Beneficiary #B457 (Drought Relief)</li>
                <li className="py-3 text-gray-800">Issued 150 RC to Beneficiary #B458 (Warangal Floods)</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      {/* Modal is unchanged */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           {/* ... Modal form code is unchanged ... */}
           <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
           <h2 className="text-2xl font-bold text-gray-800 mb-6">Issue ReliefCoin</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="campaign" className="block text-gray-700 font-medium mb-2">Select Campaign</label>
                <select id="campaign" value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500">
                  {campaigns.map((c) => <option key={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="beneficiary" className="block text-gray-700 font-medium mb-2">Beneficiary Name or ID</label>
                <input type="text" id="beneficiary" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} required placeholder="e.g., Koushik M" className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500" />
              </div>
              <div className="mb-6">
                <label htmlFor="amount" className="block text-gray-700 font-medium mb-2">Amount (in RC)</label>
                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="e.g., 250" className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500" />
              </div>
              <div className="flex justify-between items-center">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">Generate Secure QR Code</button>
              </div>
            </form>
            </div>
        </div>
      )}
    </>
  );
}