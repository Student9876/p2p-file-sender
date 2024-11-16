"use client";
import {useState} from "react";
import {useRouter} from "next/router";
import io from "socket.io-client";

let socket; // Global socket connection

export default function Home() {
	const [userId, setUserId] = useState("");
	const router = useRouter();

	// Connect to the signaling server
	function handleConnect() {
		socket = io("http://localhost:3001");
		socket.on("connect", () => {
			const uniqueId = socket.id;
			setUserId(uniqueId);
			console.log("Connected with ID:", uniqueId);
		});
	}

	// Navigate to the file-sharing page
	function goToFileSharing() {
		router.push(`/files?userId=${userId}`);
	}

	return (
		<div className="h-screen flex items-center justify-center bg-gray-100">
			<div className="p-8 bg-white shadow-md rounded-md">
				<h1 className="text-2xl font-bold mb-4">P2P File Sender</h1>
				{!userId && (
					<button onClick={handleConnect} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
						Connect
					</button>
				)}
				{userId && (
					<div className="mt-4">
						<p className="mb-2">
							Your Unique ID: <strong>{userId}</strong>
						</p>
						<button onClick={goToFileSharing} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
							Go to File Sharing
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
