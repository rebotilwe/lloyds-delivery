import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Heart, Clock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white mt-10">
      <div className="container mx-auto px-4 py-8 sm:py-10">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* Brand Section */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
              <span className="text-3xl">🍔</span>
              <h2 className="text-xl font-bold text-green">Lloyd's Delivery</h2>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Fast, reliable food delivery at your fingertips. Serving Verulam and surrounding areas.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>Verulam, South Africa</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-base mb-3 text-center sm:text-left">Quick Links</h3>
            <ul className="space-y-2 text-sm text-center sm:text-left">
              <li><Link to="/" className="text-gray-300 hover:text-green transition inline-block">Home</Link></li>
              <li><Link to="/orders" className="text-gray-300 hover:text-green transition inline-block">My Orders</Link></li>
              <li><Link to="/faq" className="text-gray-300 hover:text-green transition inline-block">FAQ</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-green transition inline-block">Contact Us</Link></li>
              <li><Link to="/privacy" className="text-gray-300 hover:text-green transition inline-block">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-base mb-3 text-center sm:text-left">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-center sm:justify-start gap-3">
                <Mail className="w-4 h-4 text-green shrink-0" />
                <a href="mailto:support@lloydsdelivery.co.za" className="text-gray-300 hover:text-green transition break-all">
                  support@lloydsdelivery.co.za
                </a>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-3">
                <Phone className="w-4 h-4 text-green shrink-0" />
                <a href="tel:+27000000000" className="text-gray-300 hover:text-green transition">
                  +27 00 000 0000
                </a>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-3">
                <Clock className="w-4 h-4 text-green shrink-0" />
                <span className="text-gray-300">Mon-Sun: 9am - 9pm</span>
              </li>
            </ul>
          </div>

          {/* Social & Delivery Info - Using simple text links instead of icons */}
          <div>
            <h3 className="font-semibold text-base mb-3 text-center sm:text-left">Follow Us</h3>
            <div className="flex items-center justify-center sm:justify-start gap-4 mb-4 text-sm">
              <a href="#" className="text-gray-300 hover:text-green transition">Facebook</a>
              <a href="#" className="text-gray-300 hover:text-green transition">Twitter</a>
              <a href="#" className="text-gray-300 hover:text-green transition">Instagram</a>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-300 text-center sm:text-left">
                <span className="font-semibold text-green">Delivery Areas:</span> Verulam and surrounding suburbs
              </p>
              <p className="text-xs text-gray-400 mt-1 text-center sm:text-left">
                Standard delivery fee: R20
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-6 pt-4 text-center">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
            <p className="text-gray-400">
              © {currentYear} Lloyd's Delivery. All rights reserved.
            </p>
            <p className="text-gray-400">
              Developed with <Heart className="w-3 h-3 inline text-red-500 fill-red-500" /> by{' '}
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
          
          <div className="flex flex-wrap justify-center gap-3 mt-3 text-[11px] text-gray-500 sm:hidden">
            <Link to="/privacy" className="hover:text-green transition">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-green transition">Terms</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-green transition">Support</Link>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-4 right-4 bg-green text-navy p-2 rounded-full shadow-lg hover:bg-green/90 transition z-40 md:hidden"
        aria-label="Back to top"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </footer>
  );
}