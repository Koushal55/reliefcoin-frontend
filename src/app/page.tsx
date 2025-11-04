'use client';

import { useState, useEffect } from 'react';
// --- FIX: Import the correct router from 'next/navigation' ---
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';

// --- FIX: Cleaned up interfaces ---
interface Campaign {
  _id: string;
  name: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  distributedAmount: number;
}
interface BlockchainTransaction {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
}
interface DecodedToken {
  user: {
    id: string;
    role: string;
  };
}
// ---------------------------------

export default function HomePage() {
  // --- FIX: Initialize the router correctly ---
  const router = useRouter();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // This effect fetches public data. It runs for ALL visitors.
  useEffect(() => {
    async function fetchData() {
      try {
        const [campaignsRes, transactionsRes] = await Promise.all([
          fetch('http://localhost:5000/api/ngo/campaigns'),
          fetch('http://localhost:5000/api/public/transactions')
        ]);
        if (!campaignsRes.ok) throw new Error("Failed to fetch campaigns");
        if (!transactionsRes.ok) throw new Error("Failed to fetch transactions");

        const campaignsData = await campaignsRes.json();
        const transactionsData = await transactionsRes.json();
        setCampaigns(campaignsData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // This effect checks login status. It runs after the public data starts loading.
  useEffect(() => {
    const token = localStorage.getItem('relief-token');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setIsLoggedIn(true);
        setUserRole(decoded.user.role);
      } catch (e) {
        console.error("Invalid token:", e);
        localStorage.removeItem('relief-token'); // Clear bad token
      }
    }
  }, []);

  // --- FIX: This is the correct, robust logic for the donate button ---
  const handleDonateClick = (campaignId: string) => {
    if (isLoggedIn) {
      if (userRole === 'donor') {
        // Logged in as donor: go straight to the donor page
        router.push(`/donor?campaign=${campaignId}`);
      } else {
        // Logged in as wrong role: alert and stay
        alert("Only users with the 'donor' role can access the donation page.");
      }
    } else {
      // Logged out: go to login, and pass the campaign ID so we can redirect after
      router.push(`/login?campaign=${campaignId}`);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('relief-token');
    setIsLoggedIn(false);
    setUserRole(null);
    router.push('/'); // Redirect to homepage
  };
  
  // --- FIX: Calculate metrics from the fetched data ---
  const totalRaised = campaigns.reduce((sum, camp) => sum + camp.raisedAmount, 0);
  const totalDistributed = campaigns.reduce((sum, camp) => sum + camp.distributedAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center fixed w-full z-10">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          ReliefCoin
        </Link>
        <div>
          {isLoggedIn ? (
            <>
              <span className="mr-4 text-gray-700 hidden sm:inline">Logged in as {userRole}</span>
              {userRole === 'vendor' && ( <Link href="/vendor" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg mr-2">Vendor Portal</Link> )}
              {userRole === 'ngo' && ( <Link href="/ngo" className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg mr-2">NGO Dashboard</Link> )}
              {userRole === 'donor' && ( <Link href="/donor" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg mr-2">My Donations</Link> )}
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg mr-2">Login</Link>
              <Link href="/register" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="relative h-screen bg-cover bg-center flex items-center justify-center text-white"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1533038692289-497793d5f573?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")' }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 text-center p-8 max-w-4xl">
          <h2 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            Empowering Aid with Unwavering Transparency.
          </h2>
          <p className="text-xl md:text-2xl font-light mb-8">
            See Every Donation. Track Every ReliefCoin. Fight Corruption. Build Trust.
          </p>
          {/* --- FIX: Button now uses the correct handler --- */}
          <button onClick={() => handleDonateClick('')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-full text-lg shadow-xl transform hover:scale-105 transition-all duration-300">
            Donate Now & Make a Difference
          </button>
        </div>
      </section>

      {/* The Problem & Our Solution Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-gray-800 mb-12">The Problem. Our Solution.</h3>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <img src="/pics/img1.jpg" alt="Aid Problem" className="rounded-xl shadow-lg mb-6 block mx-auto" width="350" />
              <p className="text-lg text-gray-700">
                In traditional aid, funds can vanish. Corruption, inefficiency, and lack of accountability erode trust, leaving millions without the help they desperately need. Donors often wonder if their contribution truly reached those it was intended for.
              </p>
            </div>
            <div className="text-left">
              <img src="/pics/img21.jpg" alt="Blockchain Solution" className="rounded-xl shadow-lg mb-6 block mx-auto" width="390"/>
              <p className="text-lg text-gray-700">
                ReliefCoin leverages blockchain technology to create a transparent, immutable ledger of every aid transaction. Every ReliefCoin minted and redeemed is recorded publicly, ensuring funds reach beneficiaries and are spent on essentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FIX: Impact Metrics Section is now DYNAMIC --- */}
      <section className="py-20 bg-gradient-to-br from-blue-400 to-indigo-800 text-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-4xl md:text-5xl font-semibold mb-10">Our Impact at a Glance</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card template */}
            <div className="flex flex-col items-center p-6 bg-white/10 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="bg-white/10 p-3 rounded-full mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <div className="min-h-[56px]">
                {isLoading ? (
                  <div className="h-10 w-36 mx-auto rounded bg-white/20 animate-pulse" />
                ) : (
                  <p className="text-3xl md:text-4xl font-semibold">{`₹${totalRaised.toLocaleString()}`}</p>
                )}
              </div>
              <p className="mt-3 text-sm md:text-base opacity-90">Total Funds Raised</p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white/10 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="bg-white/10 p-3 rounded-full mb-4">
                <span className="text-2xl">🔁</span>
              </div>
              <div className="min-h-[56px]">
                {isLoading ? (
                  <div className="h-10 w-36 mx-auto rounded bg-white/20 animate-pulse" />
                ) : (
                  <p className="text-3xl md:text-4xl font-semibold">{`${totalDistributed.toLocaleString()} RC`}</p>
                )}
              </div>
              <p className="mt-3 text-sm md:text-base opacity-90">ReliefCoin Distributed</p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white/10 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="bg-white/10 p-3 rounded-full mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <div className="min-h-[56px]">
                {isLoading ? (
                  <div className="h-10 w-20 mx-auto rounded bg-white/20 animate-pulse" />
                ) : (
                  <p className="text-3xl md:text-4xl font-semibold">1036</p>
                )}
              </div>
              <p className="mt-3 text-sm md:text-base opacity-90">Beneficiaries Reached</p>
            </div>

            <div className="flex flex-col items-center p-6 bg-white/10 rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300">
              <div className="bg-white/10 p-3 rounded-full mb-4">
                <span className="text-2xl">📣</span>
              </div>
              <div className="min-h-[56px]">
                {isLoading ? (
                  <div className="h-10 w-12 mx-auto rounded bg-white/20 animate-pulse" />
                ) : (
                  <p className="text-3xl md:text-4xl font-semibold">{campaigns.length}</p>
                )}
              </div>
              <p className="mt-3 text-sm md:text-base opacity-90">Active Campaigns</p>
            </div>
          </div>

          {/* optional small caption */}
          <p className="mt-8 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
            Data updates automatically — public campaign & transaction data is polled periodically to show the latest numbers.
          </p>
        </div>
      </section>


      {/* How It Works Section (Unchanged) */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-gray-800 mb-12">How ReliefCoin Works</h3>
          <div className="grid md:grid-cols-4 gap-12">
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 p-6 rounded-full text-blue-600 text-4xl mb-4 shadow-md">🏛️</div>
              <h4 className="font-semibold text-xl mb-2">1. NGOs Issue Aid</h4>
              <p className="text-gray-700">Verified NGOs mint ReliefCoin directly to beneficiaries' wallets.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-green-100 p-6 rounded-full text-green-600 text-4xl mb-4 shadow-md">🙋‍♀️</div>
              <h4 className="font-semibold text-xl mb-2">2. Beneficiaries Receive</h4>
              <p className="text-gray-700">Recipients get a secure QR code representing their digital aid.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-yellow-100 p-6 rounded-full text-yellow-600 text-4xl mb-4 shadow-md">🛒</div>
              <h4 className="font-semibold text-xl mb-2">3. Vendors Redeem</h4>
              <p className="text-gray-700">Local shops scan QR codes to provide goods in exchange for ReliefCoin.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-purple-100 p-6 rounded-full text-purple-600 text-4xl mb-4 shadow-md">🔗</div>
              <h4 className="font-semibold text-xl mb-2">4. Transparent Blockchain</h4>
              <p className="text-gray-700">Every transaction is publicly recorded, audited, and immutable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FIX: Featured Campaigns Section is DYNAMIC and uses correct logic --- */}
      <section id="campaigns" className="py-20 bg-gradient-to-br from-indigo-100 to-blue-50">
        <div className="container mx-auto px-6 text-center text-gray-900">
          <h3 className="text-4xl font-bold text-gray-900 mb-12">Active Campaigns: Your Support Matters</h3>
          {isLoading ? (
            <p className="text-gray-900">Loading campaigns...</p>
          ) : campaigns.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map(campaign => {
                const rawProgress = (campaign.targetAmount > 0) ? (campaign.raisedAmount / campaign.targetAmount) * 100 : 0;
                const progress = Math.max(0, Math.min(100, rawProgress));
                return (
                  <div key={campaign._id} className="bg-white p-6 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col text-gray-900">
                    <div className="flex-grow">
                      <h4 className="font-bold text-2xl text-gray-900 mb-2">{campaign.name}</h4>
                      <p className="text-gray-900 mb-4">{campaign.description}</p>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                        <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-sm text-gray-900 mb-4">
                        {Math.round(progress)}% Funded - ₹{campaign.raisedAmount.toLocaleString()} / ₹{campaign.targetAmount.toLocaleString()}
                      </p>
                    </div>
                    {/* This button now correctly uses the handleDonateClick function */}
                    <button
                      onClick={() => handleDonateClick(campaign._id)}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition-colors"
                    >
                      Donate to this Campaign
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xl text-gray-900">No active campaigns at the moment. Please check back later.</p>
          )}
        </div>
      </section>

      {/* Live Transactions Section (Unchanged, already dynamic) */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-6">
          <h3 className="text-4xl font-bold text-gray-800 mb-12 text-center">Live Aid Transactions on Blockchain</h3>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl mx-auto">
            {isLoading ? (
              <p className="text-center text-gray-500">Loading live blockchain data...</p>
            ) : transactions.length === 0 ? (
                <p className="text-center text-gray-500">No transactions found on the current blockchain. Try minting some tokens!</p>
            ) : (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.txHash} className="p-4 border rounded-md font-mono text-sm hover:bg-gray-50">
                    <p><strong>Amount:</strong> <span className="text-green-600 font-bold">{parseFloat(tx.amount).toFixed(2)} RC</span></p>
                    <p className="truncate"><strong>From:</strong> <span className="text-gray-600">{tx.from}</span></p>
                    <p className="truncate"><strong>To:</strong> <span className="text-gray-600">{tx.to}</span></p>
                    <p><strong>Block:</strong> #{tx.blockNumber}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer (Unchanged) */}
      <footer className="bg-gray-800 text-white py-10 text-center">
        <div className="container mx-auto px-6">
          <p>&copy; 2025 ReliefCoin. All rights reserved.</p>
          <p className="mt-2 text-sm">Empowering transparency in humanitarian aid.</p>
        </div>
      </footer>
    </div>
  );
}

