/* ⚖️ LexMask v4.0 (Settings Edition)
 * - Adds a Settings Gear ⚙️ to the UI
 * - Saves secrets privately in your browser (LocalStorage)
 * - JSDelivr Compatible
 */

(function() {
    // --- 1. SETUP & UTILS ---
    const OLD_CONTAINER_ID = 'lexmask-container';
    const existingContainer = document.getElementById(OLD_CONTAINER_ID);
    if (existingContainer) existingContainer.remove();

    const STORAGE_KEY_MAP = "lexmask_entity_map"; 
    const STORAGE_KEY_SECRETS = "lexmask_secrets";

    // Load Memory & Private Secrets
    let entityMap = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY_MAP) || "[]"));
    let privateSecrets = (localStorage.getItem(STORAGE_KEY_SECRETS) || "").split(',').map(s => s.trim()).filter(s => s);

    console.log(`⚖️ LexMask v4.0 Online. Loaded ${privateSecrets.length} private rules.`);

    function saveToMemory() { 
        localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify([...entityMap])); 
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

    // --- 2. LOAD NLP ENGINE ---
    let nlpReady = false;
    const script = document.createElement('script');
    script.src = "https://unpkg.com/compromise@latest/builds/compromise.min.js";
    script.onload = () => { nlpReady = true; };
    document.head.appendChild(script);

    // --- 3. MASKING ENGINE ---
    function maskText(text) {
        let cleanText = text;
        let masked = false;

        // A. Private Blacklist (Highest Priority)
        privateSecrets.forEach(word => {
            if (word && cleanText.toLowerCase().includes(word.toLowerCase())) {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                cleanText = cleanText.replace(regex, (match) => {
                    masked = true;
                    return getAlias(match, "Redacted"); 
                });
            }
        });

        // B. NLP (Smart Names)
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

        // C. Standard Patterns (Email/Card/ID)
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

    // --- 4. UNMASKING & UI ACTIONS ---
    function unmaskText(text) {
        let cleanText = text.replace(/ 🔒/g, ""); 
        const aliasPattern = /\[(Client|Company|Entity|Email|Card|ID|Redacted)_\d+\]/g;
        return cleanText.replace(aliasPattern, (match) => entityMap.has(match) ? entityMap.get(match) : match);
    }

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

    // --- 5. PRIVATE SETTINGS MANAGER ---
    function openSettings() {
        const current = localStorage.getItem(STORAGE_KEY_SECRETS) || "";
        const instructions = "🔒 PRIVATE BLACKLIST\nEnter words to always mask (comma separated).\nThese are saved ONLY on this computer.\n\nExample: Project Apollo, Operation X, John Smith";
        const result = prompt(instructions, current);
        
        if (result !== null) {
            localStorage.setItem(STORAGE_KEY_SECRETS, result);
            privateSecrets = result.split(',').map(s => s.trim()).filter(s => s);
            alert("✅ Private list updated!");
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

        // A. SHIELD (SEND)
        let btn = document.createElement('div');
        btn.innerHTML = `🛡️`;
        btn.title = "Secure Send";
        btn.style.cssText = `cursor: pointer; font-size: 18px;`;
        btn.onmousedown = (e) => { e.preventDefault(); let ta = document.querySelector('textarea'); if (ta) handleSend(ta); };

        // B. REVEAL (VIEW)
        let revealBtn = document.createElement('div');
        revealBtn.innerHTML = `👁️`;
        revealBtn.title = "Reveal Page";
        revealBtn.style.cssText = `cursor: pointer; font-size: 18px; border-left: 1px solid #555; padding-left: 6px;`;
        revealBtn.onmousedown = (e) => { e.preventDefault(); revealAll(); };

        // C. COPY (CLIPBOARD)
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

        // D. SETTINGS (GEAR) - NEW!
        let settingsBtn = document.createElement('div');
        settingsBtn.innerHTML = `⚙️`;
        settingsBtn.title = "Configure Private Blacklist";
        settingsBtn.style.cssText = `cursor: pointer; font-size: 18px; border-left: 1px solid #555; padding-left: 6px;`;
        settingsBtn.onmousedown = (e) => { e.preventDefault(); openSettings(); };

        container.appendChild(btn);
        container.appendChild(revealBtn);
        container.appendChild(copyBtn);
        container.appendChild(settingsBtn);
        document.body.appendChild(container);
    }
    
    setTimeout(initUI, 1000);
})();
