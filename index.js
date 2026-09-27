const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();

// Database Connection
mongoose.connect('mongodb://azizpheonix51_db_user:MyPassword123@ac-dkdinox-shard-00-00.ocsz8qh.mongodb.net:27017,ac-dkdinox-shard-00-01.ocsz8qh.mongodb.net:27017,ac-dkdinox-shard-00-02.ocsz8qh.mongodb.net:27017/bulkmail?ssl=true&replicaSet=atlas-edapqz-shard-0&authSource=admin&appName=BulkmailApp')
    .then(() => console.log('Database Connected'))
    .catch((error) => console.log('Database connection failed', error));

// Models
const login = mongoose.model('login', {}, 'logincredentials');

const history = mongoose.model('history', {
    email: String,
    message: String,
    date: String
}, 'historydata');

// Middleware
app.use(cors());
app.use(express.json());

// POST: Send Emails & Save History
app.post('/sendmail', async (req, res) => {
    const { message, emailList } = req.body;

    if (!emailList || !Array.isArray(emailList) || emailList.length === 0) {
        return res.status(400).send('No email list provided');
    }

    try {
        // 1. Fetch credentials from DB
        const data = await login.find();
        if (!data || data.length === 0) {
            return res.status(500).send('Email credentials not found in database');
        }

        // 2. Configure Transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: data[0].toJSON().user,
                pass: data[0].toJSON().pass
            }
        });

        // 3. Send emails concurrently
        const emailPromises = emailList.map(item => {
            return transporter.sendMail({
                from: 'azizpheonix51@gmail.com',
                to: item,
                subject: 'Message from BulkMail App',
                text: message
            });
        });

        await Promise.all(emailPromises);

        // 4. Save history records
        const historyRecords = emailList.map(item => ({
            email: item,
            message: message,
            date: new Date().toLocaleDateString() 
        }));

        await history.create(historyRecords);

        res.status(200).send('All emails sent successfully!');
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

// Start Server
app.listen(5000, () => {
    console.log('Server is running on port 5000...');
});