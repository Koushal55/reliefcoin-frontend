'use client';
import { useRouter } from 'next/navigation';
import router from 'next/router';

import { useState, FormEvent } from 'react';

export default function RegisterPage() {
  // State for each form field
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('donor'); // <-- Default role is now beneficiary
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Failed to register');
      }

      
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login'; // Redirect to login page after 2 seconds
      }, 2000);
      // Reset form
      setName('');
      setEmail('');
      setPassword('');

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Create a New Account</h1>

        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-900 font-medium mb-2">Full Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-900 font-medium mb-2">Email Address</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-900 font-medium mb-2">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 border border-gray-300 rounded-lg text-gray-900" />
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700">
            Register
          </button>
        </form>

        {/* Display success or error messages */}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-center">{error}</p>}
        {success && <p className="text-green-600 bg-green-100 p-3 rounded-lg mt-4 text-center">{success}</p>}

      </div>
    </main>
  );
}