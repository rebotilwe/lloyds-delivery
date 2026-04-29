import React from 'react';
import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-navy mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Link to="/" className="bg-green text-white px-6 py-2 rounded-lg hover:bg-green-600">
          Go Home
        </Link>
      </div>
    </div>
  );
}