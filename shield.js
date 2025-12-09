/* 🛡️ TYPINGMIND SECURE SHIELD (GitHub Pages Version) */
(function() {
    console.log("🛡️ Shield Loading from GitHub Pages...");
    
    // 1. MEMORY STORAGE (Auto-Learns Names)
    const STORAGE_KEY = "legal_shield_map";
    let map = new Map(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    
    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]));
    }

    function getAlias(name) {
        if (!map.has(name)) {
            let alias = `[Client_${map.size + 1}]`;
            map.set(name, alias);
            map.set(alias, name);
            save();
        }
        return map.get(name);
    }

    // 2. CREATE THE RED BUTTON
    function createButton() {
        if (document.getElementById('secure-send-btn')) return;
        
        let btn = document.createElement('button');
        btn.id = 'secure-send-btn';
        btn.innerHTML = '🔒 SECURE SEND';
        
        btn.style.cssText = `
            position: fixed; 
            top: 80px; 
            right: 20px; 
            z-index: 2147483647; 
            background: #cc0000; 
            color: white; 
            border: 3px solid white; 
            padding: 12px 20px; 
            border-radius: 30px; 
            font-weight: bold; 
            font-family: sans-serif;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            cursor: pointer;
        `;
        
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            let textarea = document.querySelector('textarea');
            if (!textarea) return alert("Please click inside the chat box first.");
            
            let text = textarea.value;
            // Detect Capitalized Names (e.g. Sarah Connor)
            let regex = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g;
            let masked = false;
            
            text = text.replace(regex, function(match) {
                masked = true;
                return getAlias(match);
            });
            
            if (masked) {
                let setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                setter.call(textarea, text);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                btn.innerHTML = "⏳ MASKING...";
                textarea.style.backgroundColor = "#ccffcc";
                
                setTimeout(() => {
                    let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
                    if (send) send.click();
                    btn.innerHTML = "🔒 SECURE SEND";
                    textarea.style.backgroundColor = "";
                }, 500);
            } else {
                let send = document.querySelector('button[aria-label="Send message"]') || document.querySelector('button[data-element-id="send-button"]');
                if (send) send.click();
            }
        };
        
        document.body.appendChild(btn);
    }

    // 3. AUTO-UNMASKER
    setInterval(() => {
        createButton();
        let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            let txt = node.nodeValue;
            if (txt.includes("[Client_")) {
                map.forEach((real, alias) => {
                    if (alias.startsWith("[Client") && txt.includes(alias)) {
                        node.nodeValue = txt.replace(alias, `${real} 🔒`);
                    }
                });
            }
        }
    }, 1000);
})();
