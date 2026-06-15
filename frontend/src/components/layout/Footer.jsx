import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Heart, Clock, Package, CreditCard, Shield, Lock } from 'lucide-react';

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
              Fast, reliable <span className="text-green">food</span> &amp; <span className="text-purple-400">package delivery</span> at your fingertips. 
              Serving Verulam for food, and nationwide for parcels.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>Verulam, South Africa (Nationwide packages)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-base mb-3 text-center sm:text-left">Quick Links</h3>
            <ul className="space-y-2 text-sm text-center sm:text-left">
              <li><Link to="/" className="text-gray-300 hover:text-green transition inline-block">Home</Link></li>
              <li><Link to="/orders" className="text-gray-300 hover:text-green transition inline-block">My Orders</Link></li>
              <li><Link to="/package-delivery" className="text-gray-300 hover:text-green transition inline-block flex items-center justify-center sm:justify-start gap-1">
                <Package className="w-3 h-3 text-purple-400" />
                Send a Package
              </Link></li>
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

          {/* Payment Trust Badges Section */}
          <div>
            <h3 className="font-semibold text-base mb-3 text-center sm:text-left">Secure Payments</h3>
            
            {/* Payment Methods Grid */}
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <Lock className="w-3 h-3 text-green" />
                <span className="text-xs text-gray-300">100% Secure Payments</span>
              </div>
              
              {/* Payment Logos Grid - 2x2 on mobile, flexible on desktop */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Visa */}
                <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                  <svg className="h-6 w-auto" viewBox="0 0 141 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="141" height="45" rx="4" fill="#1A1F71"/>
                    <path d="M53.5 15.5H47.8L44.2 29.5H49.9L53.5 15.5Z" fill="white"/>
                    <path d="M92.1 16.2C90.9 15.7 89.2 15.2 87.3 15.2C81.7 15.2 77.7 18.2 77.7 22.4C77.7 25.5 80.4 27.2 82.4 28.2C84.4 29.2 85.2 29.8 85.2 30.6C85.2 31.8 83.7 32.3 82.3 32.3C80.2 32.3 79.1 31.9 77.5 31.2L76.6 30.8L75.7 35.2C77.1 35.9 79.5 36.5 82 36.5C87.9 36.5 91.9 33.6 91.9 29.1C91.9 26.4 90.1 24.9 87.5 23.7C85.5 22.8 84.5 22.2 84.5 21.2C84.5 20.3 85.5 19.4 87.3 19.4C89.1 19.4 90.4 19.8 91.5 20.3L92.3 20.7L93.2 16.6L92.1 16.2Z" fill="white"/>
                    <path d="M108.5 15.5H103.9C102.9 15.5 102.1 15.9 101.7 16.8L94.3 29.5H100.4L101.2 27.6H107.9L108.5 29.5H113.9L108.5 15.5ZM103.3 23.4L105.7 18.2L107.2 23.4H103.3Z" fill="white"/>
                    <path d="M67.1 15.5L62.7 29.5H57.4L61.8 15.5H67.1Z" fill="white"/>
                    <path d="M127.2 24.9L130.5 18.5H125.4L123.6 22.8L122.9 20.8C122.3 19.3 121.1 18.6 119.6 18.5H115.1L114.8 19.5C117.3 20.1 119.2 21.3 120.1 23.3L122.6 29.5H128.1L131.9 18.5H127.7L127.2 24.9Z" fill="white"/>
                    <path d="M141 15.5H136.4C135.4 15.5 134.6 15.9 134.2 16.8L126.8 29.5H132.9L133.7 27.6H140.4L141 29.5H146.4L141 15.5ZM135.8 23.4L138.2 18.2L139.7 23.4H135.8Z" fill="white"/>
                  </svg>
                </div>
                
                {/* Mastercard */}
                <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                  <svg className="h-6 w-auto" viewBox="0 0 131 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="131" height="45" rx="4" fill="white"/>
                    <circle cx="49" cy="22.5" r="11" fill="#EB001B"/>
                    <circle cx="82" cy="22.5" r="11" fill="#F79E1B"/>
                    <path d="M74 22.5C74 26.5 77 29.5 81 30.7C79 32.5 76 33.5 73 33.5C65.5 33.5 59.5 27.5 59.5 20C59.5 12.5 65.5 6.5 73 6.5C76 6.5 79 7.5 81 9.3C77 10.5 74 13.5 74 17.5V22.5Z" fill="#FF5F00"/>
                  </svg>
                </div>
                
                {/* 3D Secure */}
                <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                  <svg className="h-6 w-auto" viewBox="0 0 120 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="45" rx="4" fill="#E31837"/>
                    <text x="15" y="28" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="white">3D</text>
                    <text x="40" y="28" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="white">SECURE</text>
                    <path d="M90 18 L105 18 L105 27 L90 27 Z" fill="white"/>
                    <circle cx="97.5" cy="22.5" r="3" fill="#E31837"/>
                  </svg>
                </div>
                
                {/* Secure Online Payments */}
                <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                  <svg className="h-6 w-auto" viewBox="0 0 140 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="140" height="45" rx="4" fill="#2B6B2D"/>
                    <path d="M15 15 L15 30 L35 30 L35 15 L15 15Z" fill="white"/>
                    <circle cx="25" cy="22.5" r="4" fill="#2B6B2D"/>
                    <text x="45" y="28" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="white">SECURE</text>
                    <text x="45" y="36" fontFamily="Arial, sans-serif" fontSize="8" fill="#C8E6C9">Online Payments</text>
                  </svg>
                </div>
                
                {/* American Express */}
                <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                  <svg className="h-6 w-auto" viewBox="0 0 130 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="130" height="45" rx="4" fill="#006FCF"/>
                    <text x="15" y="28" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="white">AMERICAN</text>
                    <text x="70" y="28" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="white">EXPRESS</text>
                  </svg>
                </div>
                
                {/* Yoco */}
                <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                  <svg className="h-6 w-auto" viewBox="0 0 100 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="45" rx="4" fill="#00A3E0"/>
                    <text x="20" y="28" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="16" fill="white">Yoco</text>
                  </svg>
                </div>
              </div>
              
              {/* Security Badges Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 pt-2 border-t border-white/20">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green" />
                  <span className="text-[10px] text-gray-300">PCI DSS Compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-green" />
                  <span className="text-[10px] text-gray-300">256-bit SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-green" />
                  <span className="text-[10px] text-gray-300">Fraud Protection</span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center sm:text-left mt-2">
              Powered by <span className="text-green">Yoco</span> Payment Gateway
            </p>
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
            <span>•</span>
            <Link to="/package-delivery" className="hover:text-purple-400 transition">Send Package</Link>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
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