import websocket  from 'websocket'; 
import {v4 as uuid} from 'uuid';
import {ProxyAgent} from 'proxy-agent';

const userIds = [
  '2fJH56IUPmvAwz6OKWWXMtI9qKB',
  '2fJHySZRK1ZvB6xA1F9KkITVFsh',
  '2fRGg2guHfCMmA7ippJFoNkGqEx',
  '2fRGxMCiWrQ0qraZmJs0GVEmOWc',
  '2fRH8UGk48yCVG5z6siHYuUkTrW',
  '2fRHLP5cEwkr9I7pzW0EJrOcpdA',
  '2fRHl8b7F3Q3OVtbqMfI1XuYYdX',
];
const proxy = [];

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
const url = 'wss://proxy.wynd.network:4650/';

const parseProxy = (proxy) => {
  const [protocol, conn] = proxy.split('://');
  const [username, password, host, port] = conn.split(':');
  return {
    protocol: protocol,
    hostname: host,
    port: port,
    auth: `${username}:${password}`
  };
}

const sleep = (sec) => new Promise(resolve => setTimeout(resolve, (sec * 1000)));

const runProcess = async (userId, proxy = undefined) => {
  let running = false;
  let client = undefined;
  while (client === undefined || (client !== undefined && !client?._connection?.connected)) {
    console.log(`[BOT:${userId}] connecting...`);
    let sendPing = undefined;
    client = new websocket.w3cwebsocket(url, undefined, undefined, undefined, undefined, proxy !== undefined ? {
      agent: new ProxyAgent(parseProxy(proxy))
    } : undefined);

    client.onerror = (e) => {
      console.log(`[BOT:${userId}] stopped on error`);
      clearInterval(sendPing);
    }

    client.onclose = (e) => {
      console.log(`[BOT:${userId}] connection closed`);
      clearInterval(sendPing);
      console.log(`[BOT:${userId}] ${e.reason}`);
    }

    client.onopen = (e) => {
      console.log(`[BOT:${userId}] connected`);
    }

    client.onmessage = (e) => {
      try{
        const response = JSON.parse(e.data);
        // console.info(`[RCV:${userId}] ${e.data}`);
        if(response.action === 'AUTH'){
          sendPing = setInterval(() => {
            try{
              const pingPayload = JSON.stringify({id: uuid(), version: "1.0.0", action: 'PING', data: {}});
              // console.info(`[PING:${userId}] ${pingPayload}`);
              client.send(pingPayload);
            }catch(error){
              console.log(`[BOT:${userId}] ${error}`);
            }
            
          }, 20000);
  
          const authPayload = JSON.stringify({
            id: response.id,
            origin_action: "AUTH",
            result: {
                browser_id: uuid(),
                user_id: userId,
                user_agent: userAgent,
                timestamp: Number(Date.now()),
                device_type: "extension",
                version: "2.5.0"
            }
          });
          // console.info(`[AUTH:${userId}] ${authPayload}`);
          client.send(authPayload);
          
        } else if(response.action === 'PONG'){
          const pongPayload = JSON.stringify({id: response.id, origin_action: 'PONG'});
          // console.info(`[PONG:${userId}] ${pongPayload}`);
          client.send(pongPayload);
        }
      } catch (error){
        client.close();
        clearInterval(sendPing);
        console.error(`[BOT:${userId}] ${error}`);
      }
    };
    
    await sleep(30)
  }
}

userIds.forEach(async (user) => {
  if(proxy.length !== 0){
    proxy.forEach(async (p) => {
      runProcess(user, p);
    });
  } else {
    runProcess(user);
  }
})