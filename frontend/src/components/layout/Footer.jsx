import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Shield, Clock } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Footer() {
  return (
    <footer className="text-white" style={{ backgroundColor: '#1B3A5C' }}>
      {/* Payment Methods Bar */}
      <div className="border-b border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Secure payments powered by Yoco
            </span>
            <span className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5 brightness-0 invert opacity-70" />
            </span>
            <span className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 brightness-0 invert opacity-70" />
            </span>
            <span className="flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="Amex" className="h-5 brightness-0 invert opacity-70" />
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              SSL Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-white rounded-xl p-1 flex items-center justify-center">
                <img
                  src={logo}
                  alt="Lloyd's Delivery"
                  className="h-14 w-auto object-contain"
                />
              </div>
              <span className="font-bold text-white text-lg">Lloyd's Delivery</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Fast delivery for food, packages, and documents across South Africa.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Delivering 7 days a week</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</p>
            <div className="space-y-2.5">
              <Link to="/"        className="block text-sm text-gray-400 hover:text-green transition">Home</Link>
              <Link to="/orders"  className="block text-sm text-gray-400 hover:text-green transition">My Orders</Link>
              <Link to="/contact" className="block text-sm text-gray-400 hover:text-green transition">Contact Us</Link>
              <Link to="/faq"     className="block text-sm text-gray-400 hover:text-green transition">FAQ</Link>
              {/* Help Centre added here */}
              <Link to="/help"    className="block text-sm text-gray-400 hover:text-green transition">Help Centre</Link>
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Services</p>
            <div className="space-y-2.5">
              <Link to="/"                className="block text-sm text-gray-400 hover:text-green transition">Food Delivery</Link>
              <Link to="/package-delivery" className="block text-sm text-gray-400 hover:text-green transition">Package Delivery</Link>
              <Link to="/package-delivery" className="block text-sm text-gray-400 hover:text-green transition">Document Delivery</Link>
            </div>
          </div>

          {/* Legal & Cards */}
          <div>
            <p className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</p>
            <div className="space-y-2.5 mb-5">
              <Link to="/privacy" className="block text-sm text-gray-400 hover:text-green transition">Privacy Policy</Link>
              <Link to="/faq"     className="block text-sm text-gray-400 hover:text-green transition">Terms of Service</Link>
            </div>

            {/* Yoco card logos — client requirement, kept exactly */}
            <p className="text-xs text-gray-500 mb-2">We accept</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-white rounded px-2 py-1">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
              </div>
              <div className="bg-white rounded px-2 py-1">
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
              </div>
              <div className="bg-white rounded px-2 py-1">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" alt="Amex" className="h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Lloyds Delivery. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Built by <span className="text-green font-medium">Kasi Digital Connect</span>
          </p>
        </div>
      </div>
    </footer>
  );
}