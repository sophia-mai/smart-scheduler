//background.js

//interactive sign in from for first time and after non interactive calls
chrome.runtime.onInstalled.addListener(() => {
    // an email address prompt will appear for first time sign in
    chrome.identity.getAuthToken({interactive: true}, (token) => {
        if (chrome.runtime.lastError) {
            console.warn('Auth on install skipped:', chrome.runtime.lastError.message);
            return;
        }
        console.log('Auth token obtained on install:');
        });
    });