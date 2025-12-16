(async function bootstrapUserID() {
    try {
        await fetch("https://squishy-site-backend.vercel.app/api/user-id", {
            method: "POST",
            credentials: "include" // Required for cookies
        });
        console.log("UserID Initialized");
    } catch (err) {
        console.error("Failed to Initialize UserID", err);
    }
})();