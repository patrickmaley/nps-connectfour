var express = require('express')
var app = express()
var ExpressPeerServer = require('peer').ExpressPeerServer;

app.use(express.static('./public'))

app.set('view engine', 'ejs')
app.set('views', './views')

app.route('/')
.get(function(req, res) {
	res.render('layout')
})
var options = {
    debug: true
}

// create a http server instance to listen to request
var server = require('http').createServer(app);

// var srv = app.listen(process.env.PORT || '3000', function() {
// 	console.log('Listening on '+ (process.env.PORT = null ? process.env.PORT: '3000' ));
// })
app.use('/peerjs', ExpressPeerServer(server, options));
server.listen(8878);