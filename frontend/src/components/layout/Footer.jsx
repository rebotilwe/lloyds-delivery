import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-10">
      <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
        
        {/* Brand */}
        <div>
          <h2 className="text-xl font-bold text-green">Lloyd's Delivery</h2>
          <p className="text-sm mt-2 text-gray-300">
            Fast, reliable food delivery at your fingertips.
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li><Link to="/" className="hover:text-green">Home</Link></li>
            <li><Link to="/orders" className="hover:text-green">Orders</Link></li>
            <li><Link to="/faq" className="hover:text-green">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-green">Contact</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold mb-2">Contact</h3>
          <p className="text-sm text-gray-300">support@lloydsdelivery.co.za</p>
          <p className="text-sm text-gray-300">+27 00 000 0000</p>
        </div>

      </div>

      <div className="text-center text-sm py-4 border-t border-gray-700">
        © {new Date().getFullYear()} Lloyd's Delivery. All rights reserved.
      </div>
    </footer>
  );
}