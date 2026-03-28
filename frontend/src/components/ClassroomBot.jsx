import { useState } from "react";
import { chatWithClassroomBot } from "../services/classroomApi";

function ClassroomBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I am Classroom Bot. Ask me about available rooms, labs, maintenance, or resources.",
    },
  ]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) {
      return;
    }

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithClassroomBot(trimmed);
      const reply = response?.data?.reply || "I could not generate a response right now.";
      setMessages((current) => [...current, { role: "bot", text: reply }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "bot", text: `Sorry, I hit an error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-shell">
      {isOpen ? (
        <section className="chatbot-panel" aria-label="Classroom AI bot">
          <header className="chatbot-header">
            <div>
              <p className="eyebrow">Assistant</p>
              <h3>Classroom Bot</h3>
            </div>
            <button className="button ghost chatbot-close" onClick={() => setIsOpen(false)} type="button">
              Close
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <article className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </article>
            ))}
          </div>

          <form className="chatbot-input-row" onSubmit={sendMessage}>
            <input
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about rooms, labs, resources..."
              value={input}
            />
            <button className="button primary" disabled={loading} type="submit">
              {loading ? "..." : "Send"}
            </button>
          </form>
        </section>
      ) : null}

      <button className="chatbot-toggle" onClick={() => setIsOpen((open) => !open)} type="button">
        {isOpen ? "Hide Bot" : "AI Bot"}
      </button>
    </div>
  );
}

export default ClassroomBot;
