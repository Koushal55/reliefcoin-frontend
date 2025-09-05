'use client';

import { useState, FormEvent } from 'react';
import { QrReader } from 'react-qr-reader';

interface Beneficiary {
  id: string;
  name: string;
  balance: number;
}

export default function VendorPortal() {
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState(''); // This state holds the input value

  const handleScanResult = async (result: any) => {
    if (!!result) {
      const id = result?.text;
      setShowScanner(false);
      
      try {
        const response = await fetch(`http://localhost:5000/api/beneficiaries/${id}`);
        if (!response.ok) throw new Error('Beneficiary not found');
        const data = await response.json();
        setBeneficiary(data);
        setError(null);
      } catch (err) {
        setBeneficiary(null);
        setError('Error: Invalid QR Code or Beneficiary not found.');
      }
    }
  };

  const handleRedeem = async (event: FormEvent) => {
    event.preventDefault();
    if (!beneficiary) return;

    try {
      const response = await fetch('http://localhost:5000/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId: beneficiary.id,
          amount: Number(redeemAmount),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Redemption failed');
      }
      
      alert(`Success! Redeemed ${redeemAmount} RC. The beneficiary's new balance is now updated.`);
      startNewScan(); // Reset for the next transaction

    } catch (err: any) {
      setError(`Error: ${err.message}`);
    }
  };
  
  const startNewScan = () => {
    setBeneficiary(null);
    setError(null);
    setRedeemAmount('');
    setShowScanner(true);
  };

  return (
    <main className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Vendor Portal</h1>
          <p className="text-gray-800 mt-2">Welcome, Sri Lakshmi General Store</p>
        </header>

        <section className="bg-white p-6 rounded-lg shadow-md">
          {!beneficiary && !showScanner && (
             <button onClick={startNewScan} className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-green-700">
                START SCAN
             </button>
          )}

          {showScanner && !beneficiary && (
            <>
              <QrReader
                onResult={handleScanResult}
                constraints={{ facingMode: 'environment' }}
                className="w-full"
              />
              <button onClick={() => setShowScanner(false)} className="mt-4 text-gray-800 hover:underline">Cancel</button>
            </>
          )}

          {error && <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

          {beneficiary && (
            <div className="mt-6 text-left">
              <h3 className="font-bold text-lg text-gray-800">Beneficiary Found</h3>
              <div className="p-4 bg-gray-50 rounded-lg mt-2">
                <p className="text-gray-800"><strong>Name:</strong> {beneficiary.name}</p>
                <p className="text-gray-800"><strong>Available Balance:</strong> <span className="font-bold text-xl text-green-600">{beneficiary.balance} RC</span></p>
              </div>
              
              <form onSubmit={handleRedeem} className="mt-6">
                <label htmlFor="amount" className="block text-gray-800 font-medium mb-2">Amount to Redeem</label>
                {/* THIS IS THE FIXED INPUT FIELD */}
                <input 
                    type="number" 
                    id="amount" 
                    value={redeemAmount} 
                    onChange={(e) => setRedeemAmount(e.target.value)} 
                    required 
                    max={beneficiary.balance} 
                    placeholder="e.g., 50" 
                    className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700">
                  CONFIRM REDEMPTION
                </button>
                <button type="button" onClick={startNewScan} className="mt-4 text-gray-800 hover:underline w-full">Scan Another</button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}