# Thought Space

A modern, full-stack blogging platform built with Node.js and MongoDB. Share your ideas, stories, and insights with an engaged community through a beautiful and intuitive interface.

## About

Thought Space is a feature-rich blogging application that makes content creation simple and enjoyable. Whether you're a writer, journalist, or enthusiast, this platform provides all the tools needed to publish engaging articles, connect with readers through comments, and build your online presence.

## Features

- **User Authentication** - Secure registration with email verification and password management
- **Article Management** - Create, edit, and delete articles with rich content and custom cover photos
- **Categorization** - Organize articles into categories for better content discovery
- **Comments System** - Interactive comments to engage with readers
- **User Profiles** - Customizable profiles with photo uploads and profile editing
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Frontend**: Handlebars, Bootstrap 4
- **File Storage**: Multer (local disk storage)
- **Authentication**: bcryptjs, express-session
- **Deployment**: Heroku

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (free tier available)
- Gmail account (for email verification)

### Setup

1. Clone and install:
```bash
git clone https://github.com/rumaysaa/Blog-website.git
cd Blog-website
npm install
```

2. Create `.env` file in root directory:
```env
DB_PASS=your_mongodb_password
PORT=3000
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_gmail_app_password
SESSION_SECRET=your-random-secret-key
BASE_URL=http://localhost:3000
NODE_ENV=development
```

3. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Deployment

Deploy to Heroku with automatic GitHub integration:

1. Create a new app on [heroku.com](https://dashboard.heroku.com)
2. In **Deploy** tab, connect your GitHub repository
3. In **Settings** tab, add these Config Vars:
   - `DB_PASS` - Your MongoDB password
   - `MAIL_USERNAME` - Your Gmail address
   - `MAIL_PASSWORD` - Your Gmail app password
   - `SESSION_SECRET` - A random secure string
   - `BASE_URL` - Your Heroku app URL
   - `NODE_ENV` - Set to `production`

4. Enable **Automatic Deploys** for the main branch

Every push to GitHub will automatically redeploy your app. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Scripts

```bash
npm run dev    # Start with hot-reload (development)
npm start      # Start production server
```

## File Upload Specifications

- **Article Cover Photos**: Max 5MB, JPG/PNG/GIF formats
- **Profile Photos**: Supported formats for user profiles
- All uploads are validated server-side

## License

ISC
