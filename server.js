const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "https://p2p-file-sender.vercel.app/",
		methods: ["GET", "POST"],
	},
});

// Store connected clients
const clients = {};

io.on("connection", (socket) => {
	console.log(`User connected: ${socket.id}`);
	clients[socket.id] = socket;

	// Handle file transfer request
	socket.on("file-transfer-request", (data) => {
		const recipientSocket = clients[data.to];
		if (recipientSocket) {
			console.log(`File transfer request from ${data.from} to ${data.to}`);
			recipientSocket.emit("file-transfer-request", data);
		}
	});

	// Handle file transfer response
	socket.on("file-transfer-response", (data) => {
		const senderSocket = clients[data.to];
		if (senderSocket) {
			console.log(`File transfer response from ${data.from} to ${data.to}`);
			senderSocket.emit("file-transfer-response", data);
		}
	});

	// Handle ICE candidates
	socket.on("ice-candidate", (data) => {
		const recipientSocket = clients[data.to];
		if (recipientSocket) {
			recipientSocket.emit("ice-candidate", data);
		}
	});

	// Handle SDP offer
	socket.on("offer", (data) => {
		const recipientSocket = clients[data.to];
		if (recipientSocket) {
			recipientSocket.emit("offer", {offer: data.offer, from: data.from});
		}
	});

	// Handle SDP answer
	socket.on("answer", (data) => {
		const senderSocket = clients[data.to];
		if (senderSocket) {
			senderSocket.emit("answer", {answer: data.answer, from: data.from});
		}
	});

	// Cleanup on disconnect
	socket.on("disconnect", () => {
		console.log(`User disconnected: ${socket.id}`);
		delete clients[socket.id];
	});
});

server.listen(3001, () => {
	console.log("Server running on http://localhost:3001");
});
