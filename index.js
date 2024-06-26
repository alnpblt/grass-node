import {WebSocket}  from 'ws'; 
import {v4 as uuid} from 'uuid';
import { SocksProxyAgent } from 'socks-proxy-agent';
import data from './data.json' assert {type: 'json'};

const userIds = data.userIds;
const proxy = data.proxies;
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
const url = 'wss://proxy.wynd.network:4650/';
const reconnectInterval = 30;
const pingInterval = 20;

const parseProxy = (proxy) => {
  const [protocol, conn] = proxy.split('//');
  const [username, password, host, port] = conn.split(':');
  return {
    protocol: protocol,
    hostname: host,
    port: Number(port),
    auth: `${username}:${password}`
  };
}

const sleep = (sec) => new Promise(resolve => setTimeout(resolve, (sec * 1000)));

const runProcess = async (userId, proxy = undefined) => {
  let deviceId = uuid();
  console.log(`[BOT:${userId}] connecting...`);
  let sendPing = undefined;
  let client = new WebSocket(url, {
    headers: {
      'user-agent': userAgent,
    },
    agent: proxy !== undefined ? new SocksProxyAgent(proxy) : undefined
  });

  client.on('error', (e) => {
    console.log(`[BOT:${userId}] stopped on error`);
    console.log(`[BOT:${userId}] ${client?._closeMessage?.toString() ?? client?._req?.res?.statusMessage ?? ''}`);
    clearInterval(sendPing);
    client.close();
  });

  client.on('close', (e) => {
    client?.terminate();
    console.log(`[BOT:${userId}] connection closed`);
    clearInterval(sendPing);
    console.log(`[BOT:${userId}] ${client?._closeMessage?.toString() ?? ''}`);
    console.log(`[BOT:${userId}] reconnecting in ${reconnectInterval} seconds`);
    setTimeout(() => {
      runProcess(userId, proxy);
    }, (reconnectInterval * 1000));
    client = undefined;
  });

  client.on('open', (e) => {
    console.log(`[BOT:${userId}] connected`);
  });

  client.on('message', function message(data) {
    try{
      const response = JSON.parse(data.toString());
      // console.info(`[RCV:${userId}] ${data.toString()}`);
      if(response.action === 'AUTH'){
        sendPing = setInterval(() => {
          try{
            const pingPayload = JSON.stringify({id: uuid(), version: "1.0.0", action: 'PING', data: {}});
            console.info(`[PING:${userId}] ${pingPayload}`);
            client.send(pingPayload);
          }catch(error){
            console.log(`[BOT:${userId}] ${error}`);
          }
          
        }, (pingInterval * 1000));

        const authPayload = JSON.stringify({
          id: response.id,
          origin_action: "AUTH",
          result: {
              browser_id: deviceId,
              user_id: userId,
              user_agent: userAgent,
              timestamp: Number(Date.now()),
              device_type: "extension",
              version: "4.0.1"
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
  });

  return client;
}

if(proxy.length !== 0){
  for(let i = 0; i < proxy.length; i += 1){
    for(let k = 0; k < userIds.length; k += 1){
      runProcess(userIds[k], proxy[i]);
      await sleep(1);
    }
    await sleep(30);
  }
} else {
  for(let i = 0; i < userIds.length; i += 1){
    runProcess(userIds[i]);
    await sleep(1);
  }
}