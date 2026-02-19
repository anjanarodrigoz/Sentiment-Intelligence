import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MAS API',
      version: '1.0.0',
      description: 'Market Analysis & Sentiment Intelligence API — scrape product reviews, analyze sentiment, and manage product data.',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Server health checks' },
      { name: 'Brands', description: 'Brand management' },
      { name: 'Products', description: 'Product CRUD and version history' },
      { name: 'Scraping', description: 'Review scraping (standard and streaming)' },
      { name: 'LLM', description: 'Ollama LLM integration for sentiment analysis and chat' },
    ],
    components: {
      schemas: {
        Brand: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'nike' },
            name: { type: 'string', example: 'Nike' },
            logo: { type: 'string', example: '/brands/nike.png' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            urlHash: { type: 'string', example: 'a1b2c3d4' },
            title: { type: 'string', example: 'Nike Air Max 90' },
            imageUrl: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            brandId: { type: 'string', example: 'nike' },
            currentVersion: { type: 'integer', example: 3 },
            updatedAt: { type: 'string', format: 'date-time' },
            reviewCount: { type: 'integer', example: 128 },
            rating: { type: 'number', format: 'float', example: 4.5 },
          },
        },
        Review: {
          type: 'object',
          properties: {
            text: { type: 'string', example: 'Great quality shoes!' },
            rating: { type: 'number', example: 5 },
            date: { type: 'string', example: '2024-01-15' },
            version: { type: 'integer', example: 1 },
          },
        },
        ProductVersion: {
          type: 'object',
          properties: {
            version: { type: 'integer', example: 2 },
            scrapedAt: { type: 'string', format: 'date-time' },
            newReviewCount: { type: 'integer', example: 15 },
            cumulativeReviewCount: { type: 'integer', example: 128 },
            reviewCount: { type: 'integer', example: 15 },
            product: {
              type: 'object',
              properties: {
                rating: { type: 'number', example: 4.5 },
                reviewCount: { type: 'integer', example: 500 },
              },
            },
          },
        },
        ScrapeRequest: {
          type: 'object',
          required: ['url', 'brand'],
          properties: {
            url: { type: 'string', format: 'uri', example: 'https://www.nike.com/t/air-max-90' },
            brand: { type: 'string', example: 'nike' },
            forceRescrape: { type: 'boolean', default: false },
          },
        },
        ScrapeResponse: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                imageUrl: { type: 'string' },
                rating: { type: 'number' },
                reviewCount: { type: 'integer' },
              },
            },
            reviews: {
              type: 'array',
              items: { $ref: '#/components/schemas/Review' },
            },
            source: { type: 'string' },
            cached: { type: 'boolean' },
            scrapedAt: { type: 'string', format: 'date-time' },
            version: { type: 'integer' },
            newReviews: { type: 'integer' },
            duplicates: { type: 'integer' },
            isNewVersion: { type: 'boolean' },
            urlHash: { type: 'string' },
          },
        },
        AnalyzeRequest: {
          type: 'object',
          required: ['reviews'],
          properties: {
            reviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  rating: { type: 'number' },
                },
              },
            },
            model: { type: 'string', example: 'llama3.2' },
          },
        },
        ChatRequest: {
          type: 'object',
          required: ['messages'],
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                },
              },
            },
            context: { type: 'string' },
            systemPrompt: { type: 'string' },
            model: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Something went wrong' },
          },
        },
      },
    },
  },
  apis: ['./src/index.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
