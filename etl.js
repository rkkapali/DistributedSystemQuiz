const amqp = require('amqplib');
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'yourpassword',
    database: process.env.DB_NAME || 'quizdb'
});

async function connectRabbitMQ() {
    const conn = await amqp.connect('amqp://guest:guest@rabbitmq');
    const channel = await conn.createChannel();
    const queue = 'SUBMITTED_QUESTIONS';

    await channel.assertQueue(queue, { durable: true });
    console.log(`Waiting for messages in ${queue}`);

    channel.consume(queue, async (msg) => {
        if (msg) {
            const data = JSON.parse(msg.content.toString());
            await processMessage(data);
            channel.ack(msg);
        }
    }, { noAck: false });
}

async function processMessage({ question, answers, category, correctAnswerIndex }) {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [categoryRows] = await connection.query('SELECT id FROM categories WHERE name = ?', [category]);
        let categoryId;
        if (categoryRows.length === 0) {
            const [result] = await connection.query('INSERT INTO categories (name) VALUES (?)', [category]);
            categoryId = result.insertId;
        } else {
            categoryId = categoryRows[0].id;
        }

        const [questionResult] = await connection.query('INSERT INTO questions (category_id, text) VALUES (?, ?)', [categoryId, question]);
        const questionId = questionResult.insertId;

        for (let i = 0; i < answers.length; i++) {
            await connection.query('INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)', [questionId, answers[i], i === correctAnswerIndex]);
        }

        await connection.commit();
        console.log('Message processed and loaded into database');
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('ETL Error:', error);
    } finally {
        if (connection) connection.release();
    }
}

connectRabbitMQ().catch(console.error);