const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const rooms = {};

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {

    console.log("Usuário conectado:", socket.id);

    socket.on("join-room", ({ room, username }) => {

        socket.join(room);

        socket.room = room;
        socket.username = username;

        if (!rooms[room]) {
            rooms[room] = [];
        }

        rooms[room].push({
            id: socket.id,
            username
        });

        io.to(room).emit("user-list", rooms[room]);

        socket.to(room).emit("user-joined", {
            id: socket.id,
            username
        });

        const clients = rooms[room];

        clients.forEach(user => {

            if (user.id !== socket.id) {

                socket.emit("existing-user", {
                    id: user.id,
                    username: user.username
                });

            }

        });

    });

    socket.on("chat-message", (message) => {

        if (!socket.room) return;

        io.to(socket.room).emit("chat-message", {
            username: socket.username,
            message
        });

    });

    socket.on("offer", data => {
        io.to(data.target).emit("offer", {
            offer: data.offer,
            sender: socket.id
        });
    });

    socket.on("answer", data => {
        io.to(data.target).emit("answer", {
            answer: data.answer,
            sender: socket.id
        });
    });

    socket.on("ice-candidate", data => {
        io.to(data.target).emit("ice-candidate", {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    socket.on("disconnect", () => {

        const room = socket.room;

        if (!room || !rooms[room]) return;

        rooms[room] = rooms[room].filter(
            user => user.id !== socket.id
        );

        io.to(room).emit("user-list", rooms[room]);

        socket.to(room).emit("user-left", socket.id);

        if (rooms[room].length === 0) {
            delete rooms[room];
        }

        console.log("Usuário saiu:", socket.id);

    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
==================================
 NEXUS VOICE ONLINE
 Porta: ${PORT}
==================================
`);
});