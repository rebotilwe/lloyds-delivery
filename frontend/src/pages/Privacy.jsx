import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Database, Cookie, Mail, Phone, MapPin, Lock, FileText, Users, CreditCard, Bell } from 'lucide-react';

export default function Privacy() {
  const lastUpdated = "23 May 2026";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green/10 rounded-full mb-4">
          <Shield className="w-8 h-8 text-green" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last Updated: {lastUpdated}</p>
        <p className="text-sm text-gray-500 mt-1">Lloyd's Delivery - Protecting your privacy is our priority</p>
      </div>

      <div className="space-y-6">
        {/* Introduction */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green" />
            Introduction
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Welcome to Lloyd's Delivery. We are committed to protecting your personal information and your right to privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our delivery service.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mt-3">
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-green" />
            Information We Collect
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
                <li>Name and contact information (email, phone number, delivery address)</li>
                <li>Account credentials (username, password)</li>
                <li>Payment information (processed securely through our payment partners)</li>
                <li>Order history and preferences</li>
                <li>Delivery instructions and special requests</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Usage Data</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Location data (for delivery purposes)</li>
                <li>Pages visited and time spent on our platform</li>
                <li>Order patterns and preferences</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-green" />
            How We Use Your Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Order Processing</h3>
              <p className="text-gray-600 text-xs">Process and deliver your orders, communicate order status updates</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Account Management</h3>
              <p className="text-gray-600 text-xs">Create and manage your account, provide customer support</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Service Improvement</h3>
              <p className="text-gray-600 text-xs">Analyze usage patterns to improve our service</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Communication</h3>
              <p className="text-gray-600 text-xs">Send order confirmations, delivery updates, and promotional offers</p>
            </div>
          </div>
        </section>

        {/* Information Sharing */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-green" />
            Information Sharing
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            We do not sell your personal information. We may share your information with:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
            <li><span className="font-medium">Restaurants:</span> To prepare your orders (name, order details, special instructions)</li>
            <li><span className="font-medium">Delivery Drivers:</span> To deliver your order (name, address, contact number)</li>
            <li><span className="font-medium">Payment Processors:</span> To securely process payments</li>
            <li><span className="font-medium">Service Providers:</span> Who assist in operating our platform</li>
            <li><span className="font-medium">Legal Authorities:</span> When required by law</li>
          </ul>
        </section>

        {/* Data Security */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-green" />
            Data Security
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            We implement industry-standard security measures to protect your personal information:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
            <li>SSL encryption for data transmission</li>
            <li>Secure storage with restricted access</li>
            <li>Regular security audits and updates</li>
            <li>Two-factor authentication options for accounts</li>
          </ul>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700">
              ⚠️ While we strive to protect your data, no method of transmission over the internet is 100% secure.
            </p>
          </div>
        </section>

        {/* Cookies */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-green" />
            Cookies & Tracking
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            We use cookies and similar tracking technologies to track activity on our platform and hold certain information. 
            Cookies help us remember your preferences, understand how you use our service, and improve your experience.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Essential Cookies</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Functional Cookies</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Analytics Cookies</span>
          </div>
        </section>

        {/* Your Rights */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green" />
            Your Privacy Rights
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            You have the following rights regarding your personal information:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
            <li><span className="font-medium">Access:</span> Request a copy of your personal data</li>
            <li><span className="font-medium">Correction:</span> Update or correct inaccurate information</li>
            <li><span className="font-medium">Deletion:</span> Request deletion of your account and data</li>
            <li><span className="font-medium">Opt-out:</span> Unsubscribe from marketing communications</li>
            <li><span className="font-medium">Data Portability:</span> Receive your data in a structured format</li>
          </ul>
        </section>

        {/* Children's Privacy */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3">Children's Privacy</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. 
            If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
          </p>
        </section>

        {/* Changes to Policy */}
        <section className="bg-white rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3">Changes to This Policy</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page 
            and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        {/* Contact Us */}
        <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5 text-green" />
            Contact Us
          </h2>
          <p className="text-gray-600 text-sm mb-3">
            If you have any questions about this Privacy Policy or your data, please contact us:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-green" />
              <a href="mailto:privacy@lloydsdelivery.co.za" className="text-gray-600 hover:text-green">
                privacy@lloydsdelivery.co.za
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green" />
              <a href="tel:+27000000000" className="text-gray-600 hover:text-green">
                +27 00 000 0000
              </a>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green" />
              <span className="text-gray-600">Verulam, South Africa</span>
            </div>
          </div>
        </section>

        {/* Back to Home */}
        <div className="text-center pt-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-green hover:underline text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}