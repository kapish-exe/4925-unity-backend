const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
require('dotenv').config();

const { registerUser, getUserByUsername, saveProgress, getProgress } = require('./database/user');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_host = process.env.MONGODB_HOST;

const node_session_secret = process.env.NODE_SESSION_SECRET;

// MongoDB for Sessions
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}
));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || password.length < 10) {
        return res.status(400).send('Invalid input');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await registerUser(username, hashedPassword);
        res.status(201).send('User registered');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).send('Username already exists');
        } else {
            res.status(500).send('Server error');
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send('Invalid credentials');
        }

        req.session.userID = user.id;
        res.send('Logged in');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/api/progress', async (req, res) => {
    const { level, coins, enemiesDefeated } = req.body;

    if (!req.session.userID) {
        return res.status(401).send('Not authenticated');
    }

    try {
        await saveProgress(req.session.userID, level, coins, enemiesDefeated);
        res.send('Progress saved');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/api/progress', async (req, res) => {
    if (!req.session.userID) {
        return res.status(401).send('Not authenticated');
    }

    try {
        const progress = await getProgress(req.session.userID);
        if (!progress) {
            return res.status(404).send('No progress found');
        }
        res.json(progress);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
