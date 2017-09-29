const net = require('net');
const server = net.createServer();
const clients = {};//保存客户端的连接
var client = null; //当前客户连接
var uid = 0

server.on('connection', (socket) => {
    console.log('======', socket)
    //启动心跳机制
    var isOnline = true;
    var keepAliveTimer = socket.timer = setInterval(() => {
        if(!isOnline) {
            isOnline = false;
            client = socket;
            quit(socket.nick);
            return
        }
        if(socket.writable) {
            socket.write('::');
        } else {
            client = socket;
            quit(socket.nick)
        }
    }, 3000);
    socket.on('end', () => {
        console.log('client disconnected.\n\r')
        socket.destroy();
    })
    socket.on('error', (error) => {
        console.log(error.message);
    })
    socket.on('data', (chunk) => {
        client = socket;
        var msg = JSON.parse(chunk.toString());
        console.log('======', msg)
        if(msg.cmd === 'keep') {
            isOnline = true
            return
        }
        dealMsg(msg)
    })
})
server.on('error', (err) => {
    console.log(err);
})
server.on('listening', () => {
    console.log(`listening on ${server.address().address}:${server.address().port}\n\r`)
});
server.listen(8060)

/**
 * 处理用户信息
 */
function dealMsg(msg) {
    const cmd = msg.cmd;
    const funs = {
        'login': login,
        'chat': chat,
        'quit': quit,
        'exit': quit
    }
    if(typeof funs[cmd] !== 'function') return false
    funs[cmd](msg);
}

/**
 * 释放连接资源
 */
function freeConn(conn) {
    conn.end();
    delete clients[conn.uuid];
    conn.timer&&clearInterval(conn.timer);
}

/**
 * 用户首次进入聊天室
 */
function login(msg) {
    var uuid = '';
    uuid = getRndStr(15)+(++uid);
    client.write(`欢迎你，${msg.nick}：这里总共有${Object.keys(clients).length}个小伙伴在聊天.\r\n`);
    client.nick = msg.nick;
    client.uuid = uuid;
    clients[uuid] = client;
    broadcast(`系统：${msg.nick}进入了聊天室.`);
}

/**
 * 广播消息
 */
function broadcast(msg) {
    Object.keys(clients).forEach((uuid) => {
        if((clients[uuid] != client) && clients[uuid].writable) {
            clients[uuid].write(msg)
        }
    })
}

/**
 * 退出聊天室
 */
function quit(nick) {
    var message = `小伙伴${nick}退出了聊天室.`;
    broadcast(message);
    freeConn(client)
}

function chat(msg) {
    if (msg.msg.toLowerCase() === 'quit' || msg.msg.toLowerCase() === 'exit') {
        quit(msg.nick);
        return
    }
    var message = `${msg.nick}说：${msg.msg}`;
    broadcast(message);
}

/**
 * 随机指定长度(len)的字符串
 */
function getRndStr(len=1){
    var rndStr = '';
    for (; rndStr.length < len; rndStr += Math.random().toString(36).substr(2));
    return rndStr.substr(0, len);
}