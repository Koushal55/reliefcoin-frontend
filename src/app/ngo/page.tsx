'use client'; 

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image';

// --- MODIFIED: Updated Campaign interface to match the database ---
interface Campaign {
  _id: string;
  name: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;      // How much donors have given
  distributedAmount: number; // How much the NGO has issued
}
interface DecodedToken { user: { id: string; role: string; }; }

export default function NGODashboard() {
  const router = useRouter(); 
  const [view, setView] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Form states (unchanged)
  const [campaignName, setCampaignName] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignTarget, setCampaignTarget] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryEmail, setBeneficiaryEmail] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [issueAmount, setIssueAmount] = useState('');
  const [issueBeneficiaryPhone, setIssueBeneficiaryPhone] = useState('');
  const [issueCampaign, setIssueCampaign] = useState('');
  const [generatedQRUrl, setGeneratedQRUrl] = useState<string | null>(null);

  // Security Check
  useEffect(() => {
    const token = localStorage.getItem('relief-token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.user.role === 'ngo') {
        setIsAuthorized(true);
        fetchCampaigns(); // Fetch data now that we are authorized
      } else {
        alert("Access Denied: You are not authorized.");
        router.push('/');
      }
    } catch (error) {
      router.push('/login');
    }
  }, [router]); // We only need router as a dependency here

  const fetchCampaigns = async () => {
    if (!isLoading) setIsLoading(true); // Show loading only if not initial
    try {
      const res = await fetch('http://localhost:5000/api/ngo/campaigns');
      if (!res.ok) throw new Error("Could not fetch campaigns");
      const data = await res.json();
      setCampaigns(data);
      if (data.length > 0 && issueCampaign === '') {
        setIssueCampaign(data[0]._id);
      }
    } catch (error) {
      console.error(error);
      alert("Error: Could not load campaign data.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Form Handlers ---
  const handleAddCampaign = async (e: FormEvent) => {
    e.preventDefault();
    await fetch('http://localhost:5000/api/ngo/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, description: campaignDesc, targetAmount: Number(campaignTarget) })
    });
    fetchCampaigns(); // Refresh list
    setCampaignName(''); setCampaignDesc(''); setCampaignTarget('');
    setView('campaigns'); // Switch view back to campaigns
  };
  
  const handleAddBeneficiary = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/ngo/beneficiaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: beneficiaryName, email: beneficiaryEmail, phone: beneficiaryPhone })
      });
      if (!res.ok) throw new Error("Failed to add beneficiary. Email may already be in use.");
      alert(`Beneficiary ${beneficiaryName} added! An SMS with their details will be sent to ${beneficiaryPhone}.`);
      setBeneficiaryName(''); setBeneficiaryEmail(''); setBeneficiaryPhone('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // --- MODIFIED: This function now properly refreshes the data ---
  const handleIssueAid = async (e: FormEvent) => {
    e.preventDefault();
    setGeneratedQRUrl(null);
    try {
      // --- MODIFIED: Added validation logic ---
      const selectedCampaignData = campaigns.find(c => c._id === issueCampaign);
      if (!selectedCampaignData) {
          alert("Error: Could not find campaign data.");
          return;
      }
      // This is the new, correct validation
      const availableToDistribute = selectedCampaignData.raisedAmount - selectedCampaignData.distributedAmount;
      if (Number(issueAmount) > availableToDistribute) {
          alert(`Issue amount (₹${issueAmount}) cannot exceed the campaign's available balance of ₹${availableToDistribute}.`);
          return;
      }
      // --- END OF MODIFICATION ---

      const res = await fetch('http://localhost:5000/api/ngo/issue-aid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ beneficiaryPhone: issueBeneficiaryPhone, amount: issueAmount, campaignId: issueCampaign }) 
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.msg || "Failed to issue aid.");
      }
      
      const data = await res.json();
      alert(`Aid issued successfully!`);
      setGeneratedQRUrl(data.qrUrl); 
      
      // --- THIS IS THE FIX ---
      // After successfully issuing aid, we call fetchCampaigns()
      // to get the new, updated list from the database.
      fetchCampaigns();
      // --- END OF FIX ---

    } catch (error: any) {
        alert(`Error: ${error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('relief-token');
    router.push('/');
  };

    // --- V2.0 FEATURE: This function pre-fills the campaign form ---
  const handleCreateFromEvent = () => {
    // 1. Set the form fields with our simulated data
    setCampaignName('Kerala Flood Relief 2025');
    setCampaignDesc('AI-detected flood event in Alappuzha/Kottayam. Targeting 1,200 households.');
    setCampaignTarget('600000'); // 1,200 households * 500 RC each
    
    // 2. Switch the user to the "Manage Campaigns" tab
    setView('campaigns');
  };
  // --- END V2.0 FEATURE ---

  if (isLoading && campaigns.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading and verifying access...</p></div>;
  }
  if (!isAuthorized) {
    return <div className="min-h-screen flex items-center justify-center"><p>Redirecting...</p></div>;
  }

  // --- The JSX is now fully upgraded ---
  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">NGO Dashboard</h1>
        <div>
          <a href="/" className="text-blue-600 hover:underline mr-4">← Public Site</a>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Logout</button>
        </div>
      </nav>

      <div className="p-4 md:p-8 max-w-7xl mx-auto text-gray-900">
        <div className="flex border-b mb-6">
          <button onClick={() => setView('assessment')} className={`py-2 px-4 text-sm md:text-base ${view === 'assessment' ? 'border-b-2 border-purple-500 font-semibold' : 'text-gray-600'}`}>Live Assessment</button>
          <button onClick={() => setView('campaigns')} className={`py-2 px-4 text-sm md:text-base ${view === 'campaigns' ? 'border-b-2 border-purple-500 font-semibold' : 'text-gray-600'}`}>Manage Campaigns</button>
          <button onClick={() => setView('beneficiaries')} className={`py-2 px-4 text-sm md:text-base ${view === 'beneficiaries' ? 'border-b-2 border-purple-500 font-semibold' : 'text-gray-600'}`}>Add Beneficiary</button>
          <button onClick={() => setView('issue')} className={`py-2 px-4 text-sm md:text-base ${view === 'issue' ? 'border-b-2 border-purple-500 font-semibold' : 'text-gray-600'}`}>Issue Aid</button>
        </div>

        {/* --- V2.0 FEATURE: The content for the new tab --- */}
        {view === 'assessment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">AI Damage Assessment - Kerala Floods</h2>
              <p className="text-gray-700 mb-4">Live analysis of satellite imagery. Red zones indicate severe flooding and infrastructure damage.</p>
              <div className="border rounded-lg overflow-hidden">
                <Image 
                  src="/pics/damage_map.jpg" // This is your simulated AI map
                  alt="AI Damage Assessment Map"
                  width={800}
                  height={600}
                  layout="responsive"
                />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">AI Analysis & Recommendation</h2>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800">High-Priority Event Detected</h3>
                <p className="text-red-700 mt-2">Flooding in the Alappuzha/Kottayam region has been identified.</p>
              </div>
              <div className="mt-4 space-y-3">
                <p><strong>Status:</strong> <span className="font-semibold text-red-600">Active Disaster</span></p>
                <p><strong>Estimated Households Affected:</strong> <span className="font-semibold">~1,200</span></p>
                <p><strong>Estimated Population:</strong> <span className="font-semibold">~3,500</span></p>
                <p><strong>Recommended Aid Package (per household):</strong> <span className="font-semibold">500 RC</span></p>
                <p><strong>Total Recommended Budget:</strong> <span className="font-bold text-xl text-blue-600">₹600,000</span></p>
              </div>
              <button 
                onClick={handleCreateFromEvent}
                className="w-full bg-green-500 text-white font-bold p-3 rounded-lg mt-6 text-lg hover:bg-green-600"
              >
                Create New Campaign from this Event
              </button>
            </div>
          </div>
        )}
        {/* --- END V2.0 FEATURE --- */}

        {/* --- MODIFIED: This view is now a dynamic dashboard --- */}
        {view === 'campaigns' && (
          <div>
            <div className="mb-8 p-6 bg-white rounded-lg shadow max-w-lg mx-auto">
              <h2 className="text-xl font-bold mb-4">Add New Campaign</h2>
              <form onSubmit={handleAddCampaign}>
                  <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Campaign Name" required className="w-full p-2 border rounded mb-2 text-gray-900" />
                  <textarea value={campaignDesc} onChange={e => setCampaignDesc(e.target.value)} placeholder="Description" required className="w-full p-2 border rounded mb-2 text-gray-900"></textarea>
                  <input value={campaignTarget} onChange={e => setCampaignTarget(e.target.value)} type="number" placeholder="Target Amount (₹)" required className="w-full p-2 border rounded mb-2 text-gray-900" />
                  <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Create Campaign</button>
              </form>
            </div>
            <h2 className="text-xl font-bold mb-4">Existing Campaigns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => {
                // --- Progress for Funding (Donors) ---
                const fundingProgress = Math.max(0, Math.min(100, (campaign.raisedAmount / campaign.targetAmount) * 100));
                // --- Progress for Distribution (NGO) ---
                const distributionProgress = Math.max(0, Math.min(100, (campaign.distributedAmount / campaign.raisedAmount) * 100));
                return (
                  <div key={campaign._id} className="bg-white p-6 rounded-lg shadow flex flex-col">
                    <div className="flex-grow">
                      <h3 className="font-bold text-lg text-gray-800">{campaign.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                    </div>
                    <div className="mt-4">
                      {/* Funding Progress */}
                      <label className="text-sm font-medium text-gray-700">Funding Progress</label>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${fundingProgress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 text-right">₹{campaign.raisedAmount.toLocaleString()} / ₹{campaign.targetAmount.toLocaleString()} Raised</p>
                      
                      {/* Distribution Progress */}
                      <label className="text-sm font-medium text-gray-700 mt-2">Distribution Progress</label>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${distributionProgress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 text-right">₹{campaign.distributedAmount.toLocaleString()} / ₹{campaign.raisedAmount.toLocaleString()} Distributed</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* --- END OF MODIFICATION --- */}

        {view === 'beneficiaries' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-900">Add New Beneficiary</h2>
            <form onSubmit={handleAddBeneficiary} className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-900 mb-4">This will create a new user account and a secure blockchain wallet for the beneficiary.</p>
                <input value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)} placeholder="Full Name" required className="w-full p-2 border rounded mb-2 text-gray-900" />
                <input value={beneficiaryEmail} onChange={e => setBeneficiaryEmail(e.target.value)} type="email" placeholder="Email Address" required className="w-full p-2 border rounded mb-2 text-gray-900" />
                <input value={beneficiaryPhone} onChange={e => setBeneficiaryPhone(e.target.value)} type="tel" placeholder="Phone Number" required className="w-full p-2 border rounded mb-4 text-gray-900" />
                <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Register Beneficiary</button>
            </form>
          </div>
        )}
        
        {view === 'issue' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-900">Issue Aid & Mint Tokens</h2>
            <form onSubmit={handleIssueAid} className="bg-white p-6 rounded-lg shadow">
              <label className="block mb-2 text-gray-900">Select Campaign</label>
              <select value={issueCampaign} onChange={e => setIssueCampaign(e.target.value)} required className="w-full p-2 border rounded mb-2 text-gray-900">
                  <option value="" disabled>-- Select a campaign --</option>
                  {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <label className="block mb-2 font-medium text-gray-900">Beneficiary Phone Number</label>
              <input 
                value={issueBeneficiaryPhone} 
                onChange={e => setIssueBeneficiaryPhone(e.target.value)} 
                type="tel" 
                placeholder="e.g., 9876543210" 
                required 
                className="w-full p-2 border rounded mb-4 text-gray-900" 
              />
              <label className="block mb-2 text-gray-900">Amount (RC)</label>
              <input 
                value={issueAmount} 
                onChange={e => setIssueAmount(e.target.value)} 
                type="number" 
                placeholder="500" 
                required 
                className="w-full p-2 border rounded mb-4 text-gray-900" 
              />
              <button type="submit" className="w-full bg-purple-500 text-white p-2 rounded">Issue Aid</button>
            </form>
            {generatedQRUrl && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow text-center">
                    <h3 className="font-bold mb-4 text-gray-900">QR Code Sent to Beneficiary</h3>
                    <img src={generatedQRUrl} alt="Generated QR Code" className="mx-auto" />
                    <p className="mt-2 text-sm text-gray-600">An SMS with a link to this QR has been sent.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

