import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag, Truck, CreditCard, Shield, Clock, MapPin, Package, FileText, UserCheck } from 'lucide-react';

const faqCategories = [
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    questions: [
      {
        q: "How do I place an order?",
        a: "Browse restaurants, add items to your cart, enter your delivery address, and complete checkout. You'll receive an order confirmation via email."
      },
      {
        q: "Can I change or cancel my order?",
        a: "Orders can be cancelled within 5 minutes of placing if the status is still 'Pending'. Go to 'My Orders' and click 'Cancel Order'. Once confirmed, cancellation is not possible."
      },
      {
        q: "How do I track my order?",
        a: "Go to 'My Orders' and click on your active order. You'll see real-time status updates and driver location when out for delivery."
      }
    ]
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: Truck,
    questions: [
      {
        q: "What are your delivery areas?",
        a: "🍔 Food Delivery: We currently deliver to Verulam and surrounding areas. Standard delivery fee is R20.\n\n📦 Package Delivery: We offer nationwide door-to-door package delivery. Fees are calculated based on distance and package weight."
      },
      {
        q: "How long does delivery take?",
        a: "🍔 Food Delivery: Estimated delivery time is 25-45 minutes depending on restaurant preparation and distance.\n\n📦 Package Delivery: Delivery time depends on distance. Local packages (within 50km): 2-4 hours. Long distance: 1-3 business days."
      },
      {
        q: "Is there a minimum order amount?",
        a: "🍔 Food Delivery: No minimum order amount! However, some promo codes may have minimum order requirements.\n\n📦 Package Delivery: No minimum weight or value requirements."
      }
    ]
  },
  {
    id: 'packages',
    label: 'Package Delivery',
    icon: Package,
    questions: [
      {
        q: "How do I send a package?",
        a: "Go to 'Send a Package' from the navigation menu, fill in pickup and delivery addresses, recipient details, package description, weight, and dimensions. Then proceed to checkout."
      },
      {
        q: "What items can I send?",
        a: "We accept documents, parcels, gifts, and most non-hazardous items. Fragile items require special handling (mark as fragile during booking). Prohibited items include: hazardous materials, weapons, illegal substances, and perishable food items."
      },
      {
        q: "How is package pricing calculated?",
        a: "Pricing is based on:\n• Distance between pickup and delivery\n• Package weight\n• Package dimensions\n• Whether signature is required\n• Fragile item handling\nEstimated prices are shown before booking."
      },
      {
        q: "How do I track my package?",
        a: "After booking, you'll receive a confirmation. Once a driver accepts the delivery, you'll see real-time tracking showing driver location and estimated arrival time in 'My Orders'."
      },
      {
        q: "What happens to my package if no driver accepts?",
        a: "Your package request remains active for up to 1 hour. If no driver accepts, you'll be notified and can reschedule or cancel without penalty. We continuously work to expand our driver network."
      }
    ]
  },
  {
    id: 'payment',
    label: 'Payment',
    icon: CreditCard,
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept Card payments (Visa, Mastercard) and Cash on Delivery for food orders. Package deliveries require online payment before dispatch."
      },
      {
        q: "Is my payment information secure?",
        a: "Yes! All payments are processed through secure payment gateways. We never store your card details."
      },
      {
        q: "Can I use promo codes?",
        a: "Yes! Enter your promo code at checkout. Available codes: WELCOME20 (20% off first order), SAVE10 (10% off), FREEDELIVERY (Free delivery on food orders)."
      }
    ]
  },
  {
    id: 'account',
    label: 'Account',
    icon: Shield,
    questions: [
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' on the login page and enter your details. You'll need an account to place orders and send packages."
      },
      {
        q: "How do I reset my password?",
        a: "Go to login page, click 'Forgot Password', and follow the instructions sent to your email."
      },
      {
        q: "How do I become a delivery driver?",
        a: "Go to the Driver Registration page, fill out the application, and submit required documents for approval. We accept both bike and car drivers."
      }
    ]
  }
];

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  // Format answer with line breaks for better display
  const formattedAnswer = answer.split('\n').map((line, i) => (
    <p key={i} className={i > 0 ? 'mt-2' : ''}>
      {line}
    </p>
  ));

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-4 flex justify-between items-center text-left hover:bg-gray-50 px-4 rounded-lg transition"
      >
        <span className="font-medium text-gray-900">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-green shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 px-4 text-gray-600 whitespace-pre-line">
          {formattedAnswer}
        </div>
      )}
    </div>
  );
};

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState('orders');
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (categoryId, questionIndex) => {
    const key = `${categoryId}-${questionIndex}`;
    setOpenQuestions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentCategory = faqCategories.find(c => c.id === activeCategory);
  const Icon = currentCategory?.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-600">
          Everything you need to know about Lloyd's Delivery - Food &amp; Package Delivery
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {faqCategories.map(category => {
          const CategoryIcon = category.icon;
          const isPackage = category.id === 'packages';
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory === category.id
                  ? isPackage 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CategoryIcon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* FAQ List */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className={`bg-gradient-to-r ${
          activeCategory === 'packages' 
            ? 'from-purple-600 to-purple-500' 
            : 'from-green to-green/80'
        } px-6 py-4`}>
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {currentCategory?.label}
            </h2>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {currentCategory?.questions.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.q}
              answer={faq.a}
              isOpen={openQuestions[`${activeCategory}-${index}`] || false}
              onClick={() => toggleQuestion(activeCategory, index)}
            />
          ))}
        </div>
      </div>

      {/* Package Delivery Promo Banner */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-purple-600" />
          <div>
            <h3 className="font-semibold text-purple-800">Need to send a package?</h3>
            <p className="text-sm text-purple-600">
              Fast, reliable nationwide package delivery. Get a quote in seconds!
            </p>
          </div>
          <a
            href="/package-delivery"
            className="ml-auto bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition whitespace-nowrap"
          >
            Send Now →
          </a>
        </div>
      </div>

      {/* Still Need Help */}
      <div className="mt-10 text-center bg-gray-50 rounded-xl p-8">
        <h3 className="font-semibold text-lg mb-2">Still have questions?</h3>
        <p className="text-gray-600 mb-4">
          Can't find the answer you're looking for? We're here to help!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2 bg-green text-white rounded-lg hover:bg-green/90 transition"
          >
            Contact Support
          </a>
          <a
            href="mailto:support@lloydsdelivery.co.za"
            className="inline-flex items-center justify-center px-6 py-2 border border-green text-green rounded-lg hover:bg-green/10 transition"
          >
            Email Us
          </a>
        </div>
      </div>
    </div>
  );
}