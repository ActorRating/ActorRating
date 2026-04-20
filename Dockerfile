FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Prevent prisma generate from running too early
RUN npm install --ignore-scripts

COPY . .

# Now Prisma can see the schema
RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
