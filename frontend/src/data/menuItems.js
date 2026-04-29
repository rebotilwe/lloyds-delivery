export const mockMenuItems = {
  1: [ // Burger Palace
    { id: 101, restaurant_id: 1, name: 'Classic Cheeseburger', description: 'Beef patty, cheddar cheese, lettuce, tomato, onion, pickles', price: 65.00, category: 'Burgers', is_available: true, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop' },
    { id: 102, restaurant_id: 1, name: 'Double Bacon Burger', description: 'Double beef, bacon, double cheese, special sauce', price: 85.00, category: 'Burgers', is_available: true, image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=200&h=200&fit=crop' },
    { id: 103, restaurant_id: 1, name: 'Chicken Burger', description: 'Grilled chicken breast, lettuce, mayo', price: 70.00, category: 'Burgers', is_available: true },
    { id: 104, restaurant_id: 1, name: 'French Fries', description: 'Crispy golden fries', price: 30.00, category: 'Sides', is_available: true },
    { id: 105, restaurant_id: 1, name: 'Onion Rings', description: 'Crispy battered onion rings', price: 35.00, category: 'Sides', is_available: true },
  ],
  2: [ // Pizza Heaven
    { id: 201, restaurant_id: 2, name: 'Margherita Pizza', description: 'Tomato sauce, fresh mozzarella, basil', price: 90.00, category: 'Pizzas', is_available: true, image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&h=200&fit=crop' },
    { id: 202, restaurant_id: 2, name: 'Pepperoni Pizza', description: 'Tomato sauce, mozzarella, pepperoni', price: 110.00, category: 'Pizzas', is_available: true },
    { id: 203, restaurant_id: 2, name: 'BBQ Chicken Pizza', description: 'BBQ sauce, chicken, red onion, cilantro', price: 120.00, category: 'Pizzas', is_available: true },
    { id: 204, restaurant_id: 2, name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 25.00, category: 'Sides', is_available: true },
  ],
  3: [ // Sushi Master
    { id: 301, restaurant_id: 3, name: 'California Roll', description: 'Crab, avocado, cucumber', price: 75.00, category: 'Maki Rolls', is_available: true, image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&h=200&fit=crop' },
    { id: 302, restaurant_id: 3, name: 'Spicy Tuna Roll', description: 'Tuna, spicy mayo, cucumber', price: 85.00, category: 'Maki Rolls', is_available: true },
    { id: 303, restaurant_id: 3, name: 'Salmon Nigiri', description: 'Fresh salmon over rice', price: 45.00, category: 'Nigiri', is_available: true },
    { id: 304, restaurant_id: 3, name: 'Miso Soup', description: 'Traditional Japanese soup', price: 30.00, category: 'Soups', is_available: true },
  ],
  4: [ // Taco Fiesta
    { id: 401, restaurant_id: 4, name: 'Chicken Tacos', description: '3 soft tacos with grilled chicken', price: 80.00, category: 'Tacos', is_available: true, image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=200&h=200&fit=crop' },
    { id: 402, restaurant_id: 4, name: 'Beef Burrito', description: 'Large burrito with seasoned beef, beans, rice', price: 95.00, category: 'Burritos', is_available: true },
    { id: 403, restaurant_id: 4, name: 'Quesadilla', description: 'Grilled tortilla with melted cheese', price: 70.00, category: 'Quesadillas', is_available: true },
    { id: 404, restaurant_id: 4, name: 'Guacamole & Chips', description: 'Fresh guacamole with tortilla chips', price: 45.00, category: 'Sides', is_available: true },
  ],
  5: [ // Indian Spice
    { id: 501, restaurant_id: 5, name: 'Butter Chicken', description: 'Creamy tomato curry with chicken', price: 95.00, category: 'Curries', is_available: true, image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop' },
    { id: 502, restaurant_id: 5, name: 'Lamb Rogan Josh', description: 'Kashmiri lamb curry', price: 110.00, category: 'Curries', is_available: true },
    { id: 503, restaurant_id: 5, name: 'Garlic Naan', description: 'Fresh baked naan bread with garlic', price: 20.00, category: 'Breads', is_available: true },
    { id: 504, restaurant_id: 5, name: 'Biryani Rice', description: 'Fragrant basmati rice with spices', price: 45.00, category: 'Rice', is_available: true },
  ],
  6: [ // Healthy Bowl
    { id: 601, restaurant_id: 6, name: 'Buddha Bowl', description: 'Quinoa, roasted veggies, avocado, tahini', price: 85.00, category: 'Bowls', is_available: true, image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop' },
    { id: 602, restaurant_id: 6, name: 'Berry Smoothie', description: 'Mixed berries, banana, almond milk', price: 50.00, category: 'Drinks', is_available: true },
    { id: 603, restaurant_id: 6, name: 'Greek Salad', description: 'Feta, olives, cucumber, tomato', price: 65.00, category: 'Salads', is_available: true },
  ],
  7: [ // Chinese Wok
    { id: 701, restaurant_id: 7, name: 'Kung Pao Chicken', description: 'Spicy stir-fry with peanuts and vegetables', price: 85.00, category: 'Main', is_available: true },
    { id: 702, restaurant_id: 7, name: 'Fried Rice', description: 'Egg fried rice with vegetables', price: 45.00, category: 'Rice', is_available: true },
    { id: 703, restaurant_id: 7, name: 'Spring Rolls', description: 'Crispy vegetable spring rolls', price: 35.00, category: 'Appetizers', is_available: true },
  ],
  8: [ // Fast Fired
    { id: 801, restaurant_id: 8, name: 'Chicken Strips', description: 'Crispy chicken strips with dipping sauce', price: 55.00, category: 'Chicken', is_available: true },
    { id: 802, restaurant_id: 8, name: 'Milkshake', description: 'Thick and creamy milkshake', price: 35.00, category: 'Drinks', is_available: true },
    { id: 803, restaurant_id: 8, name: 'Corn Dog', description: 'Classic corn dog', price: 25.00, category: 'Snacks', is_available: true },
  ],
};