const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const amqp = require('amqplib');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger setup
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Submit API',
            version: '1.0.0',
            description: 'API for submitting questions to a message queue'
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 3001}` }]
    },
    apis: ['./server.js']
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Retrieve categories from the Question microservice
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Failed to fetch categories
 */
app.get('/categories', async (req, res) => {
    const cacheFile = path.join('/data', 'categories.json');
    try {
        // Try to fetch fresh categories from the Question microservice
        const response = await fetch('http://question-app:3000/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const categories = await response.json();
        // Cache the categories
        await fs.writeFile(cacheFile, JSON.stringify(categories));
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        try {
            // If fetching fails, try to serve from cache
            const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
            res.json(cached);
        } catch (cacheError) {
            console.error('Error reading from cache:', cacheError);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }
});

/**
 * @swagger
 * /submit:
 *   post:
 *     summary: Submit a new question to the message queue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               correctAnswerIndex:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Question submitted to queue
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to submit question
 */
app.post('/submit', async (req, res) => {
    const { question, answers, category, correctAnswerIndex } = req.body;
    if (!question || !answers || answers.length !== 4 || !category || correctAnswerIndex === undefined) {
        return res.status(400).json({ error: 'All fields are required, including exactly 4 answers' });
    }

    try {
        const conn = await amqp.connect('amqp://guest:guest@rabbitmq');
        const channel = await conn.createChannel();
        const queue = 'SUBMITTED_QUESTIONS';
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify({ question, answers, category, correctAnswerIndex })));
        await channel.close();
        await conn.close();
        res.status(201).json({ message: 'Question submitted to queue' });
    } catch (error) {
        console.error('Error sending to RabbitMQ:', error);
        res.status(500).json({ error: 'Failed to submit question' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Submit app running on port ${PORT}`));