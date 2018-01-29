var express = require('express');
var app = express();

app.use('/', express.static(__dirname + '/'));
app.use('/', express.static(__dirname + '/bombermania-client/'));

var port = process.env.PORT || 3000;

app.get('/', function(req, res){
	res.sendFile(__dirname + '/bombermania-client/index.html');
});

var http = require('http');
var server = http.Server(app);
var io = require('socket.io')(server);

server.listen(port);

var SocketEventHandler = require('./SocketEventHandler');
var s_handler = new SocketEventHandler(io);

io.on('connection', function( client ){
	s_handler.onClientConnect( client );

	client.on("disconnect", s_handler.onClientDisconnect);
	client.on("room request", s_handler.onRoomRequest);
	client.on("chat message", s_handler.onChatMessage);
	client.on("player available", s_handler.onPlayerAvailable);
	client.on("player unavailable", s_handler.onPlayerUnavailable);
	client.on("player spawn", s_handler.onPlayerSpawn);
	client.on("player move", s_handler.onPlayerMove);
	client.on("player death", s_handler.onPlayerDeath);
	client.on("player collect powerup", s_handler.onPlayerCollectPowerup);
	client.on("player lost invincibility", s_handler.onPlayerLostInvicibility);
	client.on("player plant bomb", s_handler.onPlayerPlantBomb);
	client.on("bomb explode", s_handler.onBombExplode);
	client.on("powerup blink", s_handler.onPowerupBlink);
	client.on("powerup disappear", s_handler.onPowerupDisappear);
	client.on("map reset", s_handler.onMapReset);
    client.on("web login", sendHttpRequest);
});

sendHttpRequest = function(user_info) {
    console.log("web login", user_info.name);
    var querystring = require("querystring");
    var qs = querystring.stringify(user_info);
    var qslength = qs.length;
    var options = {
        hostname: "www.bomberworld.io",
        port: 80,
        path: "/forum/clientlogin.php",
        method: 'POST',
        headers:{
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': qslength
        }
    };
    
    var client = this;

    var buffer = "";
    var req = http.request(options, function(res) {
        res.on('data', function (chunk) {
           buffer+=chunk;
        });
        res.on('end', function() {
            console.log(buffer);
            var json = JSON.parse(buffer);
            if(json['status'] <= 3)
                client.emit('login result', buffer);
            else if(json['status'] == 5)
                client.emit('set result', buffer);
        });
    });

    req.write(qs);
    req.end();
}
//io.on('connection', require('./SocketEventHandler'));
