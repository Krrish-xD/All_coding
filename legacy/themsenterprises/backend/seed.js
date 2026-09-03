const mongoose = require('mongoose');
const { Product, User } = require('./models');
const { seedDefaultCustomizations } = require('./seed/seedCustomizations');
const { updateProductsWithDefaults } = require('./seed/updateProductsWithCustomizations');
const { migrateProductCustomizations } = require('./seed/migrateProductCustomizations');
const { migratePriceModifier } = require('./seed/migratePriceModifier');
require('dotenv').config();

const sampleProducts = [
  {
    name: 'Award-Recognition Badges',
    description: 'Premium Award-Recognition Badges from Jaksh. High-quality customization options available.',
    price: 21.27,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Award-Recognition%20Badges%20/jaksh-image-1.webp"],
    category: 'Batches and recognition',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","batches","recognition","award-recognition","badges"]
  },
  {
    name: 'Magnetic Name Tags',
    description: 'Premium Magnetic Name Tags from Jaksh. High-quality customization options available.',
    price: 6.08,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Magnetic%20Name%20Tags/jaksh-image-2.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Magnetic%20Name%20Tags/jaksh-image-3.webp"],
    category: 'Batches and recognition',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","batches","recognition","magnetic","name","tags"]
  },
  {
    name: 'Metal Badges',
    description: 'Premium Metal Badges from Jaksh. High-quality customization options available.',
    price: 20.93,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Metal%20Badges/jaksh-image-4.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Metal%20Badges/jaksh-image-5.webp"],
    category: 'Batches and recognition',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","batches","recognition","metal","badges"]
  },
  {
    name: 'Plastic Badges',
    description: 'Premium Plastic Badges from Jaksh. High-quality customization options available.',
    price: 20.31,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Plastic%20Badges/jaksh-image-6.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Plastic%20Badges/jaksh-image-7.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Batches%20and%20recognition/Plastic%20Badges/jaksh-image-8.webp"],
    category: 'Batches and recognition',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","batches","recognition","plastic","badges"]
  },
  {
    name: 'Custom Message Frames',
    description: 'Premium Custom Message Frames from Jaksh. High-quality customization options available.',
    price: 58.76,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/%20CUSTOM%20MESSAGE%20Frames/jaksh-image-10.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/%20CUSTOM%20MESSAGE%20Frames/jaksh-image-11.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/%20CUSTOM%20MESSAGE%20Frames/jaksh-image-12.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/%20CUSTOM%20MESSAGE%20Frames/jaksh-image-9.webp"],
    category: 'Caricature and Frames',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","caricature","frames","custom","message"]
  },
  {
    name: 'Custom Caricatures Stand',
    description: 'Premium Custom Caricatures Stand from Jaksh. High-quality customization options available.',
    price: 64.93,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-13.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-14.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-15.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-16.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-17.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-18.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/CUSTOM%20Caricatures%20STAND/jaksh-image-19.webp"],
    category: 'Caricature and Frames',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","caricature","frames","custom","caricatures","stand"]
  },
  {
    name: 'Caricature Phone Stand',
    description: 'Premium Caricature Phone Stand from Jaksh. High-quality customization options available.',
    price: 51.71,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-20.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-21.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-22.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-23.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-24.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-25.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-26.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-27.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-28.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-29.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-30.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-31.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-32.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-33.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-34.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-35.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-36.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-37.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-38.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Caricature%20Phone%20Stand/jaksh-image-39.webp"],
    category: 'Caricature and Frames',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","caricature","frames","phone","stand"]
  },
  {
    name: 'Neon Led',
    description: 'Premium Neon Led from Jaksh. High-quality customization options available.',
    price: 69.63,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Neon%20LED/jaksh-image-40.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Neon%20LED/jaksh-image-41.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Neon%20LED/jaksh-image-42.webp"],
    category: 'Caricature and Frames',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","caricature","frames","neon","led"]
  },
  {
    name: 'Photo Bouquet',
    description: 'Premium Photo Bouquet from Jaksh. High-quality customization options available.',
    price: 55.83,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20Bouquet/jaksh-image-43.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20Bouquet/jaksh-image-44.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20Bouquet/jaksh-image-45.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20Bouquet/jaksh-image-46.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20Bouquet/jaksh-image-47.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20Bouquet/jaksh-image-48.webp"],
    category: 'Caricature and Frames',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","caricature","frames","photo","bouquet"]
  },
  {
    name: 'Photo Puzzle',
    description: 'Premium Photo Puzzle from Jaksh. High-quality customization options available.',
    price: 23.3,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20puzzle/jaksh-image-49.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20puzzle/jaksh-image-50.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20puzzle/jaksh-image-51.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20puzzle/jaksh-image-52.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20puzzle/jaksh-image-53.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Caricature%20and%20Frames%20/Photo%20puzzle/jaksh-image-54.webp"],
    category: 'Caricature and Frames',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","caricature","frames","photo","puzzle"]
  },
  {
    name: 'Mugs',
    description: 'Premium Mugs from Jaksh. Perfect for customization with logos, text, or images. High-quality and durable.',
    price: 24.73,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-55.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-56.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-57.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-58.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-59.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-60.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-61.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-62.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Mugs/jaksh-image-63.webp"],
    category: 'Drinkware',
    stock: 150,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days","availableColors":["White","Black","Red","Blue","Green"],"availableSizes":["Standard"]},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","drinkware","mugs"]
  },
  {
    name: 'Stanleys',
    description: 'Premium Stanleys from Jaksh. Perfect for customization with logos, text, or images. High-quality and durable.',
    price: 29.86,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Stanleys/jaksh-image-64.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Stanleys/jaksh-image-65.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Stanleys/jaksh-image-66.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Stanleys/jaksh-image-67.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Stanleys/jaksh-image-68.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Stanleys/jaksh-image-69.webp"],
    category: 'Drinkware',
    stock: 150,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days","availableColors":["White","Black","Red","Blue","Green"],"availableSizes":["Standard"]},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","drinkware","stanleys"]
  },
  {
    name: 'Tumblers And Sippers',
    description: 'Premium Tumblers And Sippers from Jaksh. Perfect for customization with logos, text, or images. High-quality and durable.',
    price: 30.75,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Tumblers%20and%20Sippers/jaksh-image-70.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Tumblers%20and%20Sippers/jaksh-image-71.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Tumblers%20and%20Sippers/jaksh-image-72.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Tumblers%20and%20Sippers/jaksh-image-73.webp"],
    category: 'Drinkware',
    stock: 150,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days","availableColors":["White","Black","Red","Blue","Green"],"availableSizes":["Standard"]},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","drinkware","tumblers","sippers"]
  },
  {
    name: 'Water Bottle',
    description: 'Premium Water Bottle from Jaksh. Perfect for customization with logos, text, or images. High-quality and durable.',
    price: 37.81,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Water%20bottle/jaksh-image-74.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Water%20bottle/jaksh-image-75.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Drinkware/Water%20bottle/jaksh-image-76.webp"],
    category: 'Drinkware',
    stock: 150,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days","availableColors":["White","Black","Red","Blue","Green"],"availableSizes":["Standard"]},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","drinkware","water","bottle"]
  },
  {
    name: 'Badges',
    description: 'Premium Badges from Jaksh. High-quality customization options available.',
    price: 36.42,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-77.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-78.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-79.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-80.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-81.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-82.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-83.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-84.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-85.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-86.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-87.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-88.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-89.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-90.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-91.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-92.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-93.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-94.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-95.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-96.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-97.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Badges/jaksh-image-98.webp"],
    category: 'Events',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","events","badges"]
  },
  {
    name: 'Wrist Band',
    description: 'Premium Wrist Band from Jaksh. High-quality customization options available.',
    price: 12.1,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Wrist%20Band/Promotional-Custom-Wedding-Party-Polyester-Cloth-Satin-Bracelet-Party-Thick-Satin-Wristband-With-Reusable-Lock.jpg_300x300.avif","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Wrist%20Band/jaksh-image-100.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Wrist%20Band/jaksh-image-101.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Wrist%20Band/jaksh-image-102.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Wrist%20Band/jaksh-image-103.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Events/Wrist%20Band/jaksh-image-99.webp"],
    category: 'Events',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","events","wrist","band"]
  },
  {
    name: 'Employee Welcome Gift',
    description: 'Premium Employee Welcome Gift from Jaksh. High-quality customization options available.',
    price: 65.88,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/KITS%20AND%20GIFTS/EMPLOYEE%20WELCOME%20GIFT/jaksh-image-103.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/KITS%20AND%20GIFTS/EMPLOYEE%20WELCOME%20GIFT/jaksh-image-104.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/KITS%20AND%20GIFTS/EMPLOYEE%20WELCOME%20GIFT/jaksh-image-105.webp"],
    category: 'KITS AND GIFTS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","kits","gifts","employee","welcome","gift"]
  },
  {
    name: 'Coasters Umbrellas',
    description: 'Premium Coasters Umbrellas from Jaksh. High-quality customization options available.',
    price: 28.15,
    brand: 'Jaksh',
    images: [],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","office","essentials","coasters","umbrellas"]
  },
  {
    name: 'Certificates',
    description: 'Premium Certificates from Jaksh. High-quality customization options available.',
    price: 20.31,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Certificates/jaksh-image-110.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Certificates/jaksh-image-111.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Certificates/jaksh-image-112.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","office","essentials","certificates"]
  },
  {
    name: 'Corporate Gifts',
    description: 'Premium Corporate Gifts from Jaksh. High-quality customization options available.',
    price: 31.73,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-113.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-114.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-115.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-116.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-117.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-118.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-119.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-120.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-121.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Corporate%20Gifts%20/jaksh-image-122.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","office","essentials","corporate","gifts"]
  },
  {
    name: 'Document Folders',
    description: 'Premium Document Folders from Jaksh. High-quality customization options available.',
    price: 17.56,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Document%20Folders/jaksh-image-123.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Document%20Folders/jaksh-image-124.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Document%20Folders/jaksh-image-125.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Document%20Folders/jaksh-image-126.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Document%20Folders/jaksh-image-127.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Document%20Folders/jaksh-image-128.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","office","essentials","document","folders"]
  },
  {
    name: 'Id Cards',
    description: 'Premium Id Cards from Jaksh. High-quality customization options available.',
    price: 33.75,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/ID%20Cards/jaksh-image-129.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/ID%20Cards/jaksh-image-130.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/ID%20Cards/jaksh-image-131.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","office","essentials","cards"]
  },
  {
    name: 'Id Card Holders',
    description: 'Premium Id Card Holders from Jaksh. High-quality customization options available.',
    price: 8.34,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-132.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-133.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-134.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-135.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-136.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-137.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-138.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Id%20Card%20Holders/jaksh-image-139.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","office","essentials","card","holders"]
  },
  {
    name: 'Key Chains',
    description: 'Premium Key Chains from Jaksh. High-quality customization options available.',
    price: 16.07,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-140.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-141.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-142.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-143.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-144.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-145.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Key%20Chains/jaksh-image-146.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","office","essentials","key","chains"]
  },
  {
    name: 'Lanyards',
    description: 'Premium Lanyards from Jaksh. High-quality customization options available.',
    price: 25.41,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Lanyards/jaksh-image-147.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Lanyards/jaksh-image-148.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Lanyards/jaksh-image-149.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","office","essentials","lanyards"]
  },
  {
    name: 'Medal',
    description: 'Premium Medal from Jaksh. High-quality customization options available.',
    price: 17.85,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/MEDAL/jaksh-image-150.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/MEDAL/jaksh-image-151.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/MEDAL/jaksh-image-152.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","office","essentials","medal"]
  },
  {
    name: 'Promotional Wallets',
    description: 'Premium Promotional Wallets from Jaksh. High-quality customization options available.',
    price: 14.77,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/PROMOTIONAL%20WALLETS/jaksh-image-153.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/PROMOTIONAL%20WALLETS/jaksh-image-154.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/PROMOTIONAL%20WALLETS/jaksh-image-155.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","office","essentials","promotional","wallets"]
  },
  {
    name: 'Shields',
    description: 'Premium Shields from Jaksh. High-quality customization options available.',
    price: 17.37,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/SHIELDS/jaksh-image-156.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/SHIELDS/jaksh-image-157.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/SHIELDS/jaksh-image-158.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","office","essentials","shields"]
  },
  {
    name: 'Award Ribbons And Trophies',
    description: 'Premium Award Ribbons And Trophies from Jaksh. High-quality customization options available.',
    price: 27.01,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/AWARD%20RIBBONS%20AND%20TROPHIES/jaksh-image-159.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/AWARD%20RIBBONS%20AND%20TROPHIES/jaksh-image-160.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/AWARD%20RIBBONS%20AND%20TROPHIES/jaksh-image-161.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/AWARD%20RIBBONS%20AND%20TROPHIES/jaksh-image-162.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/AWARD%20RIBBONS%20AND%20TROPHIES/jaksh-image-163.webp"],
    category: 'SCHOOL AND INSTITUTIONAL SOLUTIONS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","school","institutional","solutions","award","ribbons","trophies"]
  },
  {
    name: 'House-Club Badges',
    description: 'Premium House-Club Badges from Jaksh. High-quality customization options available.',
    price: 16.83,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/HOUSE-CLUB%20BADGES/jaksh-image-164.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/HOUSE-CLUB%20BADGES/jaksh-image-165.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/HOUSE-CLUB%20BADGES/jaksh-image-166.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/HOUSE-CLUB%20BADGES/jaksh-image-167.webp"],
    category: 'SCHOOL AND INSTITUTIONAL SOLUTIONS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","school","institutional","solutions","house-club","badges"]
  },
  {
    name: 'Sashe',
    description: 'Premium Sashe from Jaksh. High-quality customization options available.',
    price: 10.24,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SASHE/jaksh-image-168.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SASHE/jaksh-image-169.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SASHE/jaksh-image-170.webp"],
    category: 'SCHOOL AND INSTITUTIONAL SOLUTIONS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","school","institutional","solutions","sashe"]
  },
  {
    name: 'School Lanyards',
    description: 'Premium School Lanyards from Jaksh. High-quality customization options available.',
    price: 17.86,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20LANYARDS/jaksh-image-171.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20LANYARDS/jaksh-image-172.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20LANYARDS/jaksh-image-173.webp"],
    category: 'SCHOOL AND INSTITUTIONAL SOLUTIONS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","school","institutional","solutions","lanyards"]
  },
  {
    name: 'School Uniform Labels',
    description: 'Premium School Uniform Labels from Jaksh. High-quality customization options available.',
    price: 24.16,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20UNIFORM%20LABELS/jaksh-image-174.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20UNIFORM%20LABELS/jaksh-image-175.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20UNIFORM%20LABELS/jaksh-image-176.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/SCHOOL%20UNIFORM%20LABELS/jaksh-image-177.webp"],
    category: 'SCHOOL AND INSTITUTIONAL SOLUTIONS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","school","institutional","solutions","uniform","labels"]
  },
  {
    name: 'Student Id Cards',
    description: 'Premium Student Id Cards from Jaksh. High-quality customization options available.',
    price: 16.19,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/STUDENT%20ID%20CARDS/jaksh-image-178.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/STUDENT%20ID%20CARDS/jaksh-image-179.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/SCHOOL%20AND%20INSTITUTIONAL%20SOLUTIONS/STUDENT%20ID%20CARDS/jaksh-image-180.webp"],
    category: 'SCHOOL AND INSTITUTIONAL SOLUTIONS',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","school","institutional","solutions","student","cards"]
  },
  {
    name: 'Custom Dairies',
    description: 'Premium Custom Dairies from Jaksh. High-quality customization options available.',
    price: 11.62,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-181.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-182.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-183.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-184.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-185.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-186.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-187.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-188.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-189.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-190.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-191.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-192.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-193.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Dairies/jaksh-image-194.webp"],
    category: 'Stationary',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","stationary","custom","dairies"]
  },
  {
    name: 'Custom Keychains',
    description: 'Premium Custom Keychains from Jaksh. High-quality customization options available.',
    price: 22.03,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-195.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-196.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-197.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-198.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-199.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-200.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-201.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-202.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-203.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-204.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-205.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-206.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-207.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-208.webp"],
    category: 'Stationary',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","stationary","custom","keychains"]
  },
  {
    name: 'Pen Stand',
    description: 'Premium Pen Stand from Jaksh. High-quality customization options available.',
    price: 13.6,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Pen%20Stand/jaksh-image-292.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Pen%20Stand/jaksh-image-293.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Pen%20Stand/jaksh-image-294.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-209.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-210.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-211.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-212.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-213.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-214.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-215.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-216.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen%20Stand/jaksh-image-217.webp"],
    category: 'Stationary',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","stationary","pen","stand"]
  },
  {
    name: 'Pen-Pencil Kits',
    description: 'Premium Pen-Pencil Kits from Jaksh. High-quality customization options available.',
    price: 25.32,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-218.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-219.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-220.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-221.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-222.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-223.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-224.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-225.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-226.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Pen-Pencil%20Kits/jaksh-image-227.webp"],
    category: 'Stationary',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","stationary","pen-pencil","kits"]
  },
  {
    name: 'Custom T-Shirts',
    description: 'Premium Custom T-Shirts from Jaksh. High-quality customization options available.',
    price: 76.4,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-253.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-254.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-255.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-256.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-257.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-258.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-259.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/%20CUSTOM%20T-shirts/jaksh-image-260.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","custom","t-shirts"]
  },
  {
    name: 'Baby Romper',
    description: 'Premium Baby Romper from Jaksh. High-quality customization options available.',
    price: 58.07,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Baby%20Romper/jaksh-image-274.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Baby%20Romper/jaksh-image-275.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Baby%20Romper/jaksh-image-276.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Baby%20Romper/jaksh-image-277.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Baby%20Romper/jaksh-image-278.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","wearables","baby","romper"]
  },
  {
    name: 'Custom Polo Tshirts',
    description: 'Premium Custom Polo Tshirts from Jaksh. High-quality customization options available.',
    price: 57.29,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/CUSTOM%20POLO%20TSHIRTS/jaksh-image-261.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/CUSTOM%20POLO%20TSHIRTS/jaksh-image-262.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/CUSTOM%20POLO%20TSHIRTS/jaksh-image-263.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","wearables","custom","polo","tshirts"]
  },
  {
    name: 'Cap',
    description: 'Premium Cap from Jaksh. High-quality customization options available.',
    price: 53.71,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Cap/jaksh-image-244.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Cap/jaksh-image-245.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Cap/jaksh-image-246.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Cap/jaksh-image-247.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Cap/jaksh-image-248.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","cap"]
  },
  {
    name: 'Custom Office Tshirt',
    description: 'Premium Custom Office Tshirt from Jaksh. High-quality customization options available.',
    price: 47.44,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Custom%20Office%20Tshirt/jaksh-image-249.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Custom%20Office%20Tshirt/jaksh-image-250.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Custom%20Office%20Tshirt/jaksh-image-251.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Custom%20Office%20Tshirt/jaksh-image-252.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","custom","office","tshirt"]
  },
  {
    name: 'Hankeys',
    description: 'Premium Hankeys from Jaksh. High-quality customization options available.',
    price: 77.4,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hankeys/jaksh-image-241.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hankeys/jaksh-image-242.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hankeys/jaksh-image-243.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","hankeys"]
  },
  {
    name: 'Hoodies',
    description: 'Premium Hoodies from Jaksh. High-quality customization options available.',
    price: 39.3,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-231.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-232.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-233.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-234.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-235.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-236.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Hoodies/jaksh-image-237.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","wearables","hoodies"]
  },
  {
    name: 'Jackets',
    description: 'Premium Jackets from Jaksh. High-quality customization options available.',
    price: 70.67,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/JACKETS/jaksh-image-271.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/JACKETS/jaksh-image-272.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/JACKETS/jaksh-image-273.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["jaksh","wearables","jackets"]
  },
  {
    name: 'Men_s Tshirts',
    description: 'Premium Men_s Tshirts from Jaksh. High-quality customization options available.',
    price: 46.58,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/MEN_S%20TSHIRTS/jaksh-image-238.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/MEN_S%20TSHIRTS/jaksh-image-239.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/MEN_S%20TSHIRTS/jaksh-image-240.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","men_s","tshirts"]
  },
  {
    name: 'Raincoats',
    description: 'Premium Raincoats from Jaksh. High-quality customization options available.',
    price: 22.39,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/RAINCOATS/jaksh-image-268.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/RAINCOATS/jaksh-image-269.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/RAINCOATS/jaksh-image-270.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","raincoats"]
  },
  {
    name: 'Socks',
    description: 'Premium Socks from Jaksh. High-quality customization options available.',
    price: 74.33,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Socks/jaksh-image-264.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Socks/jaksh-image-265.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Socks/jaksh-image-266.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Wearables%20/Socks/jaksh-image-267.webp"],
    category: 'Wearables',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","wearables","socks"]
  },
  {
    name: 'Hand Tags',
    description: 'Premium Hand Tags from MS. High-quality customization options available.',
    price: 9.78,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HAND%20TAGS/ms-image-42.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HAND%20TAGS/ms-image-43.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HAND%20TAGS/ms-image-44.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HAND%20TAGS/ms-image-45.webp"],
    category: 'Labels and Tags',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["labels","tags","hand"]
  },
  {
    name: 'Heat Transfer- Sublimation Labels',
    description: 'Premium Heat Transfer- Sublimation Labels from MS. High-quality customization options available.',
    price: 9.32,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HEAT%20TRANSFER-%20SUBLIMATION%20LABELS/ms-image-54.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HEAT%20TRANSFER-%20SUBLIMATION%20LABELS/ms-image-55.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/HEAT%20TRANSFER-%20SUBLIMATION%20LABELS/ms-image-56.webp"],
    category: 'Labels and Tags',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["labels","tags","heat","transfer-","sublimation"]
  },
  {
    name: 'Printed Labels',
    description: 'Premium Printed Labels from MS. High-quality customization options available.',
    price: 4.13,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/PRINTED%20LABELS/ms-image-38.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/PRINTED%20LABELS/ms-image-39.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/PRINTED%20LABELS/ms-image-40.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/PRINTED%20LABELS/ms-image-41.webp"],
    category: 'Labels and Tags',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["labels","tags","printed"]
  },
  {
    name: 'Qr Code- Barcode Tags',
    description: 'Premium Qr Code- Barcode Tags from MS. High-quality customization options available.',
    price: 4.17,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/QR%20CODE-%20BARCODE%20TAGS/ms-image-46.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/QR%20CODE-%20BARCODE%20TAGS/ms-image-47.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/QR%20CODE-%20BARCODE%20TAGS/ms-image-48.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/QR%20CODE-%20BARCODE%20TAGS/ms-image-49.webp"],
    category: 'Labels and Tags',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["labels","tags","code-","barcode"]
  },
  {
    name: 'Woven Labels',
    description: 'Premium Woven Labels from MS. High-quality customization options available.',
    price: 3.33,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/Woven%20Labels/ms-image-50.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/Woven%20Labels/ms-image-51.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/Woven%20Labels/ms-image-52.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Labels%20and%20Tags/Woven%20Labels/ms-image-53.webp"],
    category: 'Labels and Tags',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["labels","tags","woven"]
  },
  {
    name: 'Accessories- Id Holders',
    description: 'Premium Accessories- Id Holders from MS. High-quality customization options available.',
    price: 14.69,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ACCESSORIES-%20ID%20HOLDERS/ms-image-10.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ACCESSORIES-%20ID%20HOLDERS/ms-image-11.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ACCESSORIES-%20ID%20HOLDERS/ms-image-7.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ACCESSORIES-%20ID%20HOLDERS/ms-image-8.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ACCESSORIES-%20ID%20HOLDERS/ms-image-9.webp"],
    category: 'Lanyards and ID Solutions',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["lanyards","solutions","accessories-","holders"]
  },
  {
    name: 'Clips And Bucklers',
    description: 'Premium Clips And Bucklers from MS. High-quality customization options available.',
    price: 24.02,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/CLIPS%20AND%20BUCKLERS/ms-image-15.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/CLIPS%20AND%20BUCKLERS/ms-image-16.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/CLIPS%20AND%20BUCKLERS/ms-image-17.webp"],
    category: 'Lanyards and ID Solutions',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["lanyards","solutions","clips","bucklers"]
  },
  {
    name: 'Id Cards- Membership- Loyalty',
    description: 'Premium Id Cards- Membership- Loyalty from MS. High-quality customization options available.',
    price: 12.17,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20MEMBERSHIP-%20LOYALTY/ms-image-12.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20MEMBERSHIP-%20LOYALTY/ms-image-13.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20MEMBERSHIP-%20LOYALTY/ms-image-14.webp"],
    category: 'Lanyards and ID Solutions',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["lanyards","solutions","cards-","membership-","loyalty"]
  },
  {
    name: 'Id Cards- Pvc',
    description: 'Premium Id Cards- Pvc from MS. High-quality customization options available.',
    price: 14.44,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20PVC/ms-image-18.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20PVC/ms-image-19.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20PVC/ms-image-20.webp"],
    category: 'Lanyards and ID Solutions',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["lanyards","solutions","cards-","pvc"]
  },
  {
    name: 'Id Cards- Smart- Rfid',
    description: 'Premium Id Cards- Smart- Rfid from MS. High-quality customization options available.',
    price: 11.63,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20SMART-%20RFID/ms-image-4.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20SMART-%20RFID/ms-image-5.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ID%20CARDS-%20SMART-%20RFID/ms-image-6.webp"],
    category: 'Lanyards and ID Solutions',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["lanyards","solutions","cards-","smart-","rfid"]
  },
  {
    name: 'Custom Message Ribbons',
    description: 'Premium Custom Message Ribbons from MS. High-quality customization options available.',
    price: 28.47,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/CUSTOM%20MESSAGE%20RIBBONS/ms-image-22.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/CUSTOM%20MESSAGE%20RIBBONS/ms-image-23.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/CUSTOM%20MESSAGE%20RIBBONS/ms-image-24.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/CUSTOM%20MESSAGE%20RIBBONS/ms-image-25.webp"],
    category: 'Ribbon & Packaging',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["ribbon","packaging","custom","message","ribbons"]
  },
  {
    name: 'Event Ribbons',
    description: 'Premium Event Ribbons from MS. High-quality customization options available.',
    price: 4.25,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/EVENT%20RIBBONS/ms-image-26.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/EVENT%20RIBBONS/ms-image-27.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/EVENT%20RIBBONS/ms-image-28.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/EVENT%20RIBBONS/ms-image-29.webp"],
    category: 'Ribbon & Packaging',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: false,
    tags: ["ribbon","packaging","event","ribbons"]
  },
  {
    name: 'Gift Wrapping Ribbons',
    description: 'Premium Gift Wrapping Ribbons from MS. High-quality customization options available.',
    price: 24.27,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/GIFT%20WRAPPING%20RIBBONS/ms-image-30.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/GIFT%20WRAPPING%20RIBBONS/ms-image-31.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/GIFT%20WRAPPING%20RIBBONS/ms-image-32.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/GIFT%20WRAPPING%20RIBBONS/ms-image-33.webp"],
    category: 'Ribbon & Packaging',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["ribbon","packaging","gift","wrapping","ribbons"]
  },
  {
    name: 'Printed Ribbons',
    description: 'Premium Printed Ribbons from MS. High-quality customization options available.',
    price: 20.87,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/PRINTED%20RIBBONS/ms-image-34.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/PRINTED%20RIBBONS/ms-image-35.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/PRINTED%20RIBBONS/ms-image-36.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Ribbon%20%26%20Packaging/PRINTED%20RIBBONS/ms-image-37.webp"],
    category: 'Ribbon & Packaging',
    stock: 100,
    customizationOptions: {"allowsImageUpload":true,"allowsTextCustomization":true,"allowsLogoUpload":true,"minQuantity":1,"maxQuantity":1000,"turnaroundTime":"3-5 days"},
    isActive: true,
    isFeatured: true,
    tags: ["ribbon","packaging","printed","ribbons"]
  },
  {
    name: 'Clocks',
    description: 'Premium Clocks from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Clocks/jaksh-image-316.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Clocks/jaksh-image-317.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Clocks/jaksh-image-318.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["clocks"]
  },
  {
    name: 'Desk Calenders',
    description: 'Premium Desk Calenders from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Desk%20Calenders/jaksh-image-312.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Desk%20Calenders/jaksh-image-313.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Desk%20Calenders/jaksh-image-314.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Desk%20Calenders/jaksh-image-315.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["desk","calenders"]
  },
  {
    name: 'Magnet Calender',
    description: 'Premium Magnet Calender from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Magnet%20Calender/jaksh-image-319.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Magnet%20Calender/jaksh-image-320.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Clocks%20and%20Calendars%20/Magnet%20Calender/jaksh-image-321.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["magnet","calender"]
  },
  {
    name: 'Fridge Magnets',
    description: 'Premium Fridge Magnets from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Fridge%20Magnets/jaksh-image-283.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Fridge%20Magnets/jaksh-image-284.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Fridge%20Magnets/jaksh-image-285.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Fridge%20Magnets/jaksh-image-286.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Fridge%20Magnets/jaksh-image-287.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Fridge%20Magnets/jaksh-image-288.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["fridge","magnets"]
  },
  {
    name: 'Photo Magnets - Strip',
    description: 'Premium Photo Magnets - Strip from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Photo%20Magnets%20-%20Strip/il_794xN.6980540789_l76i.avif","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Photo%20Magnets%20-%20Strip/il_fullxfull.6953813081_fa26.avif","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Photo%20Magnets%20-%20Strip/jaksh-image-279.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Photo%20Magnets%20-%20Strip/jaksh-image-280.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Photo%20Magnets%20-%20Strip/jaksh-image-281.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Cutomised%20Magnets/Photo%20Magnets%20-%20Strip/jaksh-image-282.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["photo","magnets","-","strip"]
  },
  {
    name: 'Cushions',
    description: 'Premium Cushions from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Cushions/jaksh-image-298.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Cushions/jaksh-image-299.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Cushions/jaksh-image-300.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Cushions/jaksh-image-301.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Cushions/jaksh-image-302.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["cushions"]
  },
  {
    name: 'Mobile Covers',
    description: 'Premium Mobile Covers from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Mobile%20Covers/jaksh-image-303.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Mobile%20Covers/jaksh-image-304.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Mobile%20Covers/jaksh-image-305.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Mobile%20Covers/jaksh-image-306.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Mobile%20Covers/jaksh-image-307.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["mobile","covers"]
  },
  {
    name: 'Phone Stand',
    description: 'Premium Phone Stand from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Phone%20Stand/jaksh-image-295.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Phone%20Stand/jaksh-image-296.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Phone%20Stand/jaksh-image-297.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["phone","stand"]
  },
  {
    name: 'Piggi Bank',
    description: 'Premium Piggi Bank from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Piggi%20Bank/jaksh-image-289.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Piggi%20Bank/jaksh-image-290.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Piggi%20Bank/jaksh-image-291.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["piggi","bank"]
  },
  {
    name: 'Planter',
    description: 'Premium Planter from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Planter/jaksh-image-308.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Planter/jaksh-image-309.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Planter/jaksh-image-310.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Home%20and%20Gifts%20/Others/Planter/jaksh-image-311.webp"],
    category: 'Home and Gifts',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["planter"]
  },
  {
    name: 'Id Card Holders and Accessories',
    description: 'Premium Id Card Holders and Accessories from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-322.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-323.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-324.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-325.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-326.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-327.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-328.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-329.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-330.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-331.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-332.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Id%20Card%20Holders%20and%20Accessories%20/jaksh-image-333.webp"],
    category: 'Id Card Holders and Accessories',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["id","card","holders","and","accessories"]
  },
  {
    name: 'COASTERS, UMBRELLAS',
    description: 'Premium COASTERS, UMBRELLAS from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/COASTERS%2C%20UMBRELLAS/jaksh-image-107.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/COASTERS%2C%20UMBRELLAS/jaksh-image-108.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/COASTERS%2C%20UMBRELLAS/jaksh-image-109.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["coasters,","umbrellas"]
  },

  {
    name: 'Calenders (Wooden)',
    description: 'Premium Calenders (Wooden) from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Calenders%20(Wooden)/jaksh-image-337.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Calenders%20(Wooden)/jaksh-image-338.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Calenders%20(Wooden)/jaksh-image-339.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Calenders%20(Wooden)/jaksh-image-340.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["calenders","(wooden)"]
  },
  {
    name: 'Mouse Pad',
    description: 'Premium Mouse Pad from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Mouse%20Pad/jaksh-image-344.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Mouse%20Pad/jaksh-image-345.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Mouse%20Pad/jaksh-image-346.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Mouse%20Pad/jaksh-image-347.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["mouse","pad"]
  },
  {
    name: 'NFC CARD',
    description: 'Premium NFC CARD from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/NFC%20CARD/jaksh-image-334.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/NFC%20CARD/jaksh-image-335.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/NFC%20CARD/jaksh-image-336.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["nfc","card"]
  },
  {
    name: 'Table Standees',
    description: 'Premium Table Standees from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Table%20Standees/jaksh-image-341.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Table%20Standees/jaksh-image-342.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Office%20Essentials%20/Desk%20Accesories%20/Table%20Standees/jaksh-image-343.webp"],
    category: 'Office Essentials',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["table","standees"]
  },
  {
    name: 'STICKERS',
    description: 'Premium STICKERS from Jaksh. High-quality customization options available.',
    price: 25,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/STICKERS/jaksh-image-228.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/STICKERS/jaksh-image-229.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/STICKERS/jaksh-image-230.webp"],
    category: 'Stickers',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["stickers"]
  },
  {
    name: 'Lanyards and ID Solutions',
    description: 'Premium Lanyards and ID Solutions from MS Enterprises. High-quality customization options available.',
    price: 25,
    brand: 'MS Enterprises',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ms-image-1.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ms-image-2.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ms-image-21.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/MS/Lanyards%20and%20ID%20Solutions/ms-image-3.webp"],
    category: 'Labels and Tags',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["lanyards","and","id","solutions"]
  },
  {
    name: 'Customized Keychains',
    description: 'Premium Customized Keychains from Jaksh. High-quality customization options available.',
    price: 16.07,
    brand: 'Jaksh',
    images: ["https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-195.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-196.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-197.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-198.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-199.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-200.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-201.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-202.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-203.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-204.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-205.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-206.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-207.webp","https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com/website_photos/Jaksh/Stationary/Custom%20Keychains/jaksh-image-208.webp"],
    category: 'Stationary',
    stock: 100,
    customizationOptions: ["Custom Logo","Color Options","Size Variations"],
    isActive: true,
    isFeatured: false,
    tags: ["jaksh","stationary","customized","keychains"]
  }
];

module.exports = { sampleProducts };

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ms-enterprises-ecommerce', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('🧹 Cleared existing products');

    // Insert sample products
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Inserted ${products.length} sample products`);

    // Create admin user if it doesn't exist
    const adminExists = await User.findOne({ email: 'admin@msenterprises.com' });
    if (!adminExists) {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@msenterprises.com',
        password: 'admin123',
        isAdmin: true
      });
      await adminUser.save();
      console.log('✅ Created admin user (email: admin@msenterprises.com, password: admin123)');
    }

    // Seed default customizations
    await seedDefaultCustomizations();

    // Update products with default customizations
    await updateProductsWithDefaults();

    // Migrate existing products to embed customization details
    await migrateProductCustomizations();

    // Migrate priceModifier from string to object
    await migratePriceModifier();

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Products Added:');
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - $${product.price} (${product.brand})`);
    });

    console.log('\n🔑 Admin Login Credentials:');
    console.log('Email: admin@msenterprises.com');
    console.log('Password: 87654321');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seed function
seedDatabase();
