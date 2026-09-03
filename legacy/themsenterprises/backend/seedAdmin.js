const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ms-enterprises-ecommerce');

    const adminExists = await User.findOne({ email: 'office@themsenterprises.com' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    const admin = new User({
      username: 'admin2009',
      email: 'office@themsenterprises.com',
      password: '&mf8Nmz6i*Sb3',
      isAdmin: true
    });

    await admin.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedAdmin();
