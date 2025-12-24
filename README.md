# ⚖️ LexMask Local (Stealth Edition)

**A client-side privacy shield for TypingMind.**

LexMask Local is a lightweight JavaScript extension that automatically redacts Personally Identifiable Information (PII) from your prompts *before* they are sent to AI providers (OpenAI, Anthropic, etc.).

It runs 100% in your browser. No proxies, no external servers, and no data leaks.

## 🚀 Features

* **🛡️ Smart Redaction:** Uses an embedded NLP engine (Compromise.js) to automatically detect names, companies, and locations.
* **🔒 Private Blacklist:** Add your own secret words (e.g., project codes) via the Settings menu. These are stored locally on your device and never uploaded.
* **📱 Stealth Mode:** The UI is a transparent, edge-hugging sidebar designed to never block your screen on mobile or desktop.
* **📋 Secure Decryption:** One-click copy button to restore original names when copying AI responses.

## 🛠️ Installation

1.  Open **TypingMind**.
2.  Go to **Settings** > **Extensions**.
3.  Click **Install Extension**.
4.  Paste the following URL:
    ```text
    [https://ElementaryBytes.github.io/LexMask-Local/lexmask.js](https://ElementaryBytes.github.io/LexMask-Local/lexmask.js)
    ```
5.  Click **Install** and refresh the page.

## 💡 How to Use

Look for the transparent sidebar on the **middle-right edge** of your screen. Hover over it (or tap on mobile) to wake it up.

| Icon | Function |
| :--- | :--- |
| **🛡️** | **Secure Send:** Masks your input (e.g., `John Doe` → `[Client_1]`) and sends it to the AI. |
| **👁️** | **Reveal:** Unmasks the current page so you can read the AI's response naturally. |
| **📋** | **Copy:** Copies the selected text (or the last AI message) to your clipboard with all real names restored. |
| **⚙️** | **Settings:** Add custom words to your private blacklist (comma-separated). |

## 🔒 Privacy Note

* **Client-Side Only:** All masking happens in your browser memory.
* **Local Storage:** Your "Entity Map" (which matches `[Client_1]` to `John Doe`) is stored in your browser's `localStorage` and is never transmitted.
* **Zero Logs:** This extension has no analytics or tracking.

## 📄 License

MIT License. Free for personal and professional use.
