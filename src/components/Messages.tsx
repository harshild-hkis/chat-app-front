import { Message } from "../utils/interface";
import "./index.css";

interface Props {
  messages: Message[];
  joinedRoom: boolean;
}

const Messages = ({ messages, joinedRoom }: Props) => {
  return (
    <div
      style={{
        marginBottom: "20px",
        height: "70vh",
        overflow: "auto",
        paddingRight: "20px",
      }}
      id="messageContainer"
    >
      {messages.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: item.sendByYou ? "flex-end" : "flex-start",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              backgroundColor: item.sendByYou ? "#007bff" : "#4caf50",
              color: item.sendByYou ? "#fff" : "#000",
              borderRadius: "5px",
              padding: "10px 15px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              maxWidth: "70%",
              wordWrap: "break-word",
              marginLeft: item.sendByYou ? "auto" : "0",
            }}
          >
            {joinedRoom && !item.sendByYou ? (
              <div
                className="userName"
                style={{ marginBottom: "5px", fontSize: "16px" }}
              >
                {item.from}:
              </div>
            ) : null}
            <span style={{ fontSize: "18px" }}>{item.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Messages;
