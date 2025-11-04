'use client';

import { useState, FormEvent, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { jwtDecode } from 'jwt-decode';
// --- FIX: Import the correct router from 'next/navigation' ---
import { useRouter } from 'next/navigation';

interface DecodedToken {
  user: {
    id: string;
    role: string;
  };
}

// --- NEW: Interface for the user's data ---
interface UserData {
  name: string;
}

export default function VendorPortal() {
  // --- FIX: Initialize the router correctly ---
  const router = useRouter(); 

  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // --- FIX: Default scanner to hidden ---
  const [showScanner, setShowScanner] = useState(false); 
  const [redeemAmount, setRedeemAmount] = useState('');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  // --- NEW: State to store the vendor's name ---
  const [vendorName, setVendorName] = useState<string | null>(null); 
  
  // --- FIX: Consolidated both useEffects into one for security and data fetching ---
  useEffect(() => {
    const token = localStorage.getItem('relief-token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.user.role === 'vendor') {
        setIsAuthorized(true);
        setVendorId(decoded.user.id); // Set the vendor ID
        
        // --- NEW: Fetch the vendor's name for the welcome message ---
        const fetchVendorName = async () => {
          try {
            // We use the public user route we already built
            const res = await fetch(`http://localhost:5000/api/public/user/${decoded.user.id}`);
            if (res.ok) {
              const data: UserData = await res.json();
              setVendorName(data.name); // Set the name
            } else {
              setVendorName('Vendor'); // Fallback name
            }
          } catch (e) {
            setVendorName('Vendor'); // Fallback name
          } finally {
            setIsLoading(false); // Stop loading only after auth AND name fetch
          }
        };
        fetchVendorName();
        // --- END OF NEW ---

      } else {
        alert("Access Denied: This page is for vendors only.");
        router.push('/');
      }
    } catch (error) {
      router.push('/login');
    }
    // We remove the 'finally' from here so loading only stops after the name is fetched
  }, [router]);
  // --- END OF FIX ---

  // (The second useEffect that was here is now deleted as it was redundant)

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Verifying access...</p></div>;
  }
  if (!isAuthorized) {
    return null; // or a redirecting message
  }

  const handleScanResult = (result: any) => {
    if (!!result) {
      setShowScanner(false);
      setBeneficiaryId(result?.text);
    }
  };

  const handleRedeem = async (event: FormEvent) => {
    event.preventDefault();
    if (!beneficiaryId || !vendorId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId: beneficiaryId,
          vendorId: vendorId,
          amount: Number(redeemAmount),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Redemption failed');
      }
      
      alert(`Success! Redeemed ${redeemAmount} RC. TxHash: ${data.txHash}`);
      startNewScan();

    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const startNewScan = () => {
    setBeneficiaryId(null);
    setError(null);
    setRedeemAmount('');
    setShowScanner(true); // <-- This now correctly SHOWS the scanner
  };

  // --- MODIFIED: The JSX is updated to reflect the new workflow ---
  return (
    <main className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center bg-white p-6 rounded-lg shadow-md">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Vendor Portal</h1>
          {/* --- NEW: Welcome message --- */}
          {vendorName && (
            <p className="text-xl text-gray-600 mt-2">Welcome, {vendorName}</p>
          )}
        </header>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        {!beneficiaryId ? (
          // This is the "Scanning" view
          <div>
            {/* --- FIX: This button now correctly toggles the scanner on --- */}
            <button 
              onClick={startNewScan} 
              className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-green-700 disabled:opacity-50"
              disabled={showScanner} // Disable button if scanner is already open
            >
              {showScanner ? 'Scanning...' : 'START NEW SCAN'}
            </button>
            
            {showScanner && (
              <>
                <QrReader 
                  onResult={handleScanResult} 
                  constraints={{ facingMode: 'environment' }} 
                  className="w-full mt-4" 
                />
                <button 
                  onClick={() => setShowScanner(false)} // This button now HIDES the scanner
                  className="mt-4 text-gray-800 hover:underline"
                >
                  Cancel Scan
                </button>
              </>
            )}
          </div>
        ) : (
          // This is the "Redemption" view (after scan is successful)
          <div className="text-left">
            <h3 className="font-semibold text-lg text-gray-800">Beneficiary Scanned</h3>
            <div className="p-4 bg-gray-50 rounded-lg mt-2">
              <p className="text-gray-900"><strong>Beneficiary ID:</strong> <span className="font-mono text-sm break-all">{beneficiaryId}</span></p>
            </div>
            <form onSubmit={handleRedeem} className="mt-6">
              <label htmlFor="amount" className="block text-left font-semibold text-lg text-gray-800 mb-2">Amount to Redeem</label>
              <input 
                type="number" 
                value={redeemAmount} 
                onChange={(e) => setRedeemAmount(e.target.value)} 
                required 
                placeholder="e.g., 50" 
                className="w-full font-semibold p-3 border border-gray-300 rounded-lg mb-4 text-gray-900" 
              />
              
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'CONFIRM REDEMPTION'}
              </button>
              <button 
                type="button" 
                onClick={startNewScan} // This button now correctly starts a new scan
                className="mt-4 text-gray-800 hover:underline w-full disabled:opacity-50" 
                disabled={isSubmitting}
              >
                Scan Another
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

