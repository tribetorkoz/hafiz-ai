import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenerativeAI } from "@google/genai";

function App() {
  const [response, setResponse] = React.useState("");

  async function askAI() {
    const client = new GoogleGenerativeAI({
      apiKey: "YOUR_API_KEY"
    });

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent("اكتب آية قرآنية مع شرح بسيط لها.");
    setResponse(result.response.text());
  }

  return (
    <div style={{ padding: 20 }}>
      <button 
        onClick={askAI}
        style={{
          background: "#f59e0b",
          padding: "10px 20px",
          borderRadius: "8px"
        }}
      >
        ارسال طلب
      </button>
      <p style={{ marginTop: 20 }}>{response}</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
