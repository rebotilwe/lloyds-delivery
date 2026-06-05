import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, Package, Truck, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);
    
    // Simulate sending email (replace with actual API call)
    setTimeout(() => {
      toast.success('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '', inquiryType: 'general' });
      setSending(false);
    }, 1500);
  };

  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry', icon: HelpCircle },
    { value: 'food-order', label: 'Food Order Issue', icon: Truck },
    { value: 'package-delivery', label: 'Package Delivery', icon: Package },
    { value: 'driver-application', label: 'Driver Application', icon: Truck },
    { value: 'partner', label: 'Become a Partner (Restaurant)', icon: MapPin },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">Contact Us</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Have questions about food delivery, package shipping, or our service? We're here to help!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Contact Information */}
        <div className="space-y-6">
          <div className="bg-green/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-navy mb-4">Get in Touch</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green mt-0.5" />
                <div>
                  <p className="font-semibold">Head Office</p>
                  <p className="text-gray-600">Verulam, South Africa</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-green mt-0.5" />
                <div>
                  <p className="font-semibold">Phone</p>
                  <a href="tel:+27000000000" className="text-gray-600 hover:text-green">
                    +27 00 000 0000
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green mt-0.5" />
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:support@lloydsdelivery.co.za" className="text-gray-600 hover:text-green">
                    support@lloydsdelivery.co.za
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-green mt-0.5" />
                <div>
                  <p className="font-semibold">Support Hours</p>
                  <p className="text-gray-600">Monday - Friday: 9am - 8pm</p>
                  <p className="text-gray-600">Saturday - Sunday: 10am - 6pm</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Food Delivery Card */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-800">Food Delivery</h3>
              </div>
              <p className="text-xs text-gray-600">
                Verulam & surrounding areas
              </p>
              <p className="text-xs font-medium text-orange-600 mt-2">
                Fee: R20 flat rate
              </p>
            </div>

            {/* Package Delivery Card */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-800">Package Delivery</h3>
              </div>
              <p className="text-xs text-gray-600">
                Nationwide door-to-door
              </p>
              <p className="text-xs font-medium text-purple-600 mt-2">
                Fees calculated by distance
              </p>
            </div>
          </div>

          {/* Emergency/Urgent Contact */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">🚚 Urgent Delivery Issues?</h3>
            <p className="text-sm text-gray-600 mb-2">
              For immediate assistance with active deliveries:
            </p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-600" />
              <a href="tel:+27000000000" className="text-red-600 font-medium hover:underline">
                Call our support hotline
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Available 24/7 for urgent delivery issues
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-navy mb-4">Send us a Message</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inquiry Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Inquiry Type *</label>
              <select
                name="inquiryType"
                value={formData.inquiryType}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/50"
              >
                {inquiryTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email Address *</label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <Input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief description of your issue"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <Textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Please provide details about your inquiry..."
                rows={5}
                className="w-full"
              />
            </div>

            {/* Package Delivery Quick Link */}
            {formData.inquiryType === 'package-delivery' && (
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-700">
                  💡 For instant package delivery quotes and tracking, visit our 
                  <a href="/package-delivery" className="font-medium underline ml-1">Package Delivery page</a>
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-green hover:bg-green/90 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-gray-400">
            <p>We typically respond within 24 hours</p>
          </div>
        </div>
      </div>

      {/* Support Options */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="/faq"
          className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <HelpCircle className="w-5 h-5 text-green" />
          <span className="text-sm font-medium">Visit FAQ</span>
        </a>
        <a
          href="mailto:support@lloydsdelivery.co.za"
          className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <Mail className="w-5 h-5 text-green" />
          <span className="text-sm font-medium">support@lloydsdelivery.co.za</span>
        </a>
        <a
          href="/package-delivery"
          className="flex items-center justify-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
        >
          <Package className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Send a Package</span>
        </a>
      </div>
    </div>
  );
}