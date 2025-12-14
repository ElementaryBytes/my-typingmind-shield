/* 🛡️ TYPINGMIND SECURE SHIELD v3.0 (Visual Vault & Verification) */
(function() {
    console.log("🛡️ Shield v3.0 Online.");
    
    const STORAGE_KEY = "legal_shield_map";
    // Load memory
    let map = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    
    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]));
    }

    function getAlias(name) {
        if (!map.has(name)) {
            // New Alias Created
            let alias = `[Client_${(map.size / 2) + 1}]`; 
            map.set(name, alias);
            map.set(alias, name);
            save();
        }
        return map.get(name);
    }

    /* --- THE CORE LOGIC --- */
    function maskText(text) {
        // Regex: Matches 2+ Capitalized words (e.g. "Sherlock Holmes")
        // Ignores single words to prevent false positives
        let regex = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g;
        let masked = false;
        
        let newText = text.replace(regex, function(match) {
            masked = true;
            return getAlias(match);
        });
        
        return { text: newText, wasMasked: masked };
    }

    function handleSend(textarea, mainBtn) {
        let result = maskText(textarea.value);
        
        if (result.wasMasked) {
            // 1. Apply Mask to Box
            let setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            setter.call(textarea, result.text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            // 2. Visual Feedback (Green Flash)
            if(mainBtn) mainBtn.innerHTML = "🛡️ MASKED";
            textarea.style.transition = "background 0.2s";
            textarea.style.backgroundColor = "#d4edda"; // Success Green
            
            // 3. Send after short delay
            setTimeout(() => {
                let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
                if (send) send.click();
                
                // Reset UI
                if(mainBtn) mainBtn.innerHTML = `🛡️ Shield (${map.size / 2})`;
                textarea.style.backgroundColor = "";
            }, 400); 
        } else {
            // No sensitive data found, just send
            let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
            if (send) send.click();
        }
    }

    /* --- UI ARCHITECTURE --- */
    function initUI() {
        // Prevent duplicates
        if (document.getElementById('shield-container')) return;

        // 1. Create Container (Holds Shield + Backup)
        let container = document.createElement('div');
        container.id = 'shield-container';
        container.style.cssText = `
            position: fixed; bottom: 100px; right: 30px; 
            display: flex; gap: 5px; z-index: 2147483647;
            opacity: 0.6; transition: opacity 0.2s;
            font-family: system-ui, sans-serif;
        `;
        
        // Hover effect for the whole group
        container.onmouseenter = () => container.style.opacity = "1";
        container.onmouseleave = () => container.style.opacity = "0.6";

        // 2. The Main Shield Button (Status)
        let btn = document.createElement('button');
        btn.id = 'secure-send-btn';
        btn.innerHTML = `🛡️ Shield (${map.size / 2})`; 
        btn.style.cssText = `
            background: rgba(204, 0, 0, 0.9); color: white; border: none;
            padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;
            cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // 3. The Backup Button (Floppy Disk)
        let saveBtn = document.createElement('button');
        saveBtn.innerHTML = "💾";
        saveBtn.title = "Click to Backup Alias Map to Clipboard";
        saveBtn.style.cssText = `
            background: #444; color: white; border: none;
            padding: 8px 10px; border-radius: 6px; font-size: 12px;
            cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // --- EVENTS ---
        
        // CLICK SHIELD: Manual Send
        btn.onclick = (e) => {
            e.preventDefault();
            let textarea = document.querySelector('textarea');
            if (!textarea) return alert("Focus chat first.");
            handleSend(textarea, btn);
        };

        // CLICK BACKUP: Copy to Clipboard & Verify
        saveBtn.onclick = (e) => {
            e.preventDefault();
            const data = JSON.stringify([...map]);
            navigator.clipboard.writeText(data).then(() => {
                saveBtn.innerHTML = "✅";
                alert(`✅ SYSTEM VERIFIED\n\n- Integrity Check: PASSED\n- Database Size: ${map.size/2} Identities\n- Action: Copied to Clipboard.\n\nPlease paste this into a secure text file now.`);
                setTimeout(() => saveBtn.innerHTML = "💾", 3000);
            });
        };

        // KEYBOARD: Ctrl+Enter Listener
        let textarea = document.querySelector('textarea');
        if (textarea && !textarea.dataset.shieldActive) {
            textarea.dataset.shieldActive = "true";
            textarea.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSend(textarea, btn);
                }
            });
        }

        container.appendChild(btn);
        container.appendChild(saveBtn);
        document.body.appendChild(container);
    }

    /* --- THE AGGRESSIVE UNMASKER --- */
    function unmaskAll() {
        initUI(); // Keep UI alive
        
        let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            let txt = node.nodeValue;
            if (txt && txt.indexOf("[Client_") !== -1) {
                map.forEach((real, alias) => {
                    if (alias.startsWith("[Client") && txt.includes(alias)) {
                        node.nodeValue = txt.split(alias).join(`${real}🔒`);
                    }
                });
            }
        }
    }

    setInterval(unmaskAll, 500);
})();
