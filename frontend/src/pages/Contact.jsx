import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
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
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">Contact Us</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Have questions about your order, delivery, or our service? We're here to help!
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
                  <p className="font-semibold">Address</p>
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

          {/* Quick Info */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold text-navy mb-3">Delivery Areas</h3>
            <p className="text-gray-600 text-sm mb-2">
              We currently deliver to <span className="font-medium">Verulam</span> and surrounding areas.
            </p>
            <p className="text-gray-600 text-sm">
              📍 Delivery fee: <span className="font-medium">R20 (Standard rate)</span>
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-navy mb-4">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Order issue, delivery question, etc."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <Textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                rows={5}
                className="w-full"
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-green hover:bg-green/90 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}