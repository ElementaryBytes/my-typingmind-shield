/* ⚖️ LexMask v9.3 (Source Swap & Force Unlock)
 * - Switched AI Source to JSDelivr (More trusted)
 * - Auto-unlocks after 2 seconds if download fails
 */

(function() {
    // 1. CLEANUP
    const CONTAINER_ID = 'lexmask-container';
    const old = document.getElementById(CONTAINER_ID);
    if (old) old.remove();

    console.log("⚖️ LexMask v9.3: Smart Loader Active");

    const STORAGE_KEY_MAP = "lexmask_entity_map"; 
    const STORAGE_KEY_SECRETS = "lexmask_secrets";

    // Load Memory
    let entityMap = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY_MAP) || "[]"));
    let privateSecrets = (localStorage.getItem(STORAGE_KEY_SECRETS) || "").split(',').map(s => s.trim()).filter(s => s);

    function saveToMemory() { 
        localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify([...entityMap])); 
    }

    function saveSecrets() {
        localStorage.setItem(STORAGE_KEY_SECRETS, privateSecrets.join(', '));
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

    // --- NLP ENGINE (With Timeout & New Source) ---
    let nlpReady = false;
    let nlpFailed = false;

    function loadNLP() {
        if (window.nlp) { markReady(); return; }
        
        const script = document.createElement('script');
        script.id = 'lexmask-nlp';
        // CHANGED: Switched to JSDelivr (Better reliability)
        script.src = "https://cdn.jsdelivr.net/npm/compromise@latest/builds/compromise.min.js"; 
        
        script.onload = () => { 
            console.log("✅ AI Brain Loaded via JSDelivr");
            markReady(); 
        };
        
        script.onerror = () => {
            console.warn("⚠️ AI Download Blocked. Switching to Manual Mode.");
            nlpFailed = true;
            markReady(); // Unlock anyway
        };

        document.head.appendChild(script);

        // FAIL-SAFE: If not loaded in 2.5 seconds, Force Unlock
        setTimeout(() => {
            if (!nlpReady && !nlpFailed) {
                console.log("⏰ AI Timed Out. Force Unlocking.");
                nlpFailed = true;
                markReady();
            }
        }, 2500);
    }

    function markReady() {
        nlpReady = true;
        updateUIReady();
    }

    // --- MASKING LOGIC ---
    function maskText(text) {
        let cleanText = text;
        let masked = false;
        
        // 1. Private Secrets (Always works)
        privateSecrets.forEach(word => {
            if (word && cleanText.toLowerCase().includes(word.toLowerCase())) {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                cleanText = cleanText.replace(regex, (match) => { masked = true; return getAlias(match, "Redacted"); });
            }
        });

        // 2. NLP (Only if loaded successfully)
        if (!nlpFailed && window.nlp) {
            try {
                const doc = window.nlp(cleanText);
                doc.people().forEach(p => {
                    if (p.text().length > 2) { cleanText = cleanText.replace(new RegExp(`\\b${p.text()}\\b`, 'g'), getAlias(p.text(), "Client")); masked = true; }
                });
                doc.organizations().forEach(o => {
                    if (o.text().length > 2) { cleanText = cleanText.replace(new RegExp(`\\b${o.text()}\\b`, 'g'), getAlias(o.text(), "Company")); masked = true; }
                });
            } catch (e) { console.error(e); }
        }

        // 3. Regex (Always works)
        const STATIC_RULES = [
            { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, prefix: "Email" },
            { regex: /\b(?:\d[ -]*?){13,16}\b/g, prefix: "Card" },
            { regex: /\b(?:\d{3}[-.]?){2}\d{4}\b/g, prefix: "ID" }
        ];
        STATIC_RULES.forEach(rule => { cleanText = cleanText.replace(rule.regex, (match) => { masked = true; return getAlias(match, rule.prefix); }); });

        return { text: cleanText, wasMasked: masked };
    }

    function unmaskText(text) {
        let cleanText = text.replace(/ 🔒/g, ""); 
        const aliasPattern = /\[(Client|Company|Entity|Email|Card|ID|Redacted)_\d+\]/g;
        return cleanText.replace(aliasPattern, (match) => entityMap.has(match) ? entityMap.get(match) : match);
    }

    // --- ACTIONS ---
    function handleSend(textarea) {
        // FAIL-SAFE: If for some reason it's still stuck, just force allow it
        if (!nlpReady) { 
            let force = confirm("⚠️ AI Brain is still loading. Send anyway using only your private list?");
            if (!force) return;
        }

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

    function quickAddSecret() {
        const selection = window.getSelection().toString().trim();
        if (selection && selection.length > 1) {
            if (!privateSecrets.includes(selection)) {
                privateSecrets.push(selection);
                saveSecrets();
                alert(`🔒 Added "${selection}" to private blacklist.`);
            } else {
                alert(`⚠️ "${selection}" is already in your blacklist.`);
            }
        } else {
            alert("⚠️ Highlight a word first, then Shift+Click Shield to add it.");
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

    function openSettings() {
        const current = localStorage.getItem(STORAGE_KEY_SECRETS) || "";
        const result = prompt("🔒 PRIVATE BLACKLIST\nEnter words to mask (comma separated):", current);
        if (result !== null) {
            localStorage.setItem(STORAGE_KEY_SECRETS, result);
            privateSecrets = result.split(',').map(s => s.trim()).filter(s => s);
            alert("✅ List updated!");
        }
    }

    function updateUIReady() {
        const shield = document.getElementById('lexmask-shield-btn');
        if (shield) {
            // GREEN = AI Working
            // ORANGE = AI Failed (But manual list works)
            shield.style.color = nlpFailed ? "#ff9800" : "#4caf50"; 
            shield.style.textShadow = nlpFailed ? "none" : "0 0 5px #4caf50";
        }
    }

    // --- UI INJECTION ---
    function initUI() {
        if (document.getElementById(CONTAINER_ID)) return;

        let container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.cssText = `
            position: fixed; bottom: 150px; right: 0px; 
            display: flex; flex-direction: column; gap: 2px; z-index: 99999; 
            background: rgba(0,0,0,0.8); padding: 4px; border-radius: 8px 0 0 8px; 
            border: 1px solid #444; border-right: none; color: #ccc; opacity: 0.3; 
            transition: opacity 0.2s; font-family: sans-serif;
        `;
        container.onmouseenter = () => container.style.opacity = "1";
        container.ontouchstart = () => container.style.opacity = "1";
        container.onmouseleave = () => container.style.opacity = "0.3";

        const createBtn = (icon, title, action, id) => {
            let b = document.createElement('div');
            b.innerHTML = icon; b.title = title;
            if (id) b.id = id;
            b.style.cssText = "cursor: pointer; font-size: 16px; padding: 6px; user-select: none; text-align: center;";
            b.onmousedown = (e) => { 
                e.preventDefault(); 
                if (id === 'lexmask-shield-btn' && e.shiftKey) {
                    quickAddSecret();
                } else {
                    action(); 
                }
            };
            return b;
        };

        container.appendChild(createBtn("🛡️", "Secure Send", () => {
            let ta = document.querySelector('textarea');
            if(ta) handleSend(ta);
        }, 'lexmask-shield-btn'));
        
        container.appendChild(createBtn("👁️", "Reveal", revealAll));
        
        container.appendChild(createBtn("📋", "Copy", async () => {
             let textToProcess = "";
             let sel = window.getSelection().toString();
             if (sel) {
                 textToProcess = sel;
             } else {
                 let messages = document.querySelectorAll('[data-element-id="ai-message"]');
                 if (messages.length > 0) textToProcess = messages[messages.length - 1].innerText;
             }
             if (textToProcess) {
                let clean = unmaskText(textToProcess);
                await navigator.clipboard.writeText(clean);
                let original = container.style.backgroundColor;
                container.style.backgroundColor = "green";
                setTimeout(() => container.style.backgroundColor = original, 500);
             }
        }));

        container.appendChild(createBtn("⚙️", "Settings", openSettings));
        
        document.body.appendChild(container);
        loadNLP();
    }
    
    setInterval(initUI, 1500);
})();
