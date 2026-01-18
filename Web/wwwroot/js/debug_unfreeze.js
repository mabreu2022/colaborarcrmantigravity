// debug_unfreeze.js
// Utility to attempt to unfreeze the UI if it gets stuck
(function () {
    console.log("Debug Unfreeze Script Loaded");

    window.ForceUnfreeze = function () {
        console.log("Attempting to unfreeze UI...");

        // 1. Try to find and remove likely overlay/spinner elements
        const selectors = [
            '.loading-overlay',
            '.spinner',
            '#loader',
            '.block-ui',
            '[class*="lock"]',
            '[id*="lock"]'
        ];

        let removed = 0;
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                console.log("Removing element:", el);
                el.remove();
                removed++;
            });
        });

        // 2. Try to verify if there is a known global unlock function
        if (typeof UnLockThreadClient === 'function') {
            console.log("Calling UnLockThreadClient()");
            UnLockThreadClient();
        } else {
            console.log("UnLockThreadClient function not found.");
        }

        if (removed === 0) {
            console.warn("No obvious blocking elements found.");
        } else {
            console.log(`Removed ${removed} blocking elements.`);
        }
    };

    // Auto-expose to global scope
    console.log("Run 'ForceUnfreeze()' in console to attempt manual unlock.");
})();
