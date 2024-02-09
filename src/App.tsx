import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ListOfUser, Message } from "./utils/interface";
import { BACKEND } from "./utils/constant";
import Messages from "./components/Messages";

const socket = io(BACKEND);

const backgroundColors = [
  "#4caf50", // Green
  "#ffeb3b", // Yellow
  "#00bcd4", // Cyan
  "#ff9800", // Orange
  "#e91e63", // Pink
  "#009688", // Teal
  "#64dd17", // Light Green
  "#ffca28", // Amber
  "#ff4081", // Pink Accent
];

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState(
    localStorage.getItem("userName") ?? ""
  );
  const [password, setPassword] = useState("");
  const [listOfUser, setListOfUser] = useState<ListOfUser[]>([]);
  const [roomJoiners, setRoomJoiners] = useState<string[]>([]);
  const [sender, setSender] = useState({ _id: "", userName: "" });
  const [senderIsTyping, setSenderIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("user_id") ?? null
  );
  const [messageContent, setMessageContent] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);

  const chatColor = useMemo(
    () => backgroundColors[Math.floor(Math.random() * backgroundColors.length)],
    []
  );

  useEffect(() => {
    const onConnect = () => setIsConnected(true);

    const onDisconnect = () => setIsConnected(true);

    const onMessageReceive = (value: Message) => {
      scrollTopBottomForMessages();
      setMessages((previous) => [...previous, value]);
    };

    if (userId) {
      socket.on("connect", onConnect);
      socket.on(`message_received_${userId}`, onMessageReceive);
      socket.on("disconnect", onDisconnect);
      return () => {
        socket.emit("on_left_room", userName);

        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off(`message_received_${userId}`, onMessageReceive);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, userId]);

  useEffect(() => {
    if (senderIsTyping) {
      const timer = setTimeout(() => {
        setSenderIsTyping(false);
      }, 5000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [senderIsTyping]);

  /**
   * Event for typing start and end
   */
  useEffect(() => {
    const onstartTyping = () => {
      setSenderIsTyping(true);
    };
    const onEndTyping = () => setSenderIsTyping(false);

    if (userId && sender._id) {
      socket.on(`started_typing_${sender._id}_${userId}`, onstartTyping);
      socket.on(`ended_typing_${sender._id}_${userId}`, onEndTyping);
      return () => {
        socket.off(`started_typing_${sender._id}_${userId}`, onstartTyping);
        socket.off(`ended_typing_${sender._id}_${userId}`, onEndTyping);
      };
    }
  }, [userId, sender._id]);

  /**
   * Event for room
   */
  useEffect(() => {
    if (joinedRoom) {
      const onJoin = (payload: string[]) =>
        setRoomJoiners(payload.filter((name) => name !== userName));

      socket.on("update_join_array", onJoin);
      return () => {
        socket.off("update_join_array", onJoin);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedRoom]);

  useEffect(() => {
    if (userId) getUserList(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setMessage = useCallback(
    (e: string) => setMessageContent(e),
    [setMessageContent]
  );

  const scrollTopBottomForMessages = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      setTimeout(() => {
        const elem = document.querySelector("#messageContainer");
        if (elem) {
          elem.scrollTo({
            top: elem.scrollHeight,
            behavior,
          });
        }
      }, 50);
    },
    []
  );

  const sendMessage = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (messageContent && userId) {
        const payload = {
          message: messageContent,
          from: userId,
          to: sender._id ?? null,
          sendAll: joinedRoom,
          ...(joinedRoom ? { bgColor: chatColor } : {}),
        };
        setMessages((pre) => [...pre, { ...payload, sendByYou: true }]);
        socket.emit("send_message", payload);
        setMessageContent("");
        setError("");

        scrollTopBottomForMessages();
      } else setError("Message is missing");
    },
    [
      messageContent,
      userId,
      sender._id,
      joinedRoom,
      scrollTopBottomForMessages,
      setMessages,
      chatColor,
    ]
  );

  const startTyping = useCallback(
    (e: string) => {
      setMessage(e);
      if (userId && sender._id) {
        socket.emit(e ? "start_typing" : "end_typing", {
          to: sender._id,
          from: userId,
        });
      }
    },
    [setMessage, userId, sender._id]
  );

  const getUserList = useCallback(async (id: string) => {
    const getResponse = await axios.get(`${BACKEND}/user-list/${id}`);

    setListOfUser(getResponse?.data?.data ?? []);
  }, []);

  const onLogin = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const apiResponse = await axios.post(`${BACKEND}/sign`, {
        userName,
        password,
      });

      if (apiResponse.data?.userId) {
        const userId = apiResponse.data.userId;
        localStorage.setItem("user_id", userId);
        localStorage.setItem("userName", userName);
        setUserId(userId);
        getUserList(userId);
        setError("");
      } else setError(apiResponse.data.message || "Something want wrong");
    },
    [userName, password, getUserList]
  );

  const onSelectSender = useCallback(
    async (payload: string) => {
      const getResponse = await axios.get(
        `${BACKEND}/message-list/${userId}/${payload}`
      );
      setMessages(getResponse.data?.data ?? []);
      const senderDetails = listOfUser.find((item) => item._id === payload);
      if (senderDetails) setSender(senderDetails);

      scrollTopBottomForMessages("instant");
    },
    [userId, listOfUser, scrollTopBottomForMessages]
  );

  const onJoinRoom = useCallback(() => {
    setJoinedRoom(true);
    socket.emit("on_join_room", userName);
  }, [userName]);

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#f0f0f0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          padding: "20px",
          flex: "1",
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
              <strong>
                Joined room chat with{" "}
                {roomJoiners?.join(",") || "random person"}
              </strong>
              <small style={{ display: "block", color: "#666" }}>
                (End-to-End encrypted)
              </small>
            </div>
          ) : (
            `Socket Health: ${isConnected ? "Connected" : "Disconnected"}`
          )}
        </h1>

        <small style={{ color: "red", display: "block", marginBottom: "10px" }}>
          {error}
        </small>

        {(joinedRoom || sender._id !== "") && (
          <Messages messages={messages} joinedRoom={joinedRoom} />
        )}
        {userId ? (
          <>
            {!sender._id && !joinedRoom ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <select
                  onChange={(e) => onSelectSender(e.target.value)}
                  value={sender._id}
                  style={{
                    padding: "8px",
                    marginRight: "10px",
                    width: "150px",
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
                  onClick={onJoinRoom}
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
              <>
                <div
                  className={senderIsTyping ? "typingAnimation" : ""}
                  style={{ marginRight: "10px" }}
                >
                  {senderIsTyping ? `${sender.userName} is typing...` : null}
                </div>
                <form
                  style={{
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    position: "absolute",
                    bottom: 0,
                    width: "95%",
                  }}
                  className="messageContainer"
                  onSubmit={sendMessage}
                >
                  <input
                    name="message"
                    placeholder="Enter message"
                    onChange={(e) => startTyping(e.target.value)}
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
                    type="submit"
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
                </form>
              </>
            )}
          </>
        ) : (
          <form onSubmit={(e) => userName && password && onLogin(e)}>
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
              type="submit"
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
          </form>
        )}
      </div>
    </div>
  );
};

export default App;
