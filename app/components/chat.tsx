"use client";

import React, { useEffect, useRef, useState } from "react";

import { AssistantStream } from "openai/lib/AssistantStream";
import {
  AssistantStreamEvent,
  RequiredActionFunctionToolCall,
} from "openai/resources";
import Markdown from "react-markdown";

import styles from "./chat.module.css";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown
        components={{
          a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
        }}
      >
        {text}
      </Markdown>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return null;
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
  searchWebHandler?: (query: string) => Promise<string>;
  exaSearchHandler?: (query: string) => Promise<string>;
};

const Chat = ({ functionCallHandler, searchWebHandler, exaSearchHandler }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  const sendMessage = async (text) => {
    try {
      const response = await fetch(
        `/api/assistants/threads/${threadId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content: text,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", text: "An error occurred while sending the message. Please try again." },
      ]);
      setInputDisabled(false);
    }
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    try {
      const response = await fetch(
        `/api/assistants/threads/${threadId}/actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            runId: runId,
            toolCallOutputs: toolCallOutputs,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error("Error in submitActionResult:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", text: "An error occurred while processing the request. Please try again." },
      ]);
      setInputDisabled(false);
    }
  };

  const handleSubmit = (
    e?: React.FormEvent<HTMLFormElement>,
    input?: string
  ) => {
    if (e) e.preventDefault();

    const messageToSend = input || userInput;
    if (!messageToSend.trim()) return;

    sendMessage(messageToSend);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: messageToSend },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    }
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  };

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        let result;
        if (toolCall.function.name === "search_web") {
          console.log("calling searchWebHandler", toolCall);
          setIsSearching(true);
          result = await searchWebHandler(
            JSON.parse(toolCall.function.arguments).search_query
          );
          setIsSearching(false);
        } else if (toolCall.function.name === "exa_researcher") {
          console.log("calling exaSearchHandler", toolCall);
          setIsSearching(true);
          result = await exaSearchHandler(
            JSON.parse(toolCall.function.arguments).search_query
          );
          setIsSearching(false);
        } else {
          result = await functionCallHandler(toolCall);
        }
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    try {
      // messages
      stream.on("textCreated", handleTextCreated);
      stream.on("textDelta", handleTextDelta);

      // image
      stream.on("imageFileDone", handleImageFileDone);

      // code interpreter
      stream.on("toolCallCreated", toolCallCreated);
      stream.on("toolCallDelta", toolCallDelta);

      // events without helpers yet (e.g. requires_action and run.done)
      stream.on("event", (event) => {
        if (event.event === "thread.run.requires_action")
          handleRequiresAction(event);
        if (event.event === "thread.run.completed") handleRunCompleted();
      });

      stream.on("error", (error) => {
        console.error("Stream error:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", text: "An error occurred while processing the response. Please try again." },
        ]);
        setInputDisabled(false);
      });
    } catch (error) {
      console.error("Error handling readable stream:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", text: "An error occurred while processing the response. Please try again." },
      ]);
      setInputDisabled(false);
    }
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === "file_path") {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      });
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isSearching && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <p>Searching the web...</p>
        </div>
      )}
      {messages.length === 0 && (
        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() =>
              handleSubmit(undefined, "Who covers AI at TechCrunch?")
            }
          >
            Who covers AI at TechCrunch?
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() =>
              handleSubmit(undefined, "What does Kara Swisher cover?")
            }
          >
            What does Kara Swisher cover?
          </button>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() =>
              handleSubmit(
                undefined,
                "Which journalists and bloggers cover Apple?"
              )
            }
          >
            Who covers Apple?
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question (e.g. Who covers Apple?)"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;