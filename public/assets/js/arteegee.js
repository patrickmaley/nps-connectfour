(function() {

    if (!util.supports.data) {
        $('.no-support').show().next().hide()
        return
    }

    var peer = null
    var peerId = null
    var conn = null
    var opponent = {
        peerId: null
    }
    var turn = false
    var ended = false
    var grid = [
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ]

      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    function step1 () {
      // Get audio/video stream
      navigator.getUserMedia({audio: true, video: true}, function(stream){
        // Set your video displays
        $('#my-video').prop('src', URL.createObjectURL(stream));
        window.localStream = stream;
        step2();
      }, function(){ $('#step1-error').show(); });
    }
    function step2 () {
      $('#step1, #step3').hide();
      $('#step2').show();
    }
    function step3 (call) {
      // Hang up on an existing call if present
      if (window.existingCall) {
        window.existingCall.close();
      }
      // Wait for stream on the call, then set peer video display
      call.on('stream', function(stream){
        $('#their-video').prop('src', URL.createObjectURL(stream));
      });
      // UI stuff
      window.existingCall = call;
      $('#their-id').text(call.peer);
      call.on('close', step2);
      $('#step1, #step2').hide();
      $('#step3').show();
    }

    function begin() {
        conn.on('data', function(data) {
            switch (data[0]) {
                case 'move':
                    if (turn) {
                        return
                    }

                    var i = data[1]
                    if (grid[i].length == 6) {
                        return
                    }

                    grid[i].push(opponent.peerId)
                    $('#game .grid tr:eq(' + (6 - grid[i].length) + ') td:eq(' + i + ') .slot').addClass('filled-opponent')

                    $('#game .alert p').text('Your move!')
                    turn = true

                    process()

                    break
            }
        })
        conn.on('close', function() {
            if (!ended) {
                $('#game .alert p').text('Opponent forfeited!')
            }
            turn = false
        })
        peer.on('error', function(err) {
            console.log('' + err);
            turn = false
        })
    }

    function process() {
        var endedBy = null
        for (var i = 0; i < grid.length && !ended; i++) {
            for (var j = 0; j < 6; j++) {
                if (typeof grid[i][j] === 'undefined') {
                    continue
                }

                var match = true
                for (var k = 0; k < 4; k++) {
                    if (grid[i][j] !== grid[i][j + k]) {
                        match = false
                    }
                }
                if (match) {
                    endedBy = grid[i][j]
                    ended = true
                    for (var k = 0; k < 4; k++) {
                        $('#game .grid tr:eq(' + (6 - (j + k) - 1) + ') td:eq(' + i + ') .slot').addClass('highlight')
                    }
                    break
                }

                match = true
                for (var k = 0; k < 4; k++) {
                    if (i + k >= 7 || grid[i + k] && grid[i][j] !== grid[i + k][j]) {
                        match = false
                    }
                }
                if (match) {
                    endedBy = grid[i][j]
                    ended = true
                    for (var k = 0; k < 4; k++) {
                        $('#game .grid tr:eq(' + (6 - j - 1) + ') td:eq(' + (i + k) + ') .slot').addClass('highlight')
                    }
                    break
                }

                match = true
                for (var k = 0; k < 4; k++) {
                    if (i + k >= 7 || j + k >= 6 || grid[i][j] !== grid[i + k][j + k]) {
                        match = false
                    }
                }
                if (match) {
                    endedBy = grid[i][j]
                    ended = true
                    for (var k = 0; k < 4; k++) {
                        $('#game .grid tr:eq(' + (6 - (j + k) - 1) + ') td:eq(' + (i + k) + ') .slot').addClass('highlight')
                    }
                    break
                }

                match = true
                for (var k = 0; k < 4; k++) {
                    if (i - k < 0 || grid[i][j] !== grid[i - k][j + k]) {
                        match = false
                    }
                }
                if (match) {
                    endedBy = grid[i][j]
                    ended = true
                    for (var k = 0; k < 4; k++) {
                        $('#game .grid tr:eq(' + (6 - (j + k) - 1) + ') td:eq(' + (i - k) + ') .slot').addClass('highlight')
                    }
                    break
                }
            }
        }
        if (ended) {
            $('#game .grid').addClass('ended')
            if (endedBy == peerId) {
                $('#game .alert p').text('You won!')
            } else {
                $('#game .alert p').text('You lost!')
            }
            turn = false
        }

        var draw = true
        $.each(grid, function(i, c) {
            if (c.length < 6) {
                draw = false
            }
        })
        if (draw) {
            $('#game .alert p').text('Draw!')
            turn = false
        }
    }

    $('#game .grid tr td').on('click', function(event) {
        event.preventDefault()
        if (!turn) {
            return
        }

        var i = $(this).index()
        if (grid[i].length == 6) {
            return
        }

        grid[i].push(peerId)
        $('#game .grid tr:eq(' + (6 - grid[i].length) + ') td:eq(' + i + ') .slot').addClass('filled')

        $('#game .alert p').text("Waiting for opponent's move")
        turn = false

        conn.send(['move', i])

        process()
    })

    function initialize() {
        peer = new Peer({　host:'peerjs-server.herokuapp.com', secure:true, port:443, key: 'peerjs', debug: 3})
        peer.on('open', function(id) {
        	$('#my-id').text(peer.id);
            peerId = id;
            console.log('My peer ID is: ' + id);
        })
        peer.on('error', function(err) {
            console.log('' + err);
        })

	    peer.on('call', function(call){
	      // Answer the call automatically (instead of prompting user) for demo purposes
	      call.answer(window.localStream);
	      step3(call);
	    });
   

        // Heroku HTTP routing timeout rule (https://devcenter.heroku.com/articles/websockets#timeouts) workaround
        function ping() {
            console.log(peer)
            peer.socket.send({
                type: 'ping'
            })
            setTimeout(ping, 16000)
        }
        ping()
    }

    function start() {
        initialize()
        peer.on('open', function() {
            $('#game .alert p').text('Waiting for opponent').append($('<span class="pull-right"></span>').text('Peer ID: ' + peerId))
            $('#game').show().siblings('section').hide()
            alert('Ask your friend to join using your peer ID: ' + peerId)
        })
        peer.on('connection', function(c) {
            if (conn) {
                c.close()
                return
            }
            conn = c
            turn = true
            $('#game .alert p').text('Your move!')
            begin()
        })
        peer.on('call', function(call){
      // Answer the call automatically (instead of prompting user) for demo purposes
      call.answer(window.localStream);
      step3(call);
    });
    }

    function join() {
        initialize()
        var destId;
        peer.on('open', function() {
            destId = prompt("Opponent's peer ID:")
            conn = peer.connect(destId, {
                reliable: true
            })
            conn.on('open', function() {
                opponent.peerId = destId
                $('#game .alert p').text("Waiting for opponent's move")
                $('#game').show().siblings('section').hide()
                turn = false
                begin()
            })
            
        })


    }

    $('a[href="#start"]').on('click', function(event) {
        event.preventDefault()
        start()
    })
    $('a[href="#join"]').on('click', function(event) {
        event.preventDefault()
        join()
    })

    $('#game .grid td').on('mouseenter', function() {
        $('#game .grid tr td:nth-child(' + ($(this).index() + 1) + ')').addClass('hover')
    })
    $('#game .grid td').on('mouseleave', function() {
        $('#game .grid tr td:nth-child(' + ($(this).index() + 1) + ')').removeClass('hover')
    })

$(function(){
      $('#make-call').click(function(){
        // Initiate a call!
        var call = peer.call($('#callto-id').val(), window.localStream);
        step3(call);
      });
      $('#end-call').click(function(){
        window.existingCall.close();
        step2();
      });
      // Retry if getUserMedia fails
      $('#step1-retry').click(function(){
        $('#step1-error').hide();
        step1();
      });
      // Get things started
      step1();
    });
})()
