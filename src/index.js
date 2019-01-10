const port = process.env.PORT || 8081

const handler = (req, res) => {
    res.writeHead(404)
    res.end()
}

const server = require('http').createServer(handler)

const io = require('socket.io')(server, {
    serveClient: false,
    wsEngine: 'ws'
})

const uuid = require('uuid/v4')

const tvs = { };

const tvNamespace = io.of('/tv')
const adminNamespace = io.of('/admin')

tvNamespace.on('connection', socket => {
    socket.on('disconnect', () => {
        console.log('disconnected', socket.id)

        const o = tvs[socket.id];

        if (o) {
            delete tvs[socket.id];
            adminNamespace.emit('tv disconnect', { ...o, _id: socket.id });
        }
    })

    socket.on('x', (data) => {
        console.log('received X', data)
    })

    socket.on('iamtv', (data, fn) => {
        const uid = data.uid ? data.uid : uuid();
        const tv = {
            uid,
            source: data.source            
        };

        tvs[socket.id] = tv;
        
        // Let the client know what their uid has become
        fn(uid)

        adminNamespace.emit('tv connect', { ...tv, _id: socket.id });
    })
})

adminNamespace.on('connection', socket => {
    socket.on('list', (data, fn) => {
        console.log('list invoked', data)

        fn(Object.keys(tvs).map(key => {
            const o = tvs[key]

            return {
                ...o,
                _id: key,
            }
        }));
    })

    socket.on('display', (data) => {
        const target = tvNamespace.sockets[data.uid];

        console.log('received display event', data)

        if (target) {
            tvs[data.uid].source = data.source;

            target.emit('display', { source: data.source })
        }
    })
})

server.listen(port)

console.info('started on port', port)
