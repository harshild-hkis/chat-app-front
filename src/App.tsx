import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ListOfUser, Message } from "./utils/interface";
import { BACKEND } from "./utils/constant";
import Messages from "./components/Messages";

const socket = io(BACKEND);

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [listOfUser, setListOfUser] = useState<ListOfUser[]>([]);
  const [sender, setSender] = useState({ _id: "", userName: "" });
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);

    const onDisconnect = () => setIsConnected(true);

    const onMessageReceive = (value: Message) => {
      console.log(value);
      setMessages((previous) => [...previous, value]);
    };

    if (userId) {
      socket.on("connect", onConnect);
      socket.on(`message_received_${userId}`, onMessageReceive);
      socket.on("disconnect", onDisconnect);
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off(`message_received_${userId}`, onMessageReceive);
      };
    }
  }, [userName, userId]);

  const setMessage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessageContent(e.target.value);
    },
    [setMessageContent]
  );

  const sendMessage = useCallback(() => {
    if (messageContent && userId) {
      const payload = {
        message: messageContent,
        from: userId,
        to: sender._id,
        sendAll: joinedRoom,
      };
      setMessages((pre) => [...pre, { ...payload, sendByYou: true }]);
      socket.emit("send_message", payload);
      setMessageContent("");
      setError("");
    } else setError("Message is missing");
  }, [messageContent, userId, sender, joinedRoom]);

  const onLogin = useCallback(async () => {
    const apiResponse = await axios.post(`${BACKEND}/sign`, {
      userName,
      password,
    });

    if (apiResponse.data?.userId) {
      const userId = apiResponse.data.userId;
      setUserId(userId);
      const getResponse = await axios.get(`${BACKEND}/user-list/${userId}`);

      setListOfUser(getResponse?.data?.data ?? []);
      setError("");
    } else setError(apiResponse.data.message || "Something want wrong");
  }, [password, userName]);

  const onSelectSender = useCallback(
    async (payload: string) => {
      const getResponse = await axios.get(
        `${BACKEND}/message-list/${userId}/${payload}`
      );
      setMessages(getResponse.data?.data ?? []);
      const senderDetails = listOfUser.find((item) => item._id === payload);
      if (senderDetails) setSender(senderDetails);
    },
    [userId, listOfUser]
  );

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "20px",
        backgroundColor: "#f0f0f0",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "20px",
          fontFamily: "Arial, sans-serif",
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        {sender._id ? (
          `Connected with: ${sender.userName}`
        ) : joinedRoom ? (
          <div
            style={{
              backgroundColor: "#f0f0f0",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "10px",
            }}
          >
            <strong>Joined room chat with random person</strong>
            <small style={{ display: "block", color: "#666" }}>
              (Don't worry your chat will not save in room mode)
            </small>
          </div>
        ) : (
          `Socket Health: ${isConnected ? "Connected" : "Disconnected"}`
        )}
      </h1>

      <small style={{ color: "red", display: "block", marginBottom: "10px" }}>
        {error}
      </small>

      <Messages messages={messages} joinedRoom={joinedRoom} />
      {userId ? (
        <>
          {!sender._id && !joinedRoom ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center", // Center horizontally
                marginBottom: "20px",
              }}
            >
              <select
                onChange={(e) => onSelectSender(e.target.value)}
                value={sender._id}
                style={{
                  padding: "8px",
                  marginRight: "10px",
                  width: "150px", // Reduced width
                  fontSize: "16px",
                }}
              >
                <option value="" style={{ fontSize: "16px", height: "40px" }}>
                  Select a user
                </option>
                {listOfUser.map((option, index) => (
                  <option
                    key={index}
                    value={option._id}
                    style={{ fontSize: "16px", height: "40px" }}
                  >
                    {option.userName}
                  </option>
                ))}
              </select>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "16px",
                  fontWeight: "bold",
                  marginRight: "10px",
                }}
              >
                OR
              </div>
              <button
                onClick={() => setJoinedRoom(true)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Join Room
              </button>
            </div>
          ) : (
            <div
              style={{
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                name="message"
                placeholder="Enter message"
                onChange={(e) => setMessage(e)}
                value={messageContent}
                style={{
                  padding: "10px",
                  marginRight: "10px",
                  flex: "1",
                  border: "2px solid #007bff",
                  borderRadius: "8px",
                  fontSize: "16px",
                  color: "#333",
                  outline: "none",
                  transition: "border-color 0.3s",
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: "12px 25px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Submit
              </button>
            </div>
          )}
        </>
      ) : (
        <div>
          <input
            autoFocus
            name="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your user name"
            style={{
              padding: "10px",
              marginBottom: "10px",
              width: "100%",
              boxSizing: "border-box",
              border: "2px solid #007bff",
              borderRadius: "8px",
              fontSize: "16px",
              color: "#333",
              outline: "none",
              transition: "border-color 0.3s",
            }}
          />
          <input
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            type="password"
            style={{
              padding: "10px",
              marginBottom: "10px",
              width: "100%",
              boxSizing: "border-box",
              border: "2px solid #007bff",
              borderRadius: "8px",
              fontSize: "16px",
              color: "#333",
              outline: "none",
              transition: "border-color 0.3s",
            }}
          />
          <button
            onClick={() => userName && password && onLogin()}
            style={{
              padding: "12px 25px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
