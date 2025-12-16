/* 🛡️ TYPINGMIND SECURE SHIELD v7.0 (Precision Copy & Focus Lock) */
(function() {
    // 1. Force Clean Slate
    const oldContainer = document.getElementById('shield-container');
    if (oldContainer) oldContainer.remove();

    console.log("🛡️ Shield v7.0 Online: Precision Focus Lock Active.");
    
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

    // Corporate Suffixes (Regex Safe)
    const corporateSuffixes = [
        "Inc\\.?", "Corp\\.?", "Ltd\\.?", "LLC", "L\\.L\\.C\\.?", 
        "GmbH", "AG", "KG", "SE", "S\\.A\\.?", "S\\.A\\.S\\.?", "S\\.r\\.l\\.?", 
        "B\\.V\\.?", "N\\.V\\.?", "Pty\\sLtd", "Co\\.?", "Company", "K\\.K\\.?", "G\\.K\\.?"
    ].join("|");

    const RULES = [
        ...(privateRule ? [privateRule] : []),
        {
            name: "Corporate Entity",
            // Consumes trailing dot if part of suffix (e.g. "Inc.")
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
        const key = text.trim(); 
        if (!map.has(key)) {
            let count = 0;
            map.forEach((val) => { if(val.includes(`[${prefix}_`)) count++; });
            let alias = `[${prefix}_${count + 1}]`; 
            map.set(key, alias);
            map.set(alias, key);
            save();
        }
        return map.get(key);
    }

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
        // 1. Remove Reader View Locks
        cleanText = cleanText.replace(/ 🔒/g, ""); 
        
        // 2. Regex to find [Code_123] and swap back
        const aliasPattern = /\[(Client|Company|Entity|Email|Card|ID)_\d+\]/g;
        cleanText = cleanText.replace(aliasPattern, (match) => {
            if (map.has(match)) return map.get(match);
            return match; 
        });
        return cleanText;
    }

    function handleSend(textarea) {
        // Sanitize: remove any locks that accidentally got pasted into input
        let rawValue = textarea.value.replace(/ 🔒/g, "");
        let result = maskText(rawValue);
        
        if (result.wasMasked) {
            let setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            setter.call(textarea, result.text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
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

    /* --- UI LOGIC --- */
    function initUI() {
        if (document.getElementById('shield-container')) return;

        let container = document.createElement('div');
        container.id = 'shield-container';
        container.style.cssText = `
            position: fixed; bottom: 80px; right: 20px; 
            display: flex; gap: 4px; z-index: 9999; 
            opacity: 0.3; transition: opacity 0.2s; 
            font-family: sans-serif;
            background: rgba(0,0,0,0.8); padding: 4px; border-radius: 8px;
        `;
        container.onmouseenter = () => container.style.opacity = "1";
        container.onmouseleave = () => container.style.opacity = "0.3";

        // Shield Button
        let btn = document.createElement('div');
        btn.innerHTML = `🛡️`;
        btn.title = "Shield Active (Click to force send)";
        btn.style.cssText = `cursor: pointer; padding: 5px; font-size: 16px;`;
        
        btn.onmousedown = (e) => {
            e.preventDefault(); // Prevent focus loss
            let textarea = document.querySelector('textarea');
            if (textarea) handleSend(textarea);
        };

        // Precision Copy Button
        let copyBtn = document.createElement('div');
        copyBtn.innerHTML = `📋`;
        copyBtn.title = "Copy Selection (Unmasked)";
        copyBtn.style.cssText = `cursor: pointer; padding: 5px; font-size: 16px; border-left: 1px solid #555;`;
        
        let notif = document.createElement('div');
        notif.style.cssText = `position: absolute; bottom: 40px; right: 0; background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; opacity: 0; pointer-events: none; transition: opacity 0.2s; white-space: nowrap;`;
        container.appendChild(notif);

        // MOUSEDOWN is key: It fires BEFORE the browser clears the selection
        copyBtn.onmousedown = async (e) => {
            e.preventDefault(); // STOP the button from stealing focus
            
            // 1. Get Text (Should now be 100% accurate)
            let textToProcess = window.getSelection().toString();

            // 2. Fallback only if EMPTY
            if (!textToProcess) {
                 let messages = document.querySelectorAll('[data-element-id="ai-message"]');
                 if (messages.length > 0) textToProcess = messages[messages.length - 1].innerText;
            }

            if (textToProcess) {
                let clean = unmaskText(textToProcess);
                try {
                    await navigator.clipboard.writeText(clean);
                    copyBtn.innerHTML = "✅";
                    notif.innerText = `Copied: "${clean.substring(0,15)}..."`;
                    notif.style.opacity = "1";
                    setTimeout(() => notif.style.opacity = "0", 2000);
                } catch (err) { copyBtn.innerHTML = "❌"; }
            } else {
                copyBtn.innerHTML = "⚠️"; 
            }
            setTimeout(() => { copyBtn.innerHTML = "📋"; }, 1000);
        };

        // Reader View (Visual Unmasker)
        setInterval(() => {
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                let txt = node.nodeValue;
                // Only touch nodes that have Aliases AND NO lock
                if (txt && txt.includes("[") && txt.includes("]") && !txt.includes("🔒")) {
                    map.forEach((real, alias) => {
                        if (alias.startsWith("[") && txt.includes(alias)) {
                            // Only unmask inside message bubbles (prevent UI breakage)
                            if (node.parentElement && node.parentElement.closest('[data-element-id]')) {
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
