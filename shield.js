/* 🛡️ TYPINGMIND SECURE SHIELD v5.3 (Deep-Search Decoder) */
(function() {
    // 1. Force Clean UI
    const oldContainer = document.getElementById('shield-container');
    if (oldContainer) oldContainer.remove();

    console.log("🛡️ Shield v5.3 Online: Deep-Search Decoder Active.");
    
    const STORAGE_KEY = "legal_shield_map";
    const PRIVATE_LIST_KEY = "shield_private_blacklist";

    // Load Map
    let map = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    
    // --- RULES SETUP (Unchanged) ---
    const privateKeywords = localStorage.getItem(PRIVATE_LIST_KEY) || "";
    const privateRule = privateKeywords ? {
        name: "Private Blacklist",
        regex: new RegExp(`\\b(${privateKeywords})\\b`, 'gi'),
        prefix: "Entity" 
    } : null;

    const corporateSuffixes = [
        "Inc", "Corp", "Ltd", "LLC", "GmbH", "AG", "KG", "SE", 
        "S.A", "S.A.S", "S.r.l", "S.p.A", "B.V", "N.V", 
        "Pty Ltd", "Pty", "Co", "Company", "K.K", "G.K"
    ].join("|").replace(/\./g, "\\."); 

    const RULES = [
        ...(privateRule ? [privateRule] : []),
        {
            name: "Corporate Entity",
            regex: new RegExp(`\\b([A-Z][a-zA-Z0-9&']+(?:\\s+[A-Z][a-zA-Z0-9&']+)*\\s+(?:${corporateSuffixes}))\\b`, 'gi'),
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

    // --- NEW: ROBUST UNMASKING LOGIC ---
    function unmaskText(text) {
        let cleanText = text;
        
        // 1. Remove Visual Locks (The Reader View artifacts)
        cleanText = cleanText.replace(/ 🔒/g, "");

        // 2. Regex Search for ANY alias pattern like [Client_1] or [Company_50]
        // This catches them even if they are inside markdown like **[Client_1]**
        const aliasPattern = /\[(Client|Company|Entity|Email|Card|ID)_\d+\]/g;
        
        cleanText = cleanText.replace(aliasPattern, (match) => {
            // Check if we have the Real Name for this Alias
            if (map.has(match)) {
                return map.get(match); // Return "Alpha GmbH"
            }
            return match; // If unknown, leave it as [Client_X] so you know something is wrong
        });

        return cleanText;
    }

    function handleSend(textarea, mainBtn) {
        let result = maskText(textarea.value);
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
            }, 300); 
        } else {
            let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
            if (send) send.click();
        }
    }

    /* --- UI LOGIC --- */
    function initUI() {
        if (document.getElementById('shield-container')) document.getElementById('shield-container').remove();

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

        // Shield Button
        let btn = document.createElement('div');
        btn.innerHTML = `🛡️`;
        btn.title = "Shield Active";
        btn.style.cssText = `cursor: pointer; padding: 5px; font-size: 16px; transition: transform 0.1s;`;
        btn.onclick = (e) => {
            e.preventDefault();
            btn.style.transform = "scale(0.9)";
            setTimeout(()=>btn.style.transform = "scale(1)", 100);
            let textarea = document.querySelector('textarea');
            if (textarea) handleSend(textarea);
        };

        // GHOST COPY BUTTON (DEEP SEARCH)
        let copyBtn = document.createElement('div');
        copyBtn.innerHTML = `📋`;
        copyBtn.title = "Copy Original (Auto-Fetch)";
        copyBtn.style.cssText = `cursor: pointer; padding: 5px; font-size: 16px; border-left: 1px solid #555; transition: transform 0.1s;`;
        
        // Notification Bubble
        let notif = document.createElement('div');
        notif.style.cssText = `
            position: absolute; bottom: 40px; right: 0; background: #333; color: #fff; 
            padding: 5px 10px; border-radius: 4px; font-size: 12px; pointer-events: none;
            opacity: 0; transition: opacity 0.2s; white-space: nowrap;
        `;
        container.appendChild(notif);

        copyBtn.onclick = async (e) => {
            e.preventDefault();
            copyBtn.style.transform = "scale(0.9)";
            
            // 1. Grab Text (Selection or Last AI Message)
            let textToProcess = window.getSelection().toString();
            if (!textToProcess) {
                let messages = document.querySelectorAll('[data-element-id="ai-message"]');
                if (messages.length > 0) {
                    textToProcess = messages[messages.length - 1].innerText;
                }
            }

            if (textToProcess) {
                // 2. Decode
                let clean = unmaskText(textToProcess);
                
                try {
                    await navigator.clipboard.writeText(clean);
                    copyBtn.innerHTML = "✅"; 
                    
                    // Show Notification
                    notif.innerText = `Copied: "${clean.substring(0, 20)}..."`;
                    notif.style.opacity = "1";
                    setTimeout(() => notif.style.opacity = "0", 2000);

                } catch (err) {
                    console.error("Shield Copy Error:", err);
                    copyBtn.innerHTML = "❌";
                }
            } else {
                copyBtn.innerHTML = "⚠️"; // No text found
            }
            setTimeout(() => { copyBtn.innerHTML = "📋"; copyBtn.style.transform = "scale(1)"; }, 1500);
        };

        // Reader View
        setInterval(() => {
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                let txt = node.nodeValue;
                if (txt && txt.includes("[") && txt.includes("]")) {
                    map.forEach((real, alias) => {
                        if (alias.startsWith("[") && txt.includes(alias) && !txt.includes("🔒")) {
                            if(txt.indexOf(alias) !== -1) {
                                node.nodeValue = txt.split(alias).join(`${real} 🔒`);
                            }
                        }
                    });
                }
            }
        }, 800);

        container.appendChild(btn);
        container.appendChild(copyBtn);
        document.body.appendChild(container);
    }
    
    setTimeout(initUI, 1500);
})();
