FROM mcr.microsoft.com/playwright:v1.61.1-jammy
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# We will pass the base URL as an environment variable when running
CMD ["npx", "playwright", "test"]
