FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies (production only)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Default command
CMD ["npm", "start"]