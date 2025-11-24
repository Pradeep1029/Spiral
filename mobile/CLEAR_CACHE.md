# Clear App Cache

If the app isn't showing the login screen, you have cached credentials.

## To Clear Cache

### Option 1: From App
1. If you can access Settings → Tap "Sign Out"

### Option 2: Delete and Reinstall in Expo Go
1. In Expo Go, long-press the Unspiral app
2. Delete it
3. Scan QR code again
4. Fresh start with login screen

### Option 3: Clear AsyncStorage (Dev)
Add this temporary code to App.js:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add this at the top of App component, then remove after one run
useEffect(() => {
  AsyncStorage.clear();
}, []);
```

Then reload the app once, and remove the code.
