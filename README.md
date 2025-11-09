# smart-scheduler
scheduling website for events to reduce time inputting events + meetings like converting time zones, inputting locations or links


# Process
## Set up Google API Access:
- Go to Google Cloud Console -> Create Project 
- Project Name
- Enabled APIs on side menu
- Search for Google Calendar API -> Enable

- Configure the OAuth consent screen
    - Go to OAuth consent screen
    - Create OAuth Client ID
    - Application Type: Chrome Extension
        - to get Item ID: Upload files to Google Chrome Extension
        - chrome://extensions/
        - Turn on Developer mode (top right toggle)
        - Click Load unpacked
        - Select your folder quickcal-extension/ 
    - Save Client ID
    - Data Access:
        - Add or Remove Scopes
        - ./auth/calendar
    

