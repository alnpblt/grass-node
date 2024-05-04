# GetGrass CLI

## Installation
Run npm install to install the app
```npm
npm install
```

## Usage
Set your user ids and proxies in data.json. Connecting via proxy is only available through socks protocol
```javascript
{
  userIds: [
    'user-id'
  ],
  proxies: [
    'socks5://user:pass@host:port'
  ]
}
```

After setting up your data.json run the app
```npm
npm run start
```