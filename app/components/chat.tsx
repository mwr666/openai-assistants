"use client";

import React, { useEffect, useRef, useState } from "react";
import { generateCsv } from 'export-to-csv';

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
  timestamp: number;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  const formatResult = (result: string) => {
    const lines = result.split('\n');
    return (
      <div className={styles.result}>
        {lines.map((line, index) => {
          if (line.startsWith('Result')) {
            return <h3 key={index} className={styles.resultTitle}>{line}</h3>;
          } else if (line.includes(':')) {
            const [key, value] = line.split(':');
            return (
              <p key={index} className={styles.resultItem}>
                <strong>{key.trim()}:</strong>{' '}
                {key.trim().toLowerCase() === 'url' || key.trim().toLowerCase() === 'article links' || key.trim().toLowerCase() === 'tweet links' ? (
                  value.split(',').map((link, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && ', '}
                      <a href={link.trim()} target="_blank" rel="noopener noreferrer" className={styles.resultLink}>{link.trim()}</a>
                    </React.Fragment>
                  ))
                ) : (
                  value.trim()
                )}
              </p>
            );
          } else {
            return <p key={index} className={styles.resultText}>{line}</p>;
          }
        })}
      </div>
    );
  };

  return (
    <div className={styles.assistantMessage}>
      {text.includes('Result 1:') ? (
        text.split('Result').map((result, index) => 
          index === 0 ? null : formatResult(`Result${result}`)
        )
      ) : (
        <Markdown
          components={{
            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
          }}
        >
          {text}
        </Markdown>
      )}
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return null;
};

const Message = ({ role, text, timestamp }: MessageProps) => {
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

const loadMessagesFromStorage = () => {
  if (typeof window !== 'undefined') {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      const currentTime = new Date().getTime();
      const filteredMessages = parsedMessages.filter(msg => {
        return currentTime - msg.timestamp < 12 * 60 * 60 * 1000; // 12 hours in milliseconds
      });
      return filteredMessages;
    }
  }
  return [];
};

const Chat = ({ functionCallHandler, searchWebHandler, exaSearchHandler }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const savedHasResults = localStorage.getItem('hasResults');
    if (savedHasResults) {
      setHasResults(JSON.parse(savedHasResults));
    }
  }, []);

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
      const savedThreadId = localStorage.getItem('threadId');
      if (savedThreadId) {
        setThreadId(savedThreadId);
      } else {
        const res = await fetch(`/api/assistants/threads`, {
          method: "POST",
        });
        const data = await res.json();
        setThreadId(data.threadId);
        localStorage.setItem('threadId', data.threadId);
      }
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
      { role: "user", text: messageToSend, timestamp: new Date().getTime() },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
    updateHasResults(true);
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
    setMessages((prevMessages) => [...prevMessages, { role, text, timestamp: new Date().getTime() }]);
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

  useEffect(() => {
    const cleanup = () => {
      const currentTime = new Date().getTime();
      setMessages((prevMessages) => {
        const filteredMessages = prevMessages.filter(msg => currentTime - msg.timestamp < 12 * 60 * 60 * 1000);
        if (filteredMessages.length !== prevMessages.length) {
          localStorage.setItem('chatMessages', JSON.stringify(filteredMessages));
        }
        return filteredMessages;
      });
    };

    const interval = setInterval(cleanup, 60 * 60 * 1000); // Run every hour
    cleanup(); // Run immediately on mount

    return () => clearInterval(interval);
  }, []);

  const generateCSV = () => {
    console.log("Generating CSV...");
    console.log("All messages:", messages);
    let rows = [];

    messages.forEach((msg, index) => {
      console.log(`Processing message ${index}:`, msg);
      if (msg.role === "assistant") {
        const lines = msg.text.split('\n');
        
        lines.forEach(line => {
          console.log("Processing line:", line);
          // Keep numbered list prefixes and remove asterisks
          line = line.replace(/\*/g, '').trim();
          
          const numberedListMatch = line.match(/^(\d+\.)\s*(.*)/);
          if (numberedListMatch) {
            // This is a numbered list item
            const [, number, content] = numberedListMatch;
            rows.push({ Name: `${number} ${content}` });
            console.log("Added numbered item:", `${number} ${content}`);
          } else if (line.trim() !== '') {
            // Add non-empty lines that are not numbered
            rows.push({ Name: line });
            console.log("Added line:", line);
          }
        });
      }
    });

    console.log("Rows to be added to CSV:", rows);
    return rows.length > 0 ? rows : [{ Name: 'No data available' }];
  };

  const exportToCSV = () => {
    console.log("exportToCSV function called");
    const data = generateCSV();

    const options = {
      fieldSeparator: ',',
      quoteStrings: true,
      decimalSeparator: '.',
      showLabels: true,
      showTitle: false,
      title: 'Journalists Export',
      useTextFile: false,
      useBom: true,
      useKeysAsHeaders: true,
    };

    const csvExporter = generateCsv(options);
    const csv = csvExporter(data);

    const blob = new Blob([csv.toString()], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'journalists_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    console.log("CSV file download initiated");
  };

  const updateHasResults = (value) => {
    setHasResults(value);
    localStorage.setItem('hasResults', JSON.stringify(value));
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} timestamp={msg.timestamp} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isSearching && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <p>Searching the web...</p>
        </div>
      )}
      {messages.length > 0 && (
        <div className={styles.exportContainer}>
          <button
            onClick={() => {
              console.log("Export button clicked");
              exportToCSV();
            }}
            className={`${styles.button} ${styles.exportButton}`}
          >
            Export to CSV
          </button>
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
                "Which journalists and bloggers cover OpenAI?"
              )
            }
          >
            Who covers OpenAI?
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
          placeholder="Enter your question (e.g. Who covers OpenAI?)"
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