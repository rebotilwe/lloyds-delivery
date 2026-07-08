import React from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-6">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-green rounded-lg flex items-center justify-center">
                <Truck className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Lloyds Delivery</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Fast delivery for food, packages, and documents across South Africa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Quick Links</p>
            <div className="space-y-2">
              <Link to="/"        className="block text-xs text-gray-500 hover:text-green transition">Home</Link>
              <Link to="/help"    className="block text-xs text-gray-500 hover:text-green transition">Help Centre</Link>
              <Link to="/contact" className="block text-xs text-gray-500 hover:text-green transition">Contact Us</Link>
              <Link to="/faq"     className="block text-xs text-gray-500 hover:text-green transition">FAQ</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Legal</p>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-xs text-gray-500 hover:text-green transition">Privacy Policy</Link>
              <Link to="/faq"     className="block text-xs text-gray-500 hover:text-green transition">Terms of Service</Link>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Lloyds Delivery. All rights reserved.</p>
          <p className="text-xs text-gray-400">Built by <span className="text-green font-medium">Kasi Digital Connect</span></p>
        </div>
      </div>
    </footer>
  );
}