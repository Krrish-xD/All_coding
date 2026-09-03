# Project Context: MS Enterprises E-Commerce

## Overview
A full-stack, enterprise-grade e-commerce platform built using the MERN stack, designed for scalability and security. Key features include secure authentication, product management, order processing with Razorpay, and a comprehensive admin dashboard.

## Tech Stack
### Frontend
- **Framework**: React (Create React App)
- **Styling**: Bootstrap 5, React-Bootstrap, Custom CSS
- **State/Context**: Context API (Auth, Cart, Admin, Settings, Popup)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Other**: Chart.js (Admin dashboard), React Icons, React OAuth/Google

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: Passport.js (Google OAuth 2.0, Local Strategy), JWT
- **Payments**: Razorpay
- **Deployment**: AWS Lambda (`serverless-http`)
- **Security**: Helmet, Rate Limiting, CORS

### Infrastructure
- **IaC**: Terraform (Config in `infra/`)
- **Cloud Provider**: AWS

## Directory Structure
- **`/backend`**: Express API server.
    - `server.js`: Local entry point.
    - `lambda.js`: AWS Lambda handler.
    - `app.js`: Express app configuration.
    - `routes/`: API route definitions.
    - `models/`: Mongoose schemas.
    - `controllers/`: Request handlers.
- **`/frontend`**: React application.
    - `src/App.js`: Main component with routing.
    - `src/context/`: Global state management.
    - `src/pages/`: Page components (including Admin pages under `/admin2009`).
    - `src/components/`: Reusable UI components.
- **`/infra`**: Terraform configuration files (ignored by git).

## Key Features & specialized routes
- **Admin Panel**: Accessible via `/admin2009` (e.g., `/admin2009/dashboard`, `/admin2009/orders`).
- **Webhooks**: Handling for external events (likely Razorpay).
- **Customizations**: Support for product customizations.
- **Coupons**: Discount management system.
- **Hybrid Auth**: Supports both traditional email/password and Google OAuth.
- **Settings Management**:
    - Application settings (like `paymentGatewayLive`) are stored in MongoDB.
    - **Initialization**: Settings are initialized in `server.js` and `lambda.js` after DB connection to prevent race conditions.
    - **Razorpay Mode**: Defaults to **Live Mode** in production (`NODE_ENV=production`) if the `paymentGatewayLive` setting is missing. Defaults to **Test Mode** otherwise.
    - **Admin Panel**: Settings changes must be explicitly saved via the "Save All Settings" button.
