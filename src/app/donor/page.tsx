'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

// Interfaces
interface Campaign { _id: string; name: string; description: string; targetAmount: number; raisedAmount: number; }
interface DecodedToken { user: { id: string; role: string; }; }
interface MyDonation { _id: string; amount: number; campaign: { _id: string; name: string; }; createdAt: string; }
// --- V2.0: NEW INTERFACE for the campaign's transaction feed ---
interface CampaignTransaction {
  _id: string;
  type: 'MINT' | 'REDEEM';
  amount: number;
  beneficiary: {
    _id: string;
    name: string;
  };
  vendor?: { // Vendor is optional (only exists on REDEEM)
    _id: string;
    name: string;
  };
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

export default function DonorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myDonations, setMyDonations] = useState<MyDonation[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignTransactions, setCampaignTransactions] = useState<CampaignTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorAmount, setDonorAmount] = useState<number | ''>('');

  const getToken = () => localStorage.getItem('relief-token');

  // read the primitive campaign id once (stable primitive for deps)
  const campaignIdFromUrl = searchParams?.get('campaign') ?? null;

  // fetchData accepts optional campaignId to preselect
  const fetchData = async (preselectedCampaignId?: string | null) => {
    const token = getToken();
    if (!token) return { campaignsData: [] as Campaign[], donationsData: [] as MyDonation[] };

    setIsLoading(true);
    try {
      const [campaignsRes, donationsRes] = await Promise.all([
        fetch(`${API_BASE}/api/ngo/campaigns`),
        fetch(`${API_BASE}/api/donor/my-donations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!campaignsRes.ok) throw new Error('Could not fetch campaigns.');
      if (!donationsRes.ok) throw new Error('Could not fetch your donations.');

      const campaignsData: Campaign[] = await campaignsRes.json();
      const donationsData: MyDonation[] = await donationsRes.json();

      setCampaigns(campaignsData || []);
      setMyDonations(donationsData || []);
      
      let campaignToSelect = null;
      
      // Use the stable primitive here
      const campaignIdToLoad = preselectedCampaignId;
    
      if (campaignIdToLoad) {
        campaignToSelect = campaignsData.find((c: Campaign) => c._id === campaignIdToLoad);
      } else if (selectedCampaign) {
        campaignToSelect = campaignsData.find((c: Campaign) => c._id === selectedCampaign._id);
      }

      if (campaignToSelect) {
        setSelectedCampaign(campaignToSelect);
        await fetchCampaignTransactions(campaignToSelect._id);
      }

      return { campaignsData, donationsData };
    } catch (error) {
      console.error(error);
      alert('Error: Could not load dashboard data. Please try again later.');
      return { campaignsData: [] as Campaign[], donationsData: [] as MyDonation[] };
    } finally {
      setIsLoading(false);
    }
  };

    // --- V2.0: NEW FUNCTION to fetch transactions for the selected campaign ---
  const fetchCampaignTransactions = async (campaignId: string) => {
    try {
      // --- FIX: Use API_BASE constant ---
      const res = await fetch(`${API_BASE}/api/public/campaign/${campaignId}/transactions`);
      if (!res.ok) throw new Error("Could not fetch campaign transactions.");
      const data = await res.json();
      setCampaignTransactions(data);
    } catch (error) {
      console.error(error);
      setCampaignTransactions([]); // Clear transactions on error
    }
  };
  
    // --- V2.0: NEW HANDLER for selecting a campaign ---
  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    // When a user clicks a campaign, fetch its specific transactions
    fetchCampaignTransactions(campaign._id);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.user.role === 'donor') {
        setIsAuthorized(true);
        fetchData(campaignIdFromUrl);
      } else {
        alert('Access Denied: You must be logged in as a donor.');
        router.push('/');
      }
    } catch (error) {
      router.push('/login');
    }
    // stable deps: router and the primitive campaignIdFromUrl
  }, [router, campaignIdFromUrl]);

  const handleDonateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    const token = getToken();
    if (!token) {
      alert('You must be logged in.');
      router.push('/login');
      return;
    }

    if (donorAmount === '' || Number(donorAmount) <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }

    // --- CRITICAL FIX: Validation must use raisedAmount ---
    const remainingAmount = selectedCampaign.targetAmount - selectedCampaign.raisedAmount;
    if (Number(donorAmount) > remainingAmount) {
      alert(`Your donation of ₹${donorAmount} exceeds the campaign's remaining goal of ₹${remainingAmount}. Please enter a smaller amount.`);
      return;
    }
    // --- END OF FIX ---

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/donor/donate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: donorName,
          phone: donorPhone,
          amount: Number(donorAmount),
          campaignId: selectedCampaign._id
        })
      });

      const respJson = await response.json();

      if (!response.ok) {
        throw new Error(respJson?.msg || 'Donation failed.');
      }
      
      alert(`Thank you for your donation of ₹${Number(donorAmount).toLocaleString()} to the ${selectedCampaign.name} campaign!`);
      setIsModalOpen(false);
      setDonorName(''); setDonorPhone(''); setDonorAmount('');

      // canonicalize with a re-fetch (await so UI reflects server)
      // This will also refetch the transactions for the selected campaign
      await fetchData(selectedCampaign._id); 

    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err?.message || 'Donation failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('relief-token');
    router.push('/');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p>Loading Donor Portal...</p></div>;
  if (!isAuthorized) return null;

  return (
    <div className="bg-gray-100 min-h-screen text-gray-900">
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1
          onClick={() => router.push('/')}
          onKeyDown={(e) => { if ((e as any).key === 'Enter') router.push('/'); }}
          tabIndex={0}
          role="link"
          className="text-2xl font-bold text-gray-900 cursor-pointer select-none"
        >
          ReliefCoin
        </h1>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Logout</button>
      </nav>
      
      <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">My Recent Donations</h2>
          {myDonations.length === 0 ? (
            <p className="text-gray-700">You have not made any donations yet.</p>
          ) : (
            <div className="space-y-3">
              {myDonations.slice(0, 3).map(donation => (
                <div key={donation._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-bold text-lg text-green-600">₹{donation.amount.toLocaleString()}</span>
                    <span className="text-gray-700"> to </span>
                    <span className="font-semibold text-gray-900">{donation.campaign.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{new Date(donation.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Select a Campaign</h2>
          <div className="space-y-4">
            {campaigns.map(c => (
              <button key={c._id} onClick={() => handleSelectCampaign(c)} // --- FIX: Use handleSelectCampaign ---
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedCampaign?._id === c._id ? 'bg-blue-100 border-blue-500 shadow-lg' : 'bg-white hover:bg-gray-50 border-transparent'}`}>
                <p className="font-bold text-lg text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-700">{c.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedCampaign ? (
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-3xl font-bold mb-2 text-gray-900">{selectedCampaign.name}</h2>
              <p className="text-gray-900 mb-6">{selectedCampaign.description}</p>
              
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  {/* --- FIX: Use raisedAmount --- */}
                  <div className="bg-green-500 h-4 rounded-full" style={{ width: `${Math.min(100, (selectedCampaign.raisedAmount / selectedCampaign.targetAmount) * 100)}%` }}></div>
                </div>
                <p className="text-center mt-2 font-semibold text-gray-900">
                  {/* --- FIX: Use raisedAmount --- */}
                  ₹{selectedCampaign.raisedAmount.toLocaleString()} / ₹{selectedCampaign.targetAmount.toLocaleString()} Raised
                </p>
              </div>

              <h3 className="font-bold text-xl mb-4 text-gray-900">Live Campaign Activity</h3>
              <div className="border p-4 rounded-lg h-48 overflow-y-auto bg-gray-50 text-sm font-mono text-gray-900">
                  {/* --- FIX: Removed simulation text. This is now fully dynamic. --- */}
                  {campaignTransactions.length === 0 ? (
                    <p>No aid transactions have been recorded for this campaign yet.</p>
                  ) : (
                    campaignTransactions.map(tx => (
                      <div key={tx._id} className="mb-3">
                        {tx.type === 'MINT' && (
                          <p>
                            <span className="font-bold text-blue-600">MINT:</span> 
                            <span className="text-green-600"> +{tx.amount} RC</span> 
                            <span> issued to </span> 
                            <span className="font-semibold">{tx.beneficiary.name}</span>
                          </p>
                        )}
                        {tx.type === 'REDEEM' && (
                          <p>
                            <span className="font-bold text-red-600">REDEEM:</span> 
                            <span className="text-red-600"> -{tx.amount} RC</span> 
                            <span> spent by </span> 
                            <span className="font-semibold">{tx.beneficiary.name}</span>
                            {tx.vendor && <span> at {tx.vendor.name}</span>}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
              </div>

              <button onClick={() => setIsModalOpen(true)} className="mt-8 w-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-xl py-4 rounded-lg shadow-lg transform hover:scale-105 transition-transform">
                DONATE TO THIS CAMPAIGN
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-white p-8 rounded-lg shadow-lg">
              <p className="text-xl text-gray-900">Please select a campaign from the left to see details and donate.</p>
            </div>
          )}
        </div>
      </div>
      
      {isModalOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-gray-900">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Donate to {selectedCampaign.name}</h2>
            <form onSubmit={handleDonateSubmit}>
              <input value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Your Name" required className="w-full p-3 border rounded mb-4 text-gray-900" />
              <input value={donorPhone} onChange={e => setDonorPhone(e.target.value)} type="tel" placeholder="Your Phone Number" required className="w-full p-3 border rounded mb-4 text-gray-900" />
              <input
                value={donorAmount}
                onChange={e => setDonorAmount(e.target.value === '' ? '' : Number(e.target.value))}
                type="number"
                placeholder="Amount (₹)"
                required
                // --- CRITICAL FIX: Validation must use raisedAmount ---
                max={selectedCampaign.targetAmount - selectedCampaign.raisedAmount}
                className="w-full p-3 border rounded mb-4 text-gray-900"
              />
              <div className="flex justify-end items-center gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : 'Confirm Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}