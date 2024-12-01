const db = require('./databaseConnection');
// check pull and merge

// Register a new user
async function registerUser(username, hashedPassword) {
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    try {
        await db.query(query, [username, hashedPassword]);
    } catch (err) {
        console.error('Error registering user:', err);
        throw err;
    }
}

// Check if a username exists
async function getUserByUsername(username) {
    const query = 'SELECT user_id, password, username FROM users WHERE username = ?';
    try {
        const [rows] = await db.query(query, [username]);
        return rows[0];
    } catch (err) {
        console.error('Error fetching user by username:', err);
        throw err;
    }
}

// Save or update user progress
async function saveProgress(userID, level, coins) {
    const query = `
        INSERT INTO progress (user_id, level, coins)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE level = ?, coins = ?`
            try {
        await db.query(query, [userID, level, coins]);
    } catch (err) {
        console.error('Error saving progress:', err);
        throw err;
    }
}

// Get user progress
async function getProgress(userID) {
    const query = 'SELECT * FROM progress WHERE user_id = ?';
    // const query = 'SELECT level, coins, enemies_defeated FROM progress WHERE user_id = ?';
    try {
        const [rows] = await db.query(query, [userID]);
        return rows[0];
    } catch (err) {
        console.error('Error fetching progress:', err);
        throw err;
    }
}

module.exports = {
    registerUser,
    getUserByUsername,
    saveProgress,
    getProgress,
};
