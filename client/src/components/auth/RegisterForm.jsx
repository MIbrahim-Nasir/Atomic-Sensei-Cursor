'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    educationLevel: 'other',
    learningPreferences: {
      preferredContentType: 'mixed',
      preferredLearningTime: 10
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.register({
        ...formData,
        age: parseInt(formData.age, 10)
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="mt-7 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-4 sm:p-7">
          <div className="text-center">
            <h1 className="block text-2xl font-bold text-gray-800">Sign up</h1>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?
              <Link href="/auth/login" className="text-blue-600 hover:underline ml-1">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-5">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-y-4">
                {error && (
                  <div className="text-red-500 text-sm py-2 px-3 rounded bg-red-50">{error}</div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm mb-2">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="py-3 px-4 block w-full border border-gray-200 rounded-lg text-sm"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm mb-2">Email address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="py-3 px-4 block w-full border border-gray-200 rounded-lg text-sm"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm mb-2">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="py-3 px-4 block w-full border border-gray-200 rounded-lg text-sm"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm mb-2">Age</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    min={5}
                    max={100}
                    className="py-3 px-4 block w-full border border-gray-200 rounded-lg text-sm"
                    value={formData.age}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="educationLevel" className="block text-sm mb-2">Education Level</label>
                  <select
                    id="educationLevel"
                    name="educationLevel"
                    className="py-3 px-4 block w-full border border-gray-200 rounded-lg text-sm"
                    value={formData.educationLevel}
                    onChange={handleChange}
                  >
                    <option value="primary">Primary</option>
                    <option value="middle">Middle</option>
                    <option value="high">High School</option>
                    <option value="undergraduate">Undergraduate</option>
                    <option value="graduate">Graduate</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="preferredContentType" className="block text-sm mb-2">
                    Preferred Content Type
                  </label>
                  <select
                    id="preferredContentType"
                    name="learningPreferences.preferredContentType"
                    className="py-3 px-4 block w-full border border-gray-200 rounded-lg text-sm"
                    value={formData.learningPreferences.preferredContentType}
                    onChange={handleChange}
                  >
                    <option value="text">Text</option>
                    <option value="video">Video</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="py-3 px-4 w-full bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}