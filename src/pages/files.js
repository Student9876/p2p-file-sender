import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/router";
import io from "socket.io-client";

let socket;

export default function FileSharing() {
	const router = useRouter();
	const {userId} = router.query;
	const [recipientId, setRecipientId] = useState("");
	const [selectedFile, setSelectedFile] = useState(null);
	const [peerConnection, setPeerConnection] = useState(null);
	const dataChannelRef = useRef(null);

	useEffect(() => {
		socket = io("http://localhost:3001");

		socket.on("connect", () => {
			console.log(`Connected to signaling server as ${socket.id}`);
		});

		// Handle incoming file transfer requests
		socket.on("file-transfer-request", async (data) => {
			console.log("Received file-transfer-request:", data);
			const accept = window.confirm(`User ${data.from} wants to send you the file "${data.fileName}". Do you accept?`);
			if (accept) {
				console.log("File transfer accepted");
				const pc = createPeerConnection(data.from);
				setPeerConnection(pc);
				socket.emit("file-transfer-response", {to: data.from, accepted: true});
			} else {
				console.log("File transfer declined");
				socket.emit("file-transfer-response", {to: data.from, accepted: false});
			}
		});

		// Handle file transfer response
		socket.on("file-transfer-response", (data) => {
			if (!data.accepted) {
				alert("Recipient declined the file transfer.");
				return;
			}
			console.log("Recipient accepted the file transfer.");
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	function handleFileSelect(event) {
		setSelectedFile(event.target.files[0]);
	}

	async function sendFileRequest() {
		if (!recipientId || !selectedFile) {
			alert("Please enter a recipient ID and select a file.");
			return;
		}

		const pc = createPeerConnection(recipientId);
		setPeerConnection(pc);

		socket.emit("file-transfer-request", {
			from: socket.id,
			to: recipientId,
			fileName: selectedFile.name,
		});

		alert(`File "${selectedFile.name}" is being sent to user ID: ${recipientId}`);
	}

	function createPeerConnection(remoteId) {
		const pc = new RTCPeerConnection();

		// Create data channel for file transfer
		const dataChannel = pc.createDataChannel("fileTransfer");
		dataChannel.onopen = () => {
			console.log("Data channel is open");
			if (selectedFile) {
				sendFile(dataChannel, selectedFile);
			}
		};
		dataChannel.onclose = () => console.log("Data channel is closed");
		dataChannelRef.current = dataChannel;

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socket.emit("ice-candidate", {
					to: remoteId,
					candidate: event.candidate,
				});
			}
		};

		// Listen for ICE candidates from the remote peer
		socket.on("ice-candidate", (data) => {
			if (data.candidate) {
				pc.addIceCandidate(new RTCIceCandidate(data.candidate));
			}
		});

		// Handle SDP offer/answer exchange
		pc.onnegotiationneeded = async () => {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			socket.emit("offer", {to: remoteId, offer});
		};

		socket.on("offer", async (data) => {
			pc.setRemoteDescription(new RTCSessionDescription(data.offer));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			socket.emit("answer", {to: data.from, answer});
		});

		socket.on("answer", (data) => {
			pc.setRemoteDescription(new RTCSessionDescription(data.answer));
		});

		return pc;
	}

	function sendFile(dataChannel, file) {
		const chunkSize = 16 * 1024; // 16 KB
		const fileReader = new FileReader();
		let offset = 0;

		fileReader.onload = () => {
			dataChannel.send(fileReader.result);
			offset += fileReader.result.byteLength;

			if (offset < file.size) {
				readSlice(offset);
			} else {
				console.log("File sent successfully");
			}
		};

		function readSlice(o) {
			const slice = file.slice(o, o + chunkSize);
			fileReader.readAsArrayBuffer(slice);
		}

		readSlice(0);
	}

	return (
		<div>
			<h1>File Sharing</h1>
			<p>
				Your ID: <strong>{socket?.id}</strong>
			</p>
			<input type="text" placeholder="Recipient ID" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} />
			<input type="file" onChange={handleFileSelect} />
			<button onClick={sendFileRequest}>Send File</button>
		</div>
	);
}
