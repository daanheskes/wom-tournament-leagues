# React + Vite

## Admin

Open the **Admin** tab and enter the admin pass-key to create a WiseOldMan competition. The pass-key is validated by the Netlify Function and is configured through an environment variable.

When deployed to Netlify, configure these environment variables in the Netlify site settings:

- `WOM_GROUP_VERIFICATION_CODE`

The `WOM_GROUP_VERIFICATION_CODE` is used as both the admin pass-key and the WiseOldMan verification code. The competition request is handled by `netlify/functions/create-competition.js`, so the code is never shipped to the browser.

Competitions always use the next Wednesday at 10:30 UTC through the following Monday at 10:30 UTC. The WiseOldMan response, including the verification code, is shown after creation.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
