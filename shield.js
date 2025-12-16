/* 🛡️ TYPINGMIND SECURE SHIELD v6.0 (Stable Boundaries & Smart Copy) */
(function() {
    // 1. Clean Slate: Remove old buttons
    const oldContainer = document.getElementById('shield-container');
    if (oldContainer) oldContainer.remove();

    console.log("🛡️ Shield v6.0 Online: Punctuation Fixes Applied.");
    
    const STORAGE_KEY = "legal_shield_map";
    const PRIVATE_LIST_KEY = "shield_private_blacklist";

    // Load Memory
    let map = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    
    /* ⚙️ CONFIGURATION */
    const privateKeywords = localStorage.getItem(PRIVATE_LIST_KEY) || "";
    const privateRule = privateKeywords ? {
        name: "Private Blacklist",
        regex: new RegExp(`\\b(${privateKeywords})\\b`, 'gi'),
        prefix: "Entity" 
    } : null;

    // Corporate Suffixes (Escaped for Regex)
    const corporateSuffixes = [
        "Inc\\.?", "Corp\\.?", "Ltd\\.?", "LLC", "L\\.L\\.C\\.?", 
        "GmbH", "AG", "KG", "SE", "S\\.A\\.?", "S\\.A\\.S\\.?", "S\\.r\\.l\\.?", 
        "B\\.V\\.?", "N\\.V\\.?", "Pty\\sLtd", "Co\\.?", "Company", "K\\.K\\.?", "G\\.K\\.?"
    ].join("|");

    const RULES = [
        ...(privateRule ? [privateRule] : []),
        {
            name: "Corporate Entity",
            // FIX: We ensure we catch the name BUT separate trailing punctuation if it's not part of the suffix
            regex: new RegExp(`\\b([A-Z][a-zA-Z0-9&']+(?:\\s+[A-Z][a-zA-Z0-9&']+)*\\s+(?:${corporateSuffixes}))`, 'gi'),
            prefix: "Company"
        },
        { name: "Email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, prefix: "Email" },
        { name: "Credit Card", regex: /\b(?:\d[ -]*?){13,16}\b/g, prefix: "Card" },
        { name: "SSN/ID", regex: /\b(?:\d{3}[-.]?){2}\d{4}\b/g, prefix: "ID" },
        { name: "Proper Nouns", regex: /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g, prefix: "Client" }
    ];

    function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify([...map])); }

    function getAlias(text, prefix) {
        // Trim punctuation from key storage to prevent "Inc." vs "Inc" mismatch
        const key = text.trim(); 
        if (!map.has(key)) {
            let count = 0;
            map.forEach((val) => { if(val.includes(`[${prefix}_`)) count++; });
            let alias = `[${prefix}_${count + 1}]`; 
            map.set(key, alias);
            map.set(alias, key); // Bidirectional
            save();
        }
        return map.get(key);
    }

    /* --- LOGIC --- */
    function maskText(text) {
        let newText = text;
        let masked = false;
        RULES.forEach(rule => {
            newText = newText.replace(rule.regex, function(match) {
                masked = true;
                return getAlias(match, rule.prefix);
            });
        });
        return { text: newText, wasMasked: masked };
    }

    function unmaskText(text) {
        let cleanText = text;
        
        // 1. Remove Reader View Locks first
        cleanText = cleanText.replace(/ 🔒/g, "");

        // 2. Decode Aliases
        const aliasPattern = /\[(Client|Company|Entity|Email|Card|ID)_\d+\]/g;
        cleanText = cleanText.replace(aliasPattern, (match) => {
            if (map.has(match)) return map.get(match);
            return match; 
        });
        return cleanText;
    }

    function handleSend(textarea) {
        let result = maskText(textarea.value);
        if (result.wasMasked) {
            // Apply mask to input so TypingMind sends the code, not the name
            let setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            setter.call(textarea, result.text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Visual Flash Green
            textarea.style.transition = "background 0.2s";
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

    /* --- UI --- */
    function initUI() {
        if (document.getElementById('shield-container')) return;

        let container = document.createElement('div');
        container.id = 'shield-container';
        container.style.cssText = `
            position: fixed; bottom: 80px; right: 20px; 
            display: flex; gap: 4px; z-index: 9999; 
            opacity: 0.3; transition: opacity 0.2s; 
            font-family: sans-serif;
            background: rgba(0,0,0,0.5); padding: 4px; border-radius: 8px;
        `;
        container.onmouseenter = () => container.style.opacity = "1";
        container.onmouseleave = () => container.style.opacity = "0.3";

        // Shield Button (Force Send)
        let btn = document.createElement('div');
        btn.innerHTML = `🛡️`;
        btn.title = "Shield Active (Click to force send)";
        btn.style.cssText = `cursor: pointer; padding: 5px; font-size: 16px; transition: transform 0.1s;`;
        btn.onclick = (e) => {
            e.preventDefault();
            let textarea = document.querySelector('textarea');
            if (textarea) handleSend(textarea);
        };

        // Ghost Copy Button
        let copyBtn = document.createElement('div');
        copyBtn.innerHTML = `📋`;
        copyBtn.title = "Copy Selection (Unmasked)";
        copyBtn.style.cssText = `cursor: pointer; padding: 5px; font-size: 16px; border-left: 1px solid #555; transition: transform 0.1s;`;
        
        // Notification
        let notif = document.createElement('div');
        notif.style.cssText = `position: absolute; bottom: 40px; right: 0; background: #222; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; opacity: 0; pointer-events: none; transition: opacity 0.2s; white-space: nowrap;`;
        container.appendChild(notif);

        copyBtn.onclick = async (e) => {
            e.preventDefault();
            copyBtn.style.transform = "scale(0.9)";
            
            // 1. Get Selection
            let textToProcess = window.getSelection().toString();
            
            // 2. If no selection, grab Input Box (User Draft)
            if (!textToProcess) {
                let textarea = document.querySelector('textarea');
                if (textarea && textarea.value) textToProcess = textarea.value;
            }

            // 3. If still nothing, grab Last AI Message
            if (!textToProcess) {
                let messages = document.querySelectorAll('[data-element-id="ai-message"]');
                if (messages.length > 0) textToProcess = messages[messages.length - 1].innerText;
            }

            if (textToProcess) {
                let clean = unmaskText(textToProcess);
                try {
                    await navigator.clipboard.writeText(clean);
                    copyBtn.innerHTML = "✅";
                    notif.innerText = `Copied Unmasked`;
                    notif.style.opacity = "1";
                    setTimeout(() => notif.style.opacity = "0", 2000);
                } catch (err) { copyBtn.innerHTML = "❌"; }
            } else {
                copyBtn.innerHTML = "⚠️"; 
            }
            setTimeout(() => { copyBtn.innerHTML = "📋"; copyBtn.style.transform = "scale(1)"; }, 1000);
        };

        // Reader View (Visual Unmasker for Chat History)
        setInterval(() => {
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                let txt = node.nodeValue;
                // Only touch nodes that look like Aliases AND don't already have a lock
                if (txt && txt.includes("[") && txt.includes("]") && !txt.includes("🔒")) {
                    map.forEach((real, alias) => {
                        if (alias.startsWith("[") && txt.includes(alias)) {
                            // Avoid replacing inside the textarea (causes typing issues)
                            if (node.parentElement && node.parentElement.tagName !== 'TEXTAREA') {
                                node.nodeValue = txt.split(alias).join(`${real} 🔒`);
                            }
                        }
                    });
                }
            }
        }, 500);

        container.appendChild(btn);
        container.appendChild(copyBtn);
        document.body.appendChild(container);
    }
    
    setTimeout(initUI, 1000);
})();
