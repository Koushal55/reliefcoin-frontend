'use client';

import { useState, FormEvent } from 'react';
import { jwtDecode } from 'jwt-decode'; // Note the import style

// Define the structure of the decoded token
interface DecodedToken {
  user: {
    id: string;
    role: string;
  };
  iat: number;
  exp: number;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Login failed');
      }

      // 1. Save the token to localStorage
      localStorage.setItem('relief-token', data.token);

      // 2. Decode the token to get the user's role
      const decoded = jwtDecode<DecodedToken>(data.token);
      const userRole = decoded.user.role;

      alert('Login Successful!');

      // 3. Redirect based on role
      if (userRole === 'ngo') {
        window.location.href = '/'; // Redirect to NGO Dashboard
      } else if (userRole === 'vendor') {
        window.location.href = '/vendor'; // Redirect to Vendor Portal
      } else {
        // Redirect donors to the transparency page or a future donor dashboard
        window.location.href = '/transparency'; 
      }

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Welcome Back</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email Address</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700">
            Log In
          </button>
        </form>

        {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-center">{error}</p>}

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">Register here</a>
        </p>
      </div>
    </main>
  );
}