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
            <li><Link to="/" className="hover:text-green transition">Home</Link></li>
            <li><Link to="/orders" className="hover:text-green transition">Orders</Link></li>
            <li><Link to="/faq" className="hover:text-green transition">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-green transition">Contact</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold mb-2">Contact</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <a href="mailto:support@lloydsdelivery.co.za" className="text-gray-300 hover:text-green transition">
                support@lloydsdelivery.co.za
              </a>
            </li>
            <li>
              <a href="tel:+27000000000" className="text-gray-300 hover:text-green transition">
                +27 00 000 0000
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar - Copyright & Development Credit */}
      <div className="text-center text-sm py-4 border-t border-gray-700">
        <p>© {new Date().getFullYear()} Lloyd's Delivery. All rights reserved.</p>
        <p className="text-gray-400 text-xs mt-1">
          Developed by{' '}
          <a 
            href="https://afribizconnect.co.za" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green hover:underline transition"
          >
            Afribiz Connect
          </a>
        </p>
      </div>
    </footer>
  );
}