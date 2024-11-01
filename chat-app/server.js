// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}));

const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.json());

let users = [];

// Function to translate messages
async function translateMessage(message, sourceLang, targetLang) {
    const options = {
        method: 'POST',
        url: 'https://deep-translate1.p.rapidapi.com/language/translate/v2',
        headers: {
            'x-rapidapi-key': '',
            'x-rapidapi-host': 'deep-translate1.p.rapidapi.com',
            'Content-Type': 'application/json'
        },
        data: {
            q: message,
            source: sourceLang,
            target: targetLang
        }
    };

    try {
        const response = await axios.request(options);
        return response.data.data.translations.translatedText;
    } catch (error) {
        console.error('Error translating message:', error);
        return message; // Fallback to original message if translation fails
    }
}

io.on('connection', (socket) => {
    // Register user
    socket.on('register', ({ name, language }) => {
        const user = { id: socket.id, name, language };
        users.push(user);
        io.emit('userList', users);
    });

    // Send message event
    socket.on('sendMessage', async ({ message, toId }) => {
        const sender = users.find(user => user.id === socket.id);
        const receiver = users.find(user => user.id === toId);

        if (sender && receiver) {
            const translatedMessage = await translateMessage(message, sender.language.slice(0, 2), receiver.language.slice(0, 2));
            io.to(toId).emit('receiveMessage', { message: translatedMessage, from: sender.name, language: sender.language });
        }
    });

    // Disconnect event
    socket.on('disconnect', () => {
        users = users.filter(user => user.id !== socket.id);
        io.emit('userList', users);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
