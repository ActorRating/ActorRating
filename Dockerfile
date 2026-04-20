FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Prevent prisma generate from running too early
RUN npm install --ignore-scripts

COPY . .

# Now Prisma can see the schema
RUN npx prisma generate

# Push schema to DB (creates tables)
RUN npx prisma db push

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
