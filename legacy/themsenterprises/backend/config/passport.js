const passport = require('passport');
const { User } = require('../models');

// Debug env vars
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set');

// Only configure Google OAuth if environment variables are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('Registering Google strategy');
  try {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://api.themsenterprises.com/api/auth/google/callback',
          proxy: true // Important for Lambda/API Gateway
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists with this Google ID
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
              return done(null, user);
            }

            // Check if user exists with same email
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              await user.save();
              return done(null, user);
            }

            // Create new user
            user = await User.create({
              username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
              email: profile.emails[0].value,
              googleId: profile.id,
              password: 'google-oauth-' + Date.now() // Dummy password for Google users
            });

            return done(null, user);
          } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error, null);
          }
        }
      )
    );
    console.log('Google strategy registered successfully');
  } catch (error) {
    console.error('Error registering Google strategy:', error);
  }
} else {
  console.log('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file to enable Google authentication.');
}

// NO SESSION SERIALIZATION FOR LAMBDA - IT'S STATELESS

module.exports = passport;