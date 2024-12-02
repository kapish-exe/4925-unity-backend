const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Import the CORS middleware
require('dotenv').config();

const { registerUser, getUserByUsername, saveProgress, getProgress } = require('./database/user');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure CORS
const corsOptions = {
    origin: process.env.CORS_ALLOWED_ORIGIN || '*', // Allow all origins or specify the allowed origin(s)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
    credentials: true // Allow cookies and credentials
};
app.use(cors(corsOptions));

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
});

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true
}));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    // Input validation
    if (
        !username ||
        !/^[a-zA-Z0-9]{3,20}$/.test(username) || // Alphanumeric, 3-20 characters
        !password ||
        password.length < 10
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid input. Username must be alphanumeric (3-20 characters). Password must be at least 10 characters long.'
        });
    }

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Register user in the database
        await registerUser(username, hashedPassword);

        // Respond with success
        res.status(201).json({
            success: true,
            message: 'User registered'
        });
    } catch (err) {
        console.error('Error registering user:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, message: 'Username already exists' });
        } else {
            res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again later.' });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Store userID in session
        req.session.userID = user.id;

        // Send structured response
        res.json({
            success: true,
            message: 'Logged in successfully',
            userID: user.user_id,
            username: user.username // Optional, if needed
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate the username and password
    const user = await findUser(username, password); // Replace with your database query
    if (!user) {
        return res.status(401).json({
            status: "error",
            message: "Invalid username or password"
        });
    }

    // Successful login
    res.json({
        status: "success",
        message: "Logged in successfully",
        userID: user.id,          
        username: user.username,  
    });
});


app.post('/api/progress', async (req, res) => {
    const { userID, level, coins } = req.body;

    // Input validation
    if (!userID || level === undefined || coins === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: userID, level, or coins.',
        });
    }

    try {
        // Save progress in the database
        await saveProgress(userID, level, coins);

        // Respond with success
        res.status(200).json({
            success: true,
            message: 'Progress saved successfully.',
            data: {
                userID: userID,
                level: level,
                coins: coins,
            },
        });
    } catch (err) {
        // Log the error and send a 500 response
        console.error('Error saving progress:', err);
        res.status(500).json({
            success: false,
            message: 'An error occurred while saving progress.',
            error: err.message,
        });
    }
});


app.get('/api/progress', async (req, res) => {
    // if (!req.session.userID) {
    //     return res.status(401).send('Not authenticated');
    // }
    const userID = req.query.userID; 
    if (!userID) {
        return res.status(400).send('User ID is required');
    }

    try {
        const progress = await getProgress(userID);
        // const progress = await getProgress(req.session.userID);
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
    console.log(`Server running on port ${PORT} - http://localhost:${PORT}`);
});
