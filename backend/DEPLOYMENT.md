# Deployment Guide

This guide covers deploying the Unspiral backend to various platforms.

## Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account (or self-hosted MongoDB)
- Git repository

## Environment Variables

Before deploying, ensure all environment variables are properly configured:

```env
MONGODB_URI=your-mongodb-connection-string
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret
CORS_ORIGINS=https://your-app-domain.com,exp://
OPENAI_API_KEY=your-openai-key (optional)
```

## Deployment Options

### 1. Heroku

#### Setup
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create new app
heroku create unspiral-api

# Add MongoDB Atlas add-on or use existing MongoDB
# Set environment variables
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set JWT_SECRET="your-jwt-secret"
heroku config:set SESSION_SECRET="your-session-secret"
heroku config:set NODE_ENV="production"

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

#### Procfile
Create a `Procfile` in the backend root:
```
web: node src/server.js
```

### 2. Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables in the Variables section
5. Railway will auto-detect Node.js and deploy

### 3. Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: unspiral-api
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
5. Add environment variables
6. Click "Create Web Service"

### 4. DigitalOcean App Platform

1. Go to DigitalOcean dashboard
2. Create new App
3. Connect GitHub repository
4. Configure:
   - **Source Directory**: `/backend`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
5. Add environment variables
6. Deploy

### 5. AWS EC2 (Manual)

#### Setup EC2 Instance
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone your-repo-url
cd your-repo/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start src/server.js --name unspiral-api

# Save PM2 configuration
pm2 save
pm2 startup

# Setup nginx as reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/unspiral
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/unspiral /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 6. Docker Deployment

#### Dockerfile
Create `Dockerfile` in backend directory:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "src/server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Deploy
```bash
# Build image
docker build -t unspiral-api ./backend

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file backend/.env \
  --name unspiral-api \
  unspiral-api

# Or use docker-compose
docker-compose up -d
```

## MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Setup database user
4. Whitelist your server IP (or 0.0.0.0/0 for all IPs)
5. Get connection string
6. Replace `<password>` in connection string
7. Add connection string to environment variables

## Post-Deployment

### 1. Test Endpoints
```bash
# Health check
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/v1
```

### 2. Setup Monitoring

#### Using PM2 (if deployed with PM2)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. Setup Automated Backups for MongoDB

Use MongoDB Atlas automated backups or setup custom backup script:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/backups/backup_$DATE"
```

### 4. Setup Scheduled Notifications

For sending nightly check-in notifications, setup a cron job or use a service like:
- **Node-cron** (within the app)
- **AWS Lambda** with CloudWatch Events
- **Heroku Scheduler**
- **Railway Cron Jobs**

## Monitoring & Logging

### Recommended Tools

1. **Application Monitoring**
   - New Relic
   - DataDog
   - Sentry (for error tracking)

2. **Logging**
   - LogDNA
   - Papertrail
   - ELK Stack (self-hosted)

3. **Uptime Monitoring**
   - UptimeRobot
   - Pingdom
   - StatusCake

## Performance Optimization

### 1. Enable Compression
Already configured in `server.js` with `compression` middleware.

### 2. Setup CDN
If serving static assets, use:
- Cloudflare
- AWS CloudFront
- Fastly

### 3. Database Indexing
Already configured in models, but monitor slow queries:
```javascript
// Enable MongoDB profiling
db.setProfilingLevel(1, { slowms: 100 })
```

### 4. Rate Limiting
Already configured, but adjust based on your needs in `middleware/rateLimiter.js`.

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] MongoDB authentication enabled
- [ ] JWT secret is strong and unique
- [ ] Input validation on all endpoints
- [ ] Helmet.js security headers enabled
- [ ] MongoDB injection protection enabled
- [ ] Regular dependency updates

## Troubleshooting

### Server not starting
- Check environment variables
- Verify MongoDB connection string
- Check logs for errors
- Ensure port is not already in use

### Database connection issues
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions

### High memory usage
- Check for memory leaks
- Monitor database query performance
- Consider horizontal scaling

## Scaling

### Vertical Scaling
Increase server resources (CPU, RAM) on your hosting platform.

### Horizontal Scaling
1. Setup load balancer
2. Deploy multiple instances
3. Use Redis for session storage (if needed)
4. Consider database read replicas

## Support

For issues or questions:
- Check logs: `pm2 logs` or platform-specific logs
- Review API documentation
- Check GitHub issues
