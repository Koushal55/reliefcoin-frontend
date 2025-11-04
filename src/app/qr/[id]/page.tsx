'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import QRCode from "react-qr-code";

interface UserInfo {
  name: string;
}

export default function QrDisplayPage() {
  const params = useParams();
  const userId = params.id as string; // Get the ID from the URL
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      const fetchUserInfo = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/public/user/${userId}`);
          if (!res.ok) throw new Error('Could not find beneficiary details.');
          const data = await res.json();
          setUserInfo(data);
        } catch (err: any) {
          setError(err.message);
        }
      };
      fetchUserInfo();
    }
  }, [userId]);

  return (
    <main className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Secure ReliefCoin QR Code</h1>
        {error && <p className="text-red-500">{error}</p>}
        {userInfo && <p className="text-lg text-gray-600 mb-6">For: {userInfo.name}</p>}

        {userId ? (
          <div style={{ background: 'white', padding: '16px' }}>
            <QRCode
              value={userId} // The QR code's value is the User ID
              className="mx-auto"
            />
          </div>
        ) : (
          <p>Loading QR Code...</p>
        )}
        
        <p className="mt-6 text-sm text-gray-500">
          Instructions: Show this QR code to a verified vendor to redeem your aid.
        </p>
      </div>
    </main>
  );
}