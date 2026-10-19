'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        router.push('/patients');
        router.refresh();
      } else {
        alert('Failed to create patient');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/patients" className="p-2 rounded-full hover:bg-gray-200 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold leading-6 text-gray-900">New Patient Registration</h1>
          <p className="mt-1 text-sm text-gray-500">Enter the patient&apos;s demographic and contact information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="firstName" className="block text-sm font-medium leading-6 text-gray-900">First name</label>
              <div className="mt-2">
                <input required type="text" name="firstName" id="firstName" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="lastName" className="block text-sm font-medium leading-6 text-gray-900">Last name</label>
              <div className="mt-2">
                <input required type="text" name="lastName" id="lastName" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="dob" className="block text-sm font-medium leading-6 text-gray-900">Date of Birth</label>
              <div className="mt-2">
                <input required type="date" name="dob" id="dob" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="gender" className="block text-sm font-medium leading-6 text-gray-900">Gender</label>
              <div className="mt-2">
                <select required id="gender" name="gender" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="contact" className="block text-sm font-medium leading-6 text-gray-900">Contact Number</label>
              <div className="mt-2">
                <input required type="tel" name="contact" id="contact" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="bloodGroup" className="block text-sm font-medium leading-6 text-gray-900">Blood Group</label>
              <div className="mt-2">
                <select id="bloodGroup" name="bloodGroup" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                  <option value="">Select...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-full">
              <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">Address</label>
              <div className="mt-2">
                <textarea id="address" name="address" rows={3} className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-x-6">
          <Link href="/patients" className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
