/* ⚖️ LexMask v4.0 (Plugin Ready)
 * - Accepts private secrets from TypingMind Plugin System
 * - Stream Safe & UI Safe
 */

(function() {
    // --- 1. CONFIGURATION RECEIVER ---
    // We look for a global variable set by the TypingMind Plugin
    const PLUGIN_SECRETS = window.LEXMASK_PRIVATE_LIST || [];
    
    // --- 2. SETUP ---
    const OLD_CONTAINER_ID = 'lexmask-container';
    const existingContainer = document.getElementById(OLD_CONTAINER_ID);
    if (existingContainer) existingContainer.remove();

    console.log(`⚖️ LexMask v4.0 Online. Loaded ${PLUGIN_SECRETS.length} private rules.`);
    
    const STORAGE_KEY = "lexmask_entity_map"; 
    let entityMap = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

    function saveToMemory() { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...entityMap])); 
    }

    function getAlias(text, prefix) {
        const key = text.trim(); 
        if (!entityMap.has(key)) {
            let count = 0;
            entityMap.forEach((val) => { if(val.includes(`[${prefix}_`)) count++; });
            let alias = `[${prefix}_${count + 1}]`; 
            entityMap.set(key, alias);
            entityMap.set(alias, key); 
            saveToMemory();
        }
        return entityMap.get(key);
    }

    // --- 3. NLP ENGINE ---
    let nlpReady = false;
    const script = document.createElement('script');
    script.src = "https://unpkg.com/compromise@latest/builds/compromise.min.js";
    script.onload = () => { nlpReady = true; };
    document.head.appendChild(script);

    // --- 4. MASKING ENGINE ---
    function maskText(text) {
        let cleanText = text;
        let masked = false;

        // A. Private Blacklist (From Plugin)
        PLUGIN_SECRETS.forEach(word => {
            if (word && cleanText.toLowerCase().includes(word.toLowerCase())) {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                cleanText = cleanText.replace(regex, (match) => {
                    masked = true;
                    return getAlias(match, "Redacted"); 
                });
            }
        });

        // B. NLP (Smart Detection)
        if (nlpReady && window.nlp) {
            const doc = window.nlp(cleanText);
            doc.people().forEach(p => {
                const name = p.text();
                if (name.length > 2) { 
                    cleanText = cleanText.replace(new RegExp(`\\b${name}\\b`, 'g'), getAlias(name, "Client"));
                    masked = true;
                }
            });
            doc.organizations().forEach(o => {
                const org = o.text();
                if (org.length > 2) {
                    cleanText = cleanText.replace(new RegExp(`\\b${org}\\b`, 'g'), getAlias(org, "Company"));
                    masked = true;
                }
            });
        }

        // C. Regex Patterns
        const STATIC_RULES = [
            { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, prefix: "Email" },
            { regex: /\b(?:\d[ -]*?){13,16}\b/g, prefix: "Card" },
            { regex: /\b(?:\d{3}[-.]?){2}\d{4}\b/g, prefix: "ID" }
        ];

        STATIC_RULES.forEach(rule => {
            cleanText = cleanText.replace(rule.regex, (match) => {
                masked = true;
                return getAlias(match, rule.prefix);
            });
        });

        return { text: cleanText, wasMasked: masked };
    }

    function unmaskText(text) {
        let cleanText = text.replace(/ 🔒/g, ""); 
        const aliasPattern = /\[(Client|Company|Entity|Email|Card|ID|Redacted)_\d+\]/g;
        return cleanText.replace(aliasPattern, (match) => entityMap.has(match) ? entityMap.get(match) : match);
    }

    // --- 5. UI ACTIONS ---
    function handleSend(textarea) {
        let result = maskText(textarea.value);
        if (result.wasMasked) {
            let setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            setter.call(textarea, result.text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            textarea.style.backgroundColor = "#d4edda"; 
            setTimeout(() => { 
                let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
                if (send) send.click();
                textarea.style.backgroundColor = "";
            }, 200);
        } else {
            let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
            if (send) send.click();
        }
    }

    function revealAll() {
        let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            let txt = node.nodeValue;
            if (txt && txt.includes("[") && txt.includes("]")) {
                if (/\[(Client|Company|Email|Card|ID|Redacted)_\d+\]/.test(txt)) {
                    entityMap.forEach((real, alias) => {
                        if (txt.includes(alias)) {
                            if (node.parentElement && node.parentElement.closest('[data-element-id]')) {
                                node.nodeValue = txt.split(alias).join(`${real} 🔒`);
                            }
                        }
                    });
                }
            }
        }
    }

    // --- 6. HUD INTERFACE ---
    function initUI() {
        if (document.getElementById(OLD_CONTAINER_ID)) return;

        let container = document.createElement('div');
        container.id = OLD_CONTAINER_ID;
        container.style.cssText = `
            position: fixed; bottom: 80px; right: 20px; 
            display: flex; gap: 6px; z-index: 9999; 
            opacity: 0.6; transition: opacity 0.2s; 
            font-family: sans-serif; background: #222; 
            padding: 6px; border-radius: 8px; border: 1px solid #444; color: #fff;
        `;
        container.onmouseenter = () => container.style.opacity = "1";
        container.onmouseleave = () => container.style.opacity = "0.6";

        let btn = document.createElement('div');
        btn.innerHTML = `🛡️`;
        btn.title = "Secure Send";
        btn.style.cssText = `cursor: pointer; font-size: 18px;`;
        btn.onmousedown = (e) => {
            e.preventDefault(); 
            let textarea = document.querySelector('textarea');
            if (textarea) handleSend(textarea);
        };

        let revealBtn = document.createElement('div');
        revealBtn.innerHTML = `👁️`;
        revealBtn.title = "Reveal Page";
        revealBtn.style.cssText = `cursor: pointer; font-size: 18px; border-left: 1px solid #555; padding-left: 6px;`;
        revealBtn.onmousedown = (e) => {
            e.preventDefault();
            revealAll();
        };

        let copyBtn = document.createElement('div');
        copyBtn.innerHTML = `📋`;
        copyBtn.title = "Copy Selection";
        copyBtn.style.cssText = `cursor: pointer; font-size: 18px; border-left: 1px solid #555; padding-left: 6px;`;
        copyBtn.onmousedown = async (e) => {
            e.preventDefault();
            let textToProcess = window.getSelection().toString();
            if (!textToProcess) {
                 let messages = document.querySelectorAll('[data-element-id="ai-message"]');
                 if (messages.length > 0) textToProcess = messages[messages.length - 1].innerText;
            }
            if (textToProcess) {
                let clean = unmaskText(textToProcess);
                await navigator.clipboard.writeText(clean);
                copyBtn.innerHTML = "✅";
                setTimeout(() => copyBtn.innerHTML = "📋", 1000);
            }
        };

        container.appendChild(btn);
        container.appendChild(revealBtn);
        container.appendChild(copyBtn);
        document.body.appendChild(container);
    }
    
    setTimeout(initUI, 1000);
})();
