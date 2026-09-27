const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();

// Database Connection (cached or standard connection)
if (mongoose.connection.readyState === 0) {
    mongoose.connect('mongodb://azizpheonix51_db_user:MyPassword123@ac-dkdinox-shard-00-00.ocsz8qh.mongodb.net:27017,ac-dkdinox-shard-00-01.ocsz8qh.mongodb.net:27017,ac-dkdinox-shard-00-02.ocsz8qh.mongodb.net:27017/bulkmail?ssl=true&replicaSet=atlas-edapqz-shard-0&authSource=admin&appName=BulkmailApp')
        .then(() => console.log('Database Connected'))
        .catch((error) => console.log('Database connection failed', error));
}

// Models
const history = mongoose.model('history', {
    email: String,
    message: String,
    date: String
}, 'historydata');

const login = mongoose.model('login', {}, 'logincredentials');

// Middleware
app.use(cors());
app.use(express.json());

// POST: Send Emails via Gmail SMTP & Save History
app.post('/sendmail', async (req, res) => {
    const { message, emailList } = req.body;

    if (!emailList || !Array.isArray(emailList) || emailList.length === 0) {
        return res.status(400).send('No email list provided');
    }

    try {
        // Fetch credentials from MongoDB
        const data = await login.find();
        if (!data || data.length === 0) {
            return res.status(500).send('No login credentials found in database');
        }

        const senderEmail = data[0].toJSON().user;
        const senderPass = data[0].toJSON().pass;

        // Configure Nodemailer with Gmail
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: senderEmail,
                pass: senderPass
            },
            tls: { rejectUnauthorized: false }
        });

        // Send emails sequentially
        for (const recipient of emailList) {
            await transporter.sendMail({
                from: senderEmail,
                to: recipient,
                subject: 'Message from BulkMail App',
                text: message
            });
            // Small pause between emails
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Save history records
        const historyRecords = emailList.map(item => ({
            email: item,
            message: message,
            date: new Date().toLocaleDateString()
        }));

        await history.create(historyRecords);

        res.status(200).send('All emails sent successfully through Gmail!');
    } catch (error) {
        console.error('Something went wrong:', error);
        res.status(500).send('Email failed to send');
    }
});

// GET: Fetch History Records
app.get('/history', async (req, res) => {
    try {
        const historySend = await history.find();
        res.status(200).send(historySend);
    } catch (error) {
        console.error('Something went wrong:', error);
        res.status(500).send('Failed to fetch history');
    }
});

// Export app for Vercel Serverless Functions
module.exports = app;